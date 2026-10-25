import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import '@/lib/firebase/admin';

const TYPES = ['publicacion', 'historia'];

/**
 * Entrega una imagen de /redes desde el mismo dominio de la app, para que el celular pueda
 * compartirla (estado de WhatsApp) o descargarla: Firebase Storage no deja bajarla con fetch
 * desde el navegador. Son imágenes que se publican en las redes, así que no piden sesión.
 */
export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id') ?? '';
    const type = req.nextUrl.searchParams.get('tipo') ?? '';
    if (!/^[A-Za-z0-9]{20}$/.test(id) || !TYPES.includes(type)) {
        return NextResponse.json({ error: 'Imagen inválida' }, { status: 400 });
    }

    const bucket = getStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const file = bucket.file(`social-posts/${id}/${type}.jpg`);
    const [exists] = await file.exists();
    if (!exists) {
        return NextResponse.json({ error: 'No existe' }, { status: 404 });
    }
    const [buffer] = await file.download();

    const headers: Record<string, string> = {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=86400',
    };
    if (req.nextUrl.searchParams.get('descargar') === '1') {
        headers['Content-Disposition'] = `attachment; filename="dhermica-${type}.jpg"`;
    }
    return new NextResponse(new Uint8Array(buffer), { headers });
}
