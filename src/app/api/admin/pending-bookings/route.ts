import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET() {
    try {
        const snap = await adminDb
            .collection('pendingBookings')
            .orderBy('createdAt', 'desc')
            .limit(200)
            .get();

        const bookings = snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                clientName: data.clientName || '',
                clientEmail: data.clientEmail || '',
                clientPhone: data.clientPhone || '',
                slots: data.slots || [],
                status: data.status || 'pending_payment',
                depositAmount: data.depositAmount || 0,
                depositBreakdown: data.depositBreakdown || null,
                confirmedAppointmentIds: data.confirmedAppointmentIds || [],
                chatHistory: data.chatHistory || [],
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
                expiresAt: data.expiresAt?.toDate?.()?.toISOString() || null,
            };
        });

        return NextResponse.json({ bookings });
    } catch (err: any) {
        console.error('[admin/pending-bookings]', err);
        return NextResponse.json({ error: 'Error al obtener reservas' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();
        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        const docRef = adminDb.collection('pendingBookings').doc(id);
        const snap = await docRef.get();

        if (!snap.exists) {
            return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
        }

        await docRef.delete();

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/pending-bookings] DELETE error:', err);
        return NextResponse.json({ error: 'Error al eliminar reserva' }, { status: 500 });
    }
}
