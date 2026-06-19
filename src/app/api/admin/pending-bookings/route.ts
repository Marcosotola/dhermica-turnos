import { NextResponse } from 'next/server';
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
