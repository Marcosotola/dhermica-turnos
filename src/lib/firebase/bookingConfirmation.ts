import { adminDb } from './admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { sendServerFCMNotification, notifyN8nFromServer } from '../notifications/server';

export interface ExtraPaymentLine {
    id: string;
    amount: number;
    method: string;
    label: string;
}

export interface ConfirmBookingParams {
    bookingRef: FirebaseFirestore.DocumentReference;
    booking: FirebaseFirestore.DocumentData;
    pendingBookingId: string;
    notes: string;
    /** Línea de pago adicional a la de gift card/crédito — ej. el pago de Mercado Pago. */
    extraPayment?: ExtraPaymentLine;
    mercadopagoPaymentId?: string;
}

/**
 * Descuenta gift card/crédito si aplica, crea los turnos y confirma el pendingBooking,
 * todo en un solo batch atómico. Comparte la lógica entre el webhook de pago (Mercado Pago)
 * y la confirmación gratis (saldo cubierto por completo con gift card/crédito) — antes estaba
 * duplicada casi línea por línea entre los dos archivos, lo que hizo que el mismo bug (clave
 * treatmentName vs name) apareciera en los dos a la vez y se arreglara solo en uno.
 *
 * El caller es responsable de reclamar el pendingBooking de forma atómica (transacción que
 * pone status: 'processing') antes de llamar a esta función, y de liberar ese estado si algo
 * falla antes de que termine.
 */
export async function confirmBookingAndCreateAppointments({
    bookingRef,
    booking,
    pendingBookingId,
    notes,
    extraPayment,
    mercadopagoPaymentId,
}: ConfirmBookingParams): Promise<string[]> {
    const bd = booking.depositBreakdown;
    const now = Timestamp.now();
    const today = new Date().toISOString().split('T')[0];
    const batch = adminDb.batch();

    // Descontar gift card si aplica
    if (bd?.giftCardId && bd?.giftCardAmount > 0) {
        const gcRef = adminDb.collection('giftCards').doc(bd.giftCardId);
        const gcSnap = await gcRef.get();
        if (gcSnap.exists) {
            const gcData = gcSnap.data()!;
            const newBalance = Math.max(0, (gcData.remainingBalance || 0) - bd.giftCardAmount);
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
                usedDate: today,
                usedInAppointmentId: '', // se actualiza después del batch
                updatedAt: now,
            });
        }
    }

    // Crear los turnos
    const appointmentIds: string[] = [];
    for (const slot of booking.slots as any[]) {
        const treatmentSummary = (slot.treatmentNames || []).join(' + ');
        const zones = (slot.zones || []).filter(Boolean).join(', ');
        const fullTreatment = treatmentSummary + (zones ? ` (${zones})` : '');

        const payments: any[] = [];
        if (extraPayment) payments.push({ ...extraPayment, date: today });
        if (bd?.giftCardAmount > 0) {
            payments.push({
                id: `gc_${bd.giftCardId}`,
                amount: bd.giftCardAmount,
                method: 'gift_card',
                date: today,
                label: 'Seña con Gift Card',
            });
        }
        if (bd?.clientCreditAmount > 0) {
            payments.push({
                id: `credit_${bd.clientCreditId}`,
                amount: bd.clientCreditAmount,
                method: 'credit',
                date: today,
                label: 'Seña con crédito',
            });
        }

        const aptRef = adminDb.collection('appointments').doc();
        batch.set(aptRef, {
            clientId: booking.clientId,
            clientName: booking.clientName,
            clientEmail: booking.clientEmail || '',
            clientPhone: booking.clientPhone || '',
            treatment: fullTreatment,
            treatments: slot.treatmentIds.map((id: string, i: number) => ({
                treatmentId: id,
                name: slot.treatmentNames[i],
                zone: slot.zones[i] || '',
                price: slot.estimatedPrice / slot.treatmentIds.length,
                duration: slot.durationMinutes / slot.treatmentIds.length,
            })),
            date: slot.date,
            time: slot.time,
            duration: slot.durationMinutes / 60,
            professionalId: slot.professionalId,
            price: slot.estimatedPrice,
            status: 'pending',
            notes,
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
    }

    batch.update(bookingRef, {
        status: 'confirmed',
        confirmedAppointmentIds: appointmentIds,
        updatedAt: now,
        ...(mercadopagoPaymentId ? { mercadopagoPaymentId } : {}),
    });

    await batch.commit();

    // Linkear el appointmentId a la redemption de gift card (no se puede saber el id antes del batch)
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

    // Linkear el crédito usado y crear el residual si el uso fue parcial
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

    // Notificaciones (fire-and-forget) — una por turno creado
    const totalPaidPerSlot = (extraPayment?.amount || 0) + (bd?.giftCardAmount || 0) + (bd?.clientCreditAmount || 0);
    (booking.slots as any[]).forEach((slot, i) => {
        const treatmentSummary = (slot.treatmentNames || []).join(' + ');
        const zones = (slot.zones || []).filter(Boolean).join(', ');
        const fullTreatment = treatmentSummary + (zones ? ` (${zones})` : '');
        const [y, m, d] = (slot.date || '').split('-');
        const dateDisplay = d && m && y ? `${d}-${m}-${y}` : slot.date;

        sendServerFCMNotification({
            clientId: booking.clientId,
            title: '¡Turno confirmado! 🎉',
            body: `Tu turno de ${treatmentSummary} para el ${dateDisplay} a las ${slot.time} está reservado.`,
        }).catch(err => console.error('[booking-confirmation] Error FCM:', err));

        notifyN8nFromServer({
            appointmentId: appointmentIds[i],
            clientName: booking.clientName,
            clientPhone: booking.clientPhone,
            clientEmail: booking.clientEmail,
            treatment: fullTreatment,
            treatments: slot.treatmentIds.map((id: string, j: number) => ({
                name: slot.treatmentNames[j] || '',
                zone: slot.zones[j] || null,
                price: slot.estimatedPrice / slot.treatmentIds.length,
                duration: slot.durationMinutes / slot.treatmentIds.length,
            })),
            date: slot.date,
            time: slot.time,
            duration: slot.durationMinutes / 60,
            price: slot.estimatedPrice,
            totalPaid: totalPaidPerSlot,
            notes,
            professionalId: slot.professionalId,
        }).catch(err => console.error('[booking-confirmation] Error n8n:', err));
    });

    return appointmentIds;
}
