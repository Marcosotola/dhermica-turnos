import { collection, limit, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './config';
import { authFetch } from './auth';
import { SocialPost } from '../types/socialPost';
import { SocialImages } from '../social/images';

const COLLECTION = 'socialPosts';

const toDate = (value: unknown) => (value instanceof Timestamp ? value.toDate() : undefined);

/** Escucha en vivo las últimas publicaciones (n8n les va actualizando el estado). */
export function subscribeSocialPosts(
    onChange: (posts: SocialPost[]) => void,
    onError?: (error: Error) => void,
    max = 30
): () => void {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(max));
    return onSnapshot(
        q,
        snap => {
            onChange(snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    createdAt: toDate(data.createdAt),
                    publishedAt: toDate(data.publishedAt),
                } as SocialPost;
            }));
        },
        error => onError?.(error)
    );
}

/** Manda la publicación al servidor de la app, que guarda las imágenes y se la pasa a n8n. */
export async function createSocialPost(
    user: User,
    data: { text: string; treatmentId?: string; images: SocialImages }
): Promise<{ id: string; status: string }> {
    const form = new FormData();
    form.append('text', data.text);
    if (data.treatmentId) form.append('treatmentId', data.treatmentId);
    form.append('feed', data.images.feed, 'publicacion.jpg');
    form.append('story', data.images.story, 'historia.jpg');

    const res = await authFetch(user, '/api/redes', { method: 'POST', body: form });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'No se pudo guardar la publicación');
    return body;
}
