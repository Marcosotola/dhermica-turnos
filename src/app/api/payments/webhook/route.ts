import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

const mp = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

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
