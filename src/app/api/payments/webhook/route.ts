import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { createHmac } from 'crypto';
import { confirmBookingAndCreateAppointments } from '@/lib/firebase/bookingConfirmation';

const mp = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

function validateMPSignature(req: NextRequest, rawBody: string): boolean {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) return true;

    let parsed: any = {};
    try { parsed = JSON.parse(rawBody); } catch { return false; }

    // Las notificaciones de prueba del dashboard no tienen firma — las dejamos pasar
    if (parsed.live_mode === false) return true;

    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');
    if (!xSignature || !xRequestId) return false;

    const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')));
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    const dataId = parsed?.data?.id || '';
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest('hex');

    return expected === v1;
}

export async function GET() {
    return NextResponse.json({ status: 'ok' });
}

export async function POST(req: NextRequest) {
    let bookingRef: FirebaseFirestore.DocumentReference | null = null;
    let claimed = false;

    try {
        const rawBody = await req.text();
        const body = JSON.parse(rawBody);

        console.log('[webhook] Notificación recibida:', JSON.stringify(body));

        // Notificaciones de prueba desde el dashboard de MP — responder antes de validar firma
        if (body.live_mode === false || body.action === 'test') {
            console.log('[webhook] Notificación de prueba recibida correctamente');
            return NextResponse.json({ received: true, test: true });
        }

        if (!validateMPSignature(req, rawBody)) {
            console.warn('[webhook] Firma inválida — posible intento de fraude');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // MercadoPago envía notificaciones de tipo "payment"
        if (body.type !== 'payment') {
            return NextResponse.json({ received: true });
        }

        const paymentId = body.data?.id;
        if (!paymentId) {
            return NextResponse.json({ received: true });
        }

        // Verificar el pago con la API de MercadoPago
        const paymentClient = new Payment(mp);
        let paymentData;
        try {
            paymentData = await paymentClient.get({ id: paymentId });
        } catch (mpErr) {
            console.error('[webhook] Error al consultar pago en MP:', mpErr);
            return NextResponse.json({ received: true });
        }

        if (paymentData.status !== 'approved') {
            return NextResponse.json({ received: true });
        }

        const pendingBookingId = paymentData.external_reference;
        if (!pendingBookingId) {
            console.error('[webhook] Pago sin external_reference:', paymentId);
            return NextResponse.json({ received: true });
        }

        // Verificar y reclamar el pendingBooking de forma atómica para evitar que
        // notificaciones concurrentes de MercadoPago (el mismo pago llega más de una vez)
        // procesen el mismo pago en paralelo y dupliquen turnos y avisos de WhatsApp.
        const ref = adminDb.collection('pendingBookings').doc(pendingBookingId);
        bookingRef = ref;
        const booking = await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) return null;

            const data = snap.data()!;
            if (data.status === 'confirmed' || data.status === 'processing') return null;

            tx.update(ref, { status: 'processing', updatedAt: Timestamp.now() });
            return data;
        });
        claimed = !!booking;

        if (!booking) {
            // No encontrado, ya confirmado, o ya está siendo procesado por otra notificación
            return NextResponse.json({ received: true });
        }

        const bd = booking.depositBreakdown;
        const mpAmount = bd?.mercadopagoAmount ?? booking.depositAmount;

        const appointmentIds = await confirmBookingAndCreateAppointments({
            bookingRef: ref,
            booking,
            pendingBookingId,
            notes: `Reserva online. Seña pagada: $${booking.depositAmount}`,
            extraPayment: {
                id: `mp_${paymentId}`,
                amount: mpAmount,
                method: 'mercadopago',
                label: 'Seña online',
            },
            mercadopagoPaymentId: String(paymentId),
        });
        claimed = false;

        return NextResponse.json({ received: true, appointmentIds });
    } catch (err: any) {
        console.error('[payments/webhook] Error:', err);
        // Si ya habíamos reclamado la reserva (status: 'processing') y algo falló antes de
        // confirmar, la liberamos para que no quede trabada para siempre — de lo contrario
        // el próximo webhook de MP para este pago la ve en 'processing' y no hace nada.
        if (claimed && bookingRef) {
            await bookingRef.update({ status: 'pending_payment', updatedAt: Timestamp.now() }).catch(() => {});
        }
        // Devolver 200 para que MercadoPago no reintente
        return NextResponse.json({ received: true });
    }
}
