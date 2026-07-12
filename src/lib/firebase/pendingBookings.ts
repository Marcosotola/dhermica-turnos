import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    query,
    where,
    getDocs,
    Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { PendingBooking, PendingBookingStatus, BookingSlot, DepositBreakdown } from '../types/pendingBooking';

const COLLECTION = 'pendingBookings';
const EXPIRY_MINUTES = 30;

function mapBooking(id: string, data: any): PendingBooking {
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

export async function createPendingBooking(
    data: Omit<PendingBooking, 'id' | 'status' | 'expiresAt' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(Date.now() + EXPIRY_MINUTES * 60 * 1000);

    const ref = await addDoc(collection(db, COLLECTION), {
        ...data,
        status: 'pending_payment',
        expiresAt,
        createdAt: now,
        updatedAt: now,
    });

    await updateDoc(ref, { mercadopagoExternalReference: ref.id });
    return ref.id;
}

export async function getPendingBookingById(id: string): Promise<PendingBooking | null> {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return null;
    return mapBooking(snap.id, snap.data());
}

export async function updatePendingBookingStatus(
    id: string,
    status: PendingBookingStatus,
    extra?: {
        mercadopagoPaymentId?: string;
        confirmedAppointmentIds?: string[];
    }
): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), {
        status,
        ...extra,
        updatedAt: Timestamp.now(),
    });
}

export async function attachMercadoPagoPreference(
    id: string,
    preferenceId: string
): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), {
        mercadopagoPreferenceId: preferenceId,
        updatedAt: Timestamp.now(),
    });
}

// Marca como expirados los pending bookings que superaron su expiresAt (para usar en cron)
export async function expireStaleBookings(): Promise<number> {
    const now = Timestamp.now();
    const q = query(
        collection(db, COLLECTION),
        where('status', '==', 'pending_payment'),
        where('expiresAt', '<', now)
    );
    const snap = await getDocs(q);
    await Promise.all(
        snap.docs.map(d =>
            updateDoc(d.ref, { status: 'expired', updatedAt: Timestamp.now() })
        )
    );
    return snap.size;
}
