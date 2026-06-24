import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

const mp = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

export async function POST(req: NextRequest) {
    try {
        const { pendingBookingId, payerEmail } = await req.json();

        if (!pendingBookingId) {
            return NextResponse.json({ error: 'pendingBookingId requerido' }, { status: 400 });
        }

        // Obtener el pendingBooking
        const snap = await adminDb.collection('pendingBookings').doc(pendingBookingId).get();
        if (!snap.exists) {
            return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
        }

        const booking = snap.data()!;

        if (booking.status !== 'pending_payment') {
            return NextResponse.json({ error: 'Esta reserva ya fue procesada' }, { status: 400 });
        }

        // Construir descripción de los tratamientos
        const treatmentNames = booking.slots
            .flatMap((s: any) => s.treatmentNames as string[])
            .join(', ');

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dhermica.vercel.app';

        // Crear preferencia en MercadoPago
        const preference = new Preference(mp);
        const result = await preference.create({
            body: {
                items: [
                    {
                        id: pendingBookingId,
                        title: `Seña - ${treatmentNames}`,
                        description: `Reserva de turno en Dhermica Estética`,
                        quantity: 1,
                        unit_price: booking.depositBreakdown?.mercadopagoAmount ?? booking.depositAmount,
                        currency_id: 'ARS',
                    },
                ],
                payer: {
                    name: booking.clientName,
                    email: payerEmail || booking.clientEmail || undefined,
                },
                back_urls: {
                    success: `${baseUrl}/reservar/pago/${pendingBookingId}/confirmado`,
                    failure: `${baseUrl}/reservar/pago/${pendingBookingId}/error`,
                    pending: `${baseUrl}/reservar/pago/${pendingBookingId}/pendiente`,
                },
                auto_return: 'approved',
                external_reference: pendingBookingId,
                statement_descriptor: 'DHERMICA',
                expires: true,
                expiration_date_from: new Date().toISOString(),
                expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
            },
        });

        // Guardar el preferenceId en el pendingBooking
        await adminDb.collection('pendingBookings').doc(pendingBookingId).update({
            mercadopagoPreferenceId: result.id,
            updatedAt: Timestamp.now(),
        });

        return NextResponse.json({
            preferenceId: result.id,
            initPoint: result.init_point,
        });
    } catch (err: any) {
        console.error('[payments/create] Error:', err);
        return NextResponse.json({ error: 'Error al crear el pago' }, { status: 500 });
    }
}
