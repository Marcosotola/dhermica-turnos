import { adminDb } from './admin';
import { FieldValue } from 'firebase-admin/firestore';
import { PendingBooking, PendingBookingStatus } from '../types/pendingBooking';

const COLLECTION = 'pendingBookings';
const EXPIRY_MINUTES = 30;

function mapBooking(id: string, data: FirebaseFirestore.DocumentData): PendingBooking {
    return {
        id,
        clientId: data.clientId || '',
        clientName: data.clientName || '',
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        slots: data.slots || [],
        totalDurationMinutes: data.totalDurationMinutes || 0,
        totalEstimatedPrice: data.totalEstimatedPrice || 0,
        depositAmount: data.depositAmount || 0,
        depositBreakdown: data.depositBreakdown || { mercadopagoAmount: 0 },
        status: data.status || 'pending_payment',
        mercadopagoPreferenceId: data.mercadopagoPreferenceId,
        mercadopagoPaymentId: data.mercadopagoPaymentId,
        mercadopagoExternalReference: data.mercadopagoExternalReference,
        confirmedAppointmentIds: data.confirmedAppointmentIds,
        expiresAt: data.expiresAt?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
}

export async function createPendingBookingAdmin(
    data: Omit<PendingBooking, 'id' | 'status' | 'expiresAt' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = FieldValue.serverTimestamp();
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

    const ref = await adminDb.collection(COLLECTION).add({
        ...data,
        status: 'pending_payment',
        expiresAt,
        createdAt: now,
        updatedAt: now,
    });

    await ref.update({ mercadopagoExternalReference: ref.id });
    return ref.id;
}

export async function getPendingBookingByIdAdmin(id: string): Promise<PendingBooking | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    return mapBooking(snap.id, snap.data()!);
}

export async function updatePendingBookingStatusAdmin(
    id: string,
    status: PendingBookingStatus,
    extra?: { mercadopagoPaymentId?: string; confirmedAppointmentIds?: string[] }
): Promise<void> {
    await adminDb.collection(COLLECTION).doc(id).update({
        status,
        ...extra,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function attachMercadoPagoPreferenceAdmin(
    id: string,
    preferenceId: string
): Promise<void> {
    await adminDb.collection(COLLECTION).doc(id).update({
        mercadopagoPreferenceId: preferenceId,
        updatedAt: FieldValue.serverTimestamp(),
    });
}
