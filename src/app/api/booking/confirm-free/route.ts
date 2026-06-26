import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { sendServerFCMNotification, notifyN8nFromServer } from '@/lib/notifications/server';

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
                batch.update(gcRef, gcUpdate);
            }
        }

        // Marcar crédito como usado si aplica
        let creditResidualAmount = 0;
        let creditData: Record<string, any> | undefined;
        if (bd?.clientCreditId && bd?.clientCreditAmount > 0) {
            const creditRef = adminDb.collection('clientCredits').doc(bd.clientCreditId);
            const creditSnap = await creditRef.get();
            if (creditSnap.exists) {
                creditData = creditSnap.data()!;
                const originalAmount = creditData.amount as number;
                creditResidualAmount = originalAmount - bd.clientCreditAmount;
                batch.update(creditRef, {
                    status: 'used',
                    usedDate: new Date().toISOString().split('T')[0],
                    usedInAppointmentId: '', // se actualiza después del batch
                    updatedAt: now,
                });
            }
        }

        // Crear los appointments
        const appointmentIds: string[] = [];
        for (const slot of booking.slots as any[]) {
            const treatmentSummary = (slot.treatmentNames || []).join(' + ');
            const zones = (slot.zones || []).filter(Boolean).join(', ');

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

            const fullTreatment = treatmentSummary + (zones ? ` (${zones})` : '');
            const aptRef = adminDb.collection('appointments').doc();
            batch.set(aptRef, {
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
                notes: `Reserva online. Seña cubierta con gift card/crédito: $${booking.depositAmount}`,
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

            // Notifications are sent after batch commit (below)
        }

        const bookingRef = adminDb.collection('pendingBookings').doc(pendingBookingId);
        batch.update(bookingRef, {
            status: 'confirmed',
            confirmedAppointmentIds: appointmentIds,
            updatedAt: now,
        });

        await batch.commit();

        // Actualizar appointmentId en la redemption de gift card
        if (bd?.giftCardId && bd?.giftCardAmount > 0 && appointmentIds.length > 0) {
            const gcRef = adminDb.collection('giftCards').doc(bd.giftCardId);
            const gcSnap = await gcRef.get();
            if (gcSnap.exists) {
                const redemptions = gcSnap.data()!.redemptions || [];
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

        // Send notifications after commit (fire-and-forget)
        for (const slot of booking.slots as any[]) {
            const treatmentSummary = (slot.treatmentNames || []).join(' + ');
            const zones = (slot.zones || []).filter(Boolean).join(', ');
            const fullTreatment = treatmentSummary + (zones ? ` (${zones})` : '');
            const [y, m, d] = (slot.date || '').split('-');
            const dateDisplay = d && m && y ? `${d}-${m}-${y}` : slot.date;

            sendServerFCMNotification({
                clientId: booking.clientId,
                title: '¡Turno confirmado! 🎉',
                body: `Tu turno de ${treatmentSummary} para el ${dateDisplay} a las ${slot.time} está reservado.`,
            }).catch(err => console.error('[confirm-free] Error FCM:', err));

            const totalPaidForSlot = (booking.depositAmount || 0);
            notifyN8nFromServer({
                appointmentId: appointmentIds[0],
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
                notes: `Reserva online. Seña cubierta con gift card/crédito: $${booking.depositAmount}`,
                professionalId: slot.professionalId,
            }).catch(err => console.error('[confirm-free] Error n8n:', err));
        }

        return NextResponse.json({ confirmed: true, appointmentIds });
    } catch (err: any) {
        console.error('[booking/confirm-free] Error:', err);
        return NextResponse.json({ error: 'Error al confirmar la reserva' }, { status: 500 });
    }
}
