import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getAuthenticatedUser } from '@/lib/firebase/serverAuth';
import { confirmBookingAndCreateAppointments } from '@/lib/firebase/bookingConfirmation';

export async function POST(req: NextRequest) {
    let bookingRef: FirebaseFirestore.DocumentReference | null = null;
    let claimed = false;

    try {
        const authed = await getAuthenticatedUser(req);
        if (!authed) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { pendingBookingId } = await req.json();

        const ref = adminDb.collection('pendingBookings').doc(pendingBookingId);
        bookingRef = ref;

        // Verificar y reclamar el pendingBooking de forma atómica — evita que un doble click
        // o un reintento de red confirmen la misma reserva gratis dos veces y descuenten
        // la gift card/crédito por duplicado (ver bug análogo ya resuelto en payments/webhook).
        const booking = await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) return null;

            const data = snap.data()!;
            if (data.status === 'processing') return null;
            if (data.status === 'confirmed') return { ...data, __alreadyConfirmed: true };

            tx.update(ref, { status: 'processing', updatedAt: Timestamp.now() });
            return data;
        });
        claimed = !!booking && !(booking as any).__alreadyConfirmed;

        if (!booking) {
            return NextResponse.json({ error: 'Reserva no encontrada o en proceso, intentá de nuevo en unos segundos' }, { status: 409 });
        }

        if (booking.clientId !== authed.uid) {
            if (claimed) {
                claimed = false;
                await ref.update({ status: 'pending_payment', updatedAt: Timestamp.now() });
            }
            return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
        }

        if ((booking as any).__alreadyConfirmed) return NextResponse.json({ confirmed: true, alreadyDone: true });

        if ((booking.depositBreakdown?.mercadopagoAmount ?? 1) > 0) {
            // Liberar el estado 'processing' ya que no vamos a confirmar por este camino
            claimed = false;
            await ref.update({ status: 'pending_payment', updatedAt: Timestamp.now() });
            return NextResponse.json({ error: 'Esta reserva requiere pago por MercadoPago' }, { status: 400 });
        }

        const appointmentIds = await confirmBookingAndCreateAppointments({
            bookingRef: ref,
            booking,
            pendingBookingId,
            notes: `Reserva online. Seña cubierta con gift card/crédito: $${booking.depositAmount}`,
        });
        claimed = false;

        return NextResponse.json({ confirmed: true, appointmentIds });
    } catch (err: any) {
        console.error('[booking/confirm-free] Error:', err);
        // Si ya habíamos reclamado la reserva (status: 'processing') y algo falló antes de
        // confirmar, la liberamos para que no quede trabada para siempre.
        if (claimed && bookingRef) {
            await bookingRef.update({ status: 'pending_payment', updatedAt: Timestamp.now() }).catch(() => {});
        }
        return NextResponse.json({ error: 'Error al confirmar la reserva' }, { status: 500 });
    }
}
