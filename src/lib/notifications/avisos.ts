/**
 * Envío al n8n nuevo de avisos por WhatsApp (solo server-side).
 *
 * Convive con el flujo viejo (NEXT_PUBLIC_N8N_WEBHOOK_URL) hasta el lanzamiento: si
 * N8N_AVISOS_URL no está configurada, no hace nada. La clave va en un header que n8n
 * verifica, y como estas variables no son NEXT_PUBLIC_, nunca llegan al navegador.
 */
import { timingSafeEqual } from 'crypto';

export const AVISOS_SECRET_HEADER = 'x-dhermica-clave';

/** El pedido trae la misma clave que usa la app para hablar con n8n (pedidos de n8n a la app). */
export function hasValidAvisosSecret(req: Request): boolean {
    const expected = process.env.N8N_AVISOS_SECRET;
    const received = req.headers.get(AVISOS_SECRET_HEADER);
    if (!expected || !received) return false;
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

export async function sendToN8nAvisos(payload: Record<string, unknown>): Promise<void> {
    const url = process.env.N8N_AVISOS_URL;
    const secret = process.env.N8N_AVISOS_SECRET;
    if (!url || !secret) return;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', [AVISOS_SECRET_HEADER]: secret },
            body: JSON.stringify(payload),
        });
        if (!res.ok) console.error(`[avisos] n8n respondió ${res.status} para ${payload.event}`);
    } catch (error) {
        console.error('[avisos] Error al notificar a n8n (no bloqueante):', error);
    }
}
