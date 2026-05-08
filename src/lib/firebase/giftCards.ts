import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    Timestamp,
    orderBy,
} from 'firebase/firestore';
import { db } from './config';
import { GiftCard, GiftCardStatus } from '../types/giftCard';

const COLLECTION = 'giftCards';

function mapGiftCard(id: string, data: any): GiftCard {
    return {
        id,
        code: data.code || '',
        amount: data.amount || 0,
        purchaseMethod: data.purchaseMethod,
        bankAccount: data.bankAccount ?? null,
        clientId: data.clientId,
        clientName: data.clientName,
        purchasedByName: data.purchasedByName,
        status: data.status || 'active',
        expiryDate: data.expiryDate,
        redeemedInAppointmentId: data.redeemedInAppointmentId,
        redeemedDate: data.redeemedDate,
        notes: data.notes,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        createdBy: data.createdBy,
    };
}

export function generateGiftCardCode(): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
    return `GC-${yy}${mm}${dd}-${rand}`;
}

export async function createGiftCard(
    data: Omit<GiftCard, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();
    const payload: Record<string, unknown> = { createdAt: now, updatedAt: now };
    for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) payload[k] = v;
    }
    const ref = await addDoc(collection(db, COLLECTION), payload);
    return ref.id;
}

export async function getGiftCardsByClient(
    clientId: string,
    clientName?: string
): Promise<GiftCard[]> {
    const map = new Map<string, GiftCard>();

    if (clientId && !clientId.startsWith('legacy-')) {
        const q = query(collection(db, COLLECTION), where('clientId', '==', clientId));
        const snap = await getDocs(q);
        snap.docs.forEach(d => map.set(d.id, mapGiftCard(d.id, d.data())));
    }

    if (clientName) {
        const q = query(collection(db, COLLECTION), where('clientName', '==', clientName));
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
            if (!map.has(d.id)) map.set(d.id, mapGiftCard(d.id, d.data()));
        });
    }

    return Array.from(map.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
}

export async function getGiftCardsByDateRange(
    startDate: string,
    endDate: string
): Promise<GiftCard[]> {
    const startTs = Timestamp.fromDate(new Date(startDate + 'T00:00:00'));
    const endTs = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));
    const q = query(
        collection(db, COLLECTION),
        where('createdAt', '>=', startTs),
        where('createdAt', '<=', endTs),
        orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => mapGiftCard(d.id, d.data()));
}

export async function updateGiftCardStatus(
    giftCardId: string,
    status: GiftCardStatus,
    extra?: { redeemedInAppointmentId?: string; redeemedDate?: string }
): Promise<void> {
    await updateDoc(doc(db, COLLECTION, giftCardId), {
        status,
        ...extra,
        updatedAt: Timestamp.now(),
    });
}

export async function updateGiftCard(
    giftCardId: string,
    data: Partial<Pick<GiftCard, 'amount' | 'purchaseMethod' | 'bankAccount' | 'expiryDate' | 'notes' | 'purchasedByName'>>
): Promise<void> {
    const payload: Record<string, unknown> = { updatedAt: Timestamp.now() };
    for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) payload[k] = v;
    }
    await updateDoc(doc(db, COLLECTION, giftCardId), payload);
}

export async function deleteGiftCard(giftCardId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, giftCardId));
}
