import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { createHmac } from 'crypto';
import { sendServerFCMNotification, notifyN8nFromServer } from '@/lib/notifications/server';

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

        // Descontar gift card y crédito si aplica (pago mixto)
        const bd = booking.depositBreakdown;
        const now = Timestamp.now();

        if (bd?.giftCardId && bd?.giftCardAmount > 0) {
            const gcRef = adminDb.collection('giftCards').doc(bd.giftCardId);
            const gcSnap = await gcRef.get();
            if (gcSnap.exists) {
                const gcData = gcSnap.data()!;
                const newBalance = Math.max(0, (gcData.remainingBalance || 0) - bd.giftCardAmount);
                const today = new Date().toISOString().split('T')[0];
                const gcUpdate: Record<string, any> = {
                    remainingBalance: newBalance,
                    status: newBalance <= 0 ? 'redeemed' : 'partially_used',
                    updatedAt: now,
                    redemptions: FieldValue.arrayUnion({
                        appointmentId: '',
                        amount: bd.giftCardAmount,
                        date: today,
                        recipientClientId: booking.clientId,
                        recipientName: booking.clientName,
                    }),
                };
                if (!gcData.recipientClientId && booking.clientId) {
                    gcUpdate.recipientClientId = booking.clientId;
                    gcUpdate.recipientName = booking.clientName;
                }
                await gcRef.update(gcUpdate);
            }
        }

        let creditResidualAmount = 0;
        let creditData: Record<string, any> | undefined;
        if (bd?.clientCreditId && bd?.clientCreditAmount > 0) {
            const creditRef = adminDb.collection('clientCredits').doc(bd.clientCreditId);
            const creditSnap = await creditRef.get();
            if (creditSnap.exists) {
                creditData = creditSnap.data()!;
                creditResidualAmount = (creditData.amount as number) - bd.clientCreditAmount;
                await creditRef.update({
                    status: 'used',
                    usedDate: new Date().toISOString().split('T')[0],
                    usedInAppointmentId: '',
                    updatedAt: now,
                });
            }
        }

        // Crear los appointments en Firestore
        const appointmentIds: string[] = [];
        const mpAmount = bd?.mercadopagoAmount ?? booking.depositAmount;
        const giftCardAmount = bd?.giftCardAmount || 0;
        const creditAmount = bd?.clientCreditAmount || 0;
        const today = new Date().toISOString().split('T')[0];

        for (const slot of booking.slots as any[]) {
            const treatmentSummary = (slot.treatmentNames || []).join(' + ');
            const zones = (slot.zones || []).filter(Boolean).join(', ');
            const fullTreatment = treatmentSummary + (zones ? ` (${zones})` : '');

            const payments: any[] = [
                {
                    id: `mp_${paymentId}`,
                    amount: mpAmount,
                    method: 'mercadopago',
                    date: today,
                    label: 'Seña online',
                },
            ];
            if (giftCardAmount > 0) {
                payments.push({
                    id: `gc_${bd.giftCardId}`,
                    amount: giftCardAmount,
                    method: 'gift_card',
                    date: today,
                    label: 'Seña con Gift Card',
                });
            }
            if (creditAmount > 0) {
                payments.push({
                    id: `credit_${bd.clientCreditId}`,
                    amount: creditAmount,
                    method: 'credit',
                    date: today,
                    label: 'Seña con crédito',
                });
            }

            const aptRef = await adminDb.collection('appointments').add({
                clientId: booking.clientId,
                clientName: booking.clientName,
                clientEmail: booking.clientEmail || '',
                clientPhone: booking.clientPhone || '',
                treatment: fullTreatment,
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
                payments,
                source: 'online_booking',
                pendingBookingId,
                notified48h: false,
                notified24h: false,
                notified1h: false,
                createdAt: now,
                updatedAt: now,
            });

            appointmentIds.push(aptRef.id);

            const [y, m, d] = (slot.date || '').split('-');
            const dateDisplay = d && m && y ? `${d}-${m}-${y}` : slot.date;

            // FCM push notification
            sendServerFCMNotification({
                clientId: booking.clientId,
                title: '¡Turno confirmado! 🎉',
                body: `Tu turno de ${treatmentSummary} para el ${dateDisplay} a las ${slot.time} está reservado.`,
            }).catch(err => console.error('[webhook] Error FCM:', err));

            // WhatsApp via n8n
            const totalPaidForSlot = payments.reduce((s: number, p: any) => s + p.amount, 0);
            notifyN8nFromServer({
                appointmentId: aptRef.id,
                clientName: booking.clientName,
                clientPhone: booking.clientPhone,
                clientEmail: booking.clientEmail,
                treatment: fullTreatment,
                treatments: slot.treatmentIds.map((id: string, i: number) => ({
                    name: slot.treatmentNames[i] || '',
                    zone: slot.zones[i] || null,
                    price: slot.estimatedPrice / slot.treatmentIds.length,
                    duration: slot.durationMinutes / slot.treatmentIds.length / 60,
                })),
                date: slot.date,
                time: slot.time,
                duration: slot.durationMinutes / 60,
                price: slot.estimatedPrice,
                totalPaid: totalPaidForSlot,
                notes: `Reserva online. Seña pagada: $${booking.depositAmount}`,
                professionalId: slot.professionalId,
            }).catch(err => console.error('[webhook] Error n8n:', err));
        }

        // Actualizar appointmentId en la redemption de gift card
        if (bd?.giftCardId && bd?.giftCardAmount > 0 && appointmentIds.length > 0) {
            const gcRef = adminDb.collection('giftCards').doc(bd.giftCardId);
            const gcSnap2 = await gcRef.get();
            if (gcSnap2.exists) {
                const redemptions = gcSnap2.data()!.redemptions || [];
                const lastIdx = redemptions.length - 1;
                if (lastIdx >= 0 && !redemptions[lastIdx].appointmentId) {
                    redemptions[lastIdx].appointmentId = appointmentIds[0];
                    await gcRef.update({ redemptions });
                }
            }
        }

        // Actualizar usedInAppointmentId del crédito y crear residual si corresponde
        if (bd?.clientCreditId && bd?.clientCreditAmount > 0 && appointmentIds.length > 0) {
            const creditRef = adminDb.collection('clientCredits').doc(bd.clientCreditId);
            await creditRef.update({ usedInAppointmentId: appointmentIds[0] });

            if (creditResidualAmount > 0 && creditData) {
                await adminDb.collection('clientCredits').add({
                    clientId: creditData.clientId,
                    clientName: creditData.clientName,
                    amount: creditResidualAmount,
                    reason: creditData.reason,
                    status: 'available',
                    sourceAppointmentId: creditData.sourceAppointmentId || '',
                    sourceAppointmentDate: creditData.sourceAppointmentDate || '',
                    sourceTreatmentName: creditData.sourceTreatmentName || '',
                    notes: 'Saldo residual de uso parcial de crédito',
                    createdAt: now,
                    updatedAt: now,
                });
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
