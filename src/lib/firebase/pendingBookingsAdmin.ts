import { adminDb } from './admin';
import { FieldValue } from 'firebase-admin/firestore';
import { PendingBooking } from '../types/pendingBooking';

const COLLECTION = 'pendingBookings';
const EXPIRY_MINUTES = 30;

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
