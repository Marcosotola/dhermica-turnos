import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { adminDb } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/firebase/serverAuth';
import { AVISOS_SECRET_HEADER } from '@/lib/notifications/avisos';

const COLLECTION = 'socialPosts';
const ROLES = ['admin', 'secretary', 'professional'];
const MAX_TEXT = 300;
// Vercel corta los pedidos de más de 4,5 MB: las dos imágenes juntas tienen que entrar
const MAX_IMAGE_BYTES = 2_000_000;
const N8N_TIMEOUT_MS = 10_000;

async function saveImage(postId: string, name: string, file: File): Promise<string> {
    const bucket = getStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const path = `social-posts/${postId}/${name}.jpg`;
    const token = randomUUID();
    await bucket.file(path).save(Buffer.from(await file.arrayBuffer()), {
        contentType: 'image/jpeg',
        metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });
    // Link público con token (Instagram y Facebook bajan la imagen desde acá)
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function isJpeg(value: FormDataEntryValue | null): value is File {
    return value instanceof File && value.type === 'image/jpeg' && value.size > 0 && value.size <= MAX_IMAGE_BYTES;
}

/**
 * Recibe una publicación cargada desde /redes (foto ya armada en el navegador en formato
 * publicación e historia + un texto corto), la guarda y se la pasa a n8n, que escribe el
 * texto con IA y publica en Instagram y Facebook. n8n después completa el estado en Firestore.
 */
export async function POST(req: NextRequest) {
    const authed = await requireRole(req, ROLES);
    if (!authed) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    let form: FormData;
    try {
        form = await req.formData();
    } catch {
        return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
    }

    const text = String(form.get('text') ?? '').trim().slice(0, MAX_TEXT);
    const treatmentId = String(form.get('treatmentId') ?? '').trim();
    const feed = form.get('feed');
    const story = form.get('story');
    if (!text) {
        return NextResponse.json({ error: 'Falta el texto' }, { status: 400 });
    }
    if (!isJpeg(feed) || !isJpeg(story)) {
        return NextResponse.json({ error: 'Las imágenes no son válidas o son muy pesadas' }, { status: 400 });
    }

    const [userSnap, treatmentSnap] = await Promise.all([
        adminDb.collection('users').doc(authed.uid).get(),
        treatmentId ? adminDb.collection('treatments').doc(treatmentId).get() : Promise.resolve(null),
    ]);
    const treatment = treatmentSnap?.exists ? treatmentSnap.data() : null;

    const ref = adminDb.collection(COLLECTION).doc();
    const [feedImageUrl, storyImageUrl] = await Promise.all([
        saveImage(ref.id, 'publicacion', feed),
        saveImage(ref.id, 'historia', story),
    ]);

    const n8nUrl = process.env.N8N_REDES_URL;
    const secret = process.env.N8N_AVISOS_SECRET;

    const post = {
        text,
        treatmentId: treatment ? treatmentId : null,
        treatmentName: treatment?.name ?? null,
        feedImageUrl,
        storyImageUrl,
        status: n8nUrl && secret ? 'publishing' : 'pending',
        createdBy: {
            uid: authed.uid,
            name: userSnap.data()?.fullName || '',
            role: authed.role || '',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(post);

    // Sin n8n configurado queda guardada como "pendiente" (igual se puede compartir al estado)
    if (!n8nUrl || !secret) {
        return NextResponse.json({ id: ref.id, status: 'pending' });
    }

    try {
        const res = await fetch(n8nUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', [AVISOS_SECRET_HEADER]: secret },
            body: JSON.stringify({
                postId: ref.id,
                text,
                feedImageUrl,
                storyImageUrl,
                treatment: treatment
                    ? {
                        id: treatmentId,
                        name: treatment.name ?? '',
                        category: treatment.category ?? '',
                        shortDescription: treatment.shortDescription ?? '',
                    }
                    : null,
                author: post.createdBy,
            }),
            signal: AbortSignal.timeout(N8N_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`n8n respondió ${res.status}`);
    } catch (error) {
        console.error('[redes] No se pudo pasar la publicación a n8n:', error);
        await ref.update({ status: 'failed', error: 'No se pudo conectar con el publicador automático' });
        return NextResponse.json({ id: ref.id, status: 'failed' });
    }

    return NextResponse.json({ id: ref.id, status: 'publishing' });
}
