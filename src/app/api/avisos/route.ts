import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthenticatedUser } from '@/lib/firebase/serverAuth';
import { sendToN8nAvisos } from '@/lib/notifications/avisos';

// Roles que gestionan la agenda: sus avisos se reenvían tal cual
const STAFF_ROLES = ['admin', 'secretary', 'professional'];
const EVENTS = ['appointment_created', 'appointment_cancelled', 'appointment_deleted'];

/**
 * Recibe los avisos de turnos que dispara el navegador (crear, cancelar, eliminar) y los
 * reenvía al n8n nuevo con la clave secreta. Un cliente solo puede avisar la cancelación
 * de un turno suyo, y el nombre, teléfono y profesional se toman de Firestore: así nadie puede usar esta
 * ruta para mandar WhatsApp a otros números.
 */
export async function POST(req: NextRequest) {
    const authed = await getAuthenticatedUser(req);
    if (!authed) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Sin n8n nuevo configurado no hay nada que hacer (el flujo viejo se avisa desde el navegador)
    if (!process.env.N8N_AVISOS_URL || !process.env.N8N_AVISOS_SECRET) {
        return NextResponse.json({ skipped: true });
    }

    let payload: Record<string, any>;
    try {
        payload = await req.json();
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
    if (!EVENTS.includes(payload?.event) || typeof payload.appointmentId !== 'string' || !payload.appointmentId) {
        return NextResponse.json({ error: 'Aviso inválido' }, { status: 400 });
    }

    const userSnap = await adminDb.collection('users').doc(authed.uid).get();
    const role = userSnap.exists ? (userSnap.data()?.role as string | undefined) : undefined;

    if (!role || !STAFF_ROLES.includes(role)) {
        if (payload.event !== 'appointment_cancelled') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
        const aptSnap = await adminDb.collection('appointments').doc(payload.appointmentId).get();
        const apt = aptSnap.data();
        if (!apt || apt.clientId !== authed.uid) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
        payload.client = {
            ...payload.client,
            name: apt.clientName || '',
            phone: apt.clientPhone || null,
            email: apt.clientEmail || null,
        };
        payload.professional = {
            ...payload.professional,
            id: apt.professionalId || null,
        };
    }

    await sendToN8nAvisos(payload);
    return NextResponse.json({ ok: true });
}
