import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminDb } from '@/lib/firebase/admin';
import { hasValidAvisosSecret } from '@/lib/notifications/avisos';
import type { SocialPostStatus, SocialTarget, SocialTargetResult } from '@/lib/types/socialPost';

const TARGETS: SocialTarget[] = ['instagramPost', 'instagramStory', 'facebookPost', 'facebookStory'];

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function parseResult(r: any): SocialTargetResult {
    const url = str(r?.url, 500);
    const error = str(r?.error, 500);
    return {
        ok: r?.ok === true,
        ...(url.startsWith('https://') ? { url } : {}),
        ...(error ? { error } : {}),
    };
}

/**
 * n8n avisa cómo salió una publicación de /redes: el texto que escribió la IA y el resultado
 * en cada red. Solo acepta pedidos con la clave de la app. El estado general se calcula acá.
 */
export async function POST(req: NextRequest) {
    if (!hasValidAvisosSecret(req)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const postId = str(body?.postId, 40);
    if (!/^[A-Za-z0-9]{20}$/.test(postId)) {
        return NextResponse.json({ error: 'Publicación inválida' }, { status: 400 });
    }
    const ref = adminDb.collection('socialPosts').doc(postId);
    if (!(await ref.get()).exists) {
        return NextResponse.json({ error: 'No existe la publicación' }, { status: 404 });
    }

    const results: Partial<Record<SocialTarget, SocialTargetResult>> = {};
    for (const target of TARGETS) {
        if (body?.results?.[target]) results[target] = parseResult(body.results[target]);
    }
    const done = Object.values(results);
    const okCount = done.filter(r => r.ok).length;
    const status: SocialPostStatus =
        okCount === 0 ? 'failed' : okCount === TARGETS.length ? 'published' : 'partial';

    const error = str(body?.error, 500);
    await ref.update({
        status,
        results,
        caption: str(body?.caption, 2200),
        error: error || admin.firestore.FieldValue.delete(),
        ...(okCount > 0 ? { publishedAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
    });

    return NextResponse.json({ ok: true, status });
}
