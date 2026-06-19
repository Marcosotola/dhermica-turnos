import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { createHmac } from 'crypto';

const mp = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

function validateMPSignature(req: NextRequest, rawBody: string): boolean {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) return true; // si no hay secret configurado, no bloqueamos

    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');
    if (!xSignature || !xRequestId) return false;

    // Extraer ts y v1 del header x-signature
    const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')));
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    // Parsear el id del body para armar el mensaje
    let dataId = '';
    try {
        dataId = JSON.parse(rawBody)?.data?.id || '';
    } catch { return false; }

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest('hex');

    return expected === v1;
}

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const body = JSON.parse(rawBody);

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
        const paymentData = await paymentClient.get({ id: paymentId });

        if (paymentData.status !== 'approved') {
            return NextResponse.json({ received: true });
        }

        const pendingBookingId = paymentData.external_reference;
        if (!pendingBookingId) {
            console.error('[webhook] Pago sin external_reference:', paymentId);
            return NextResponse.json({ received: true });
        }

        // Verificar que el pendingBooking existe y está pendiente
        const bookingRef = adminDb.collection('pendingBookings').doc(pendingBookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            console.error('[webhook] PendingBooking no encontrado:', pendingBookingId);
            return NextResponse.json({ received: true });
        }

        const booking = bookingSnap.data()!;

        if (booking.status === 'confirmed') {
            // Pago duplicado, ya procesado
            return NextResponse.json({ received: true });
        }

        // Crear los appointments en Firestore
        const appointmentIds: string[] = [];
        const now = Timestamp.now();

        for (const slot of booking.slots as any[]) {
            const treatmentSummary = slot.treatmentNames.join(' + ');
            const zones = slot.zones.join(', ');

            const aptRef = await adminDb.collection('appointments').add({
                clientId: booking.clientId,
                clientName: booking.clientName,
                clientEmail: booking.clientEmail || '',
                clientPhone: booking.clientPhone || '',
                treatment: treatmentSummary + (zones ? ` (${zones})` : ''),
                treatments: slot.treatmentIds.map((id: string, i: number) => ({
                    treatmentId: id,
                    treatmentName: slot.treatmentNames[i],
                    zone: slot.zones[i] || '',
                    price: slot.estimatedPrice / slot.treatmentIds.length,
                    duration: slot.durationMinutes / slot.treatmentIds.length / 60,
                })),
                date: slot.date,
                time: slot.time,
                duration: slot.durationMinutes / 60,
                professionalId: slot.professionalId,
                price: slot.estimatedPrice,
                status: 'pending',
                notes: `Reserva online. Seña pagada: $${booking.depositAmount}`,
                payments: [
                    {
                        id: `mp_${paymentId}`,
                        amount: booking.depositAmount,
                        method: 'mercadopago',
                        date: new Date().toISOString().split('T')[0],
                        label: 'Seña online',
                    },
                ],
                source: 'online_booking',
                pendingBookingId,
                createdAt: now,
                updatedAt: now,
            });

            appointmentIds.push(aptRef.id);

            // Notificar al cliente (si tiene FCM tokens)
            try {
                const userSnap = await adminDb.collection('users').doc(booking.clientId).get();
                const tokens: string[] = userSnap.data()?.fcmTokens || [];
                if (tokens.length > 0) {
                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
                    await adminDb.collection('notifications').add({
                        tokens,
                        title: '¡Turno confirmado! 🎉',
                        body: `Tu turno de ${treatmentSummary} para el ${slot.date} a las ${slot.time} está reservado.`,
                        url: `${baseUrl}/mis-turnos`,
                        createdAt: now,
                    });
                }
            } catch (notifErr) {
                console.error('[webhook] Error enviando notificación:', notifErr);
            }
        }

        // Marcar el pendingBooking como confirmado
        await bookingRef.update({
            status: 'confirmed',
            mercadopagoPaymentId: String(paymentId),
            confirmedAppointmentIds: appointmentIds,
            updatedAt: now,
        });

        return NextResponse.json({ received: true, appointmentIds });
    } catch (err: any) {
        console.error('[payments/webhook] Error:', err);
        // Devolver 200 para que MercadoPago no reintente
        return NextResponse.json({ received: true });
    }
}
