import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    try {
        const { pendingBookingId, clientId } = await req.json();

        const snap = await adminDb.collection('pendingBookings').doc(pendingBookingId).get();
        if (!snap.exists) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });

        const booking = snap.data()!;

        if (booking.clientId !== clientId) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

        if ((booking.depositBreakdown?.mercadopagoAmount ?? 1) > 0) {
            return NextResponse.json({ error: 'Esta reserva requiere pago por MercadoPago' }, { status: 400 });
        }

        if (booking.status === 'confirmed') return NextResponse.json({ confirmed: true, alreadyDone: true });

        const bd = booking.depositBreakdown;
        const now = Timestamp.now();
        const batch = adminDb.batch();

        // Descontar gift card si aplica
        if (bd?.giftCardId && bd?.giftCardAmount > 0) {
            const gcRef = adminDb.collection('giftCards').doc(bd.giftCardId);
            const gcSnap = await gcRef.get();
            if (gcSnap.exists) {
                const newBalance = (gcSnap.data()!.remainingBalance || 0) - bd.giftCardAmount;
                batch.update(gcRef, {
                    remainingBalance: Math.max(0, newBalance),
                    status: newBalance <= 0 ? 'used' : 'partially_used',
                    updatedAt: now,
                });
            }
        }

        // Marcar crédito como usado si aplica
        if (bd?.clientCreditId && bd?.clientCreditAmount > 0) {
            const creditRef = adminDb.collection('clientCredits').doc(bd.clientCreditId);
            batch.update(creditRef, { status: 'used', usedAt: now, updatedAt: now });
        }

        // Crear los appointments
        const appointmentIds: string[] = [];
        for (const slot of booking.slots as any[]) {
            const treatmentSummary = slot.treatmentNames.join(' + ');
            const zones = slot.zones.join(', ');

            const payments: any[] = [];
            if (bd?.giftCardAmount > 0) {
                payments.push({
                    id: `gc_${bd.giftCardId}`,
                    amount: bd.giftCardAmount,
                    method: 'gift_card',
                    date: new Date().toISOString().split('T')[0],
                    label: 'Seña con Gift Card',
                });
            }
            if (bd?.clientCreditAmount > 0) {
                payments.push({
                    id: `credit_${bd.clientCreditId}`,
                    amount: bd.clientCreditAmount,
                    method: 'credit',
                    date: new Date().toISOString().split('T')[0],
                    label: 'Seña con crédito',
                });
            }

            const aptRef = adminDb.collection('appointments').doc();
            batch.set(aptRef, {
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
                notes: `Reserva online. Seña cubierta con gift card/crédito: $${booking.depositAmount}`,
                payments,
                source: 'online_booking',
                pendingBookingId,
                createdAt: now,
                updatedAt: now,
            });
            appointmentIds.push(aptRef.id);
        }

        const bookingRef = adminDb.collection('pendingBookings').doc(pendingBookingId);
        batch.update(bookingRef, {
            status: 'confirmed',
            confirmedAppointmentIds: appointmentIds,
            updatedAt: now,
        });

        await batch.commit();

        return NextResponse.json({ confirmed: true, appointmentIds });
    } catch (err: any) {
        console.error('[booking/confirm-free] Error:', err);
        return NextResponse.json({ error: 'Error al confirmar la reserva' }, { status: 500 });
    }
}
