import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    getDoc,
    Timestamp,
    orderBy,
    arrayUnion,
    runTransaction,
} from 'firebase/firestore';
import { db } from './config';
import { GiftCard, GiftCardRedemption, GiftCardStatus } from '../types/giftCard';

const COLLECTION = 'giftCards';

function mapGiftCard(id: string, data: any): GiftCard {
    // Backward compat: datos legacy usan `amount` sin `originalAmount`/`remainingBalance`
    const originalAmount = data.originalAmount ?? data.amount ?? 0;
    const remainingBalance = data.remainingBalance ?? originalAmount;

    return {
        id,
        code: data.code || '',
        originalAmount,
        remainingBalance,
        purchaserClientId: data.purchaserClientId ?? data.clientId ?? undefined,
        purchaserName: data.purchaserName ?? data.purchasedByName ?? data.clientName ?? '',
        recipientName: data.recipientName,
        recipientClientId: data.recipientClientId,
        message: data.message,
        purchaseMethod: data.purchaseMethod,
        bankAccount: data.bankAccount ?? null,
        status: data.status || 'active',
        expiryDate: data.expiryDate,
        redemptions: data.redemptions ?? [],
        notes: data.notes,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        createdBy: data.createdBy,
    };
}

export function generateGiftCardCode(): string {
    // Alfabeto sin caracteres ambiguos (O/0, I/1, L)
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

export function defaultExpiryDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
}

export async function createGiftCard(
    data: Omit<GiftCard, 'id' | 'createdAt' | 'updatedAt' | 'redemptions'>
): Promise<string> {
    const now = Timestamp.now();
    const payload: Record<string, unknown> = {
        createdAt: now,
        updatedAt: now,
        redemptions: [],
    };
    for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) payload[k] = v;
    }
    const ref = await addDoc(collection(db, COLLECTION), payload);
    return ref.id;
}

export async function getGiftCardByCode(code: string): Promise<GiftCard | null> {
    const q = query(collection(db, COLLECTION), where('code', '==', code.toUpperCase().trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return mapGiftCard(d.id, d.data());
}

export async function getGiftCardById(id: string): Promise<GiftCard | null> {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return null;
    return mapGiftCard(snap.id, snap.data());
}

export async function getGiftCardsByPurchaser(
    purchaserClientId: string,
    purchaserName?: string
): Promise<GiftCard[]> {
    const map = new Map<string, GiftCard>();

    if (purchaserClientId && !purchaserClientId.startsWith('legacy-')) {
        const q = query(collection(db, COLLECTION), where('purchaserClientId', '==', purchaserClientId));
        const snap = await getDocs(q);
        snap.docs.forEach(d => map.set(d.id, mapGiftCard(d.id, d.data())));

        // Legacy: datos guardados con clientId
        const qLegacy = query(collection(db, COLLECTION), where('clientId', '==', purchaserClientId));
        const snapLegacy = await getDocs(qLegacy);
        snapLegacy.docs.forEach(d => {
            if (!map.has(d.id)) map.set(d.id, mapGiftCard(d.id, d.data()));
        });
    }

    if (purchaserName) {
        const q = query(collection(db, COLLECTION), where('purchaserName', '==', purchaserName));
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
            if (!map.has(d.id)) map.set(d.id, mapGiftCard(d.id, d.data()));
        });

        // Legacy: purchasedByName y clientName
        for (const field of ['purchasedByName', 'clientName']) {
            const qf = query(collection(db, COLLECTION), where(field, '==', purchaserName));
            const snapf = await getDocs(qf);
            snapf.docs.forEach(d => {
                if (!map.has(d.id)) map.set(d.id, mapGiftCard(d.id, d.data()));
            });
        }
    }

    return Array.from(map.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
}

// Busca gift cards donde el cliente es el receptor (para mostrar saldo disponible en su ficha)
export async function getGiftCardsByRecipient(
    recipientClientId: string
): Promise<GiftCard[]> {
    const q = query(
        collection(db, COLLECTION),
        where('recipientClientId', '==', recipientClientId)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map(d => mapGiftCard(d.id, d.data()))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getAllGiftCards(): Promise<GiftCard[]> {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => mapGiftCard(d.id, d.data()));
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

// Redención parcial o total. Descuenta el monto del saldo, agrega al historial.
export async function redeemGiftCard(
    giftCardId: string,
    amountUsed: number,
    appointmentId: string,
    date: string,
    recipientClientId?: string,
    recipientName?: string,
    redeemedBy?: string
): Promise<void> {
    const cardRef = doc(db, COLLECTION, giftCardId);

    // Transaccional: leer el saldo y descontarlo tienen que pasar juntos — si dos
    // redenciones llegaran casi al mismo tiempo (doble click, reintento), una lectura
    // suelta podía pisar el descuento de la otra y sobre-redimir la gift card.
    await runTransaction(db, async (tx) => {
        const snap = await tx.get(cardRef);
        if (!snap.exists()) throw new Error('Gift card no encontrada');
        const card = mapGiftCard(snap.id, snap.data());

        const newBalance = Math.max(0, card.remainingBalance - amountUsed);
        const newStatus: GiftCardStatus = newBalance <= 0 ? 'redeemed' : 'partially_used';

        const redemption: GiftCardRedemption = {
            appointmentId,
            amount: amountUsed,
            date,
            ...(redeemedBy ? { redeemedBy } : {}),
            ...(recipientClientId ? { recipientClientId } : {}),
            ...(recipientName ? { recipientName } : {}),
        };

        const update: Record<string, unknown> = {
            remainingBalance: newBalance,
            status: newStatus,
            updatedAt: Timestamp.now(),
            redemptions: arrayUnion(redemption),
        };

        // Si el receptor no estaba linkeado, lo linkeamos al primer uso
        if (recipientClientId && !card.recipientClientId) {
            update.recipientClientId = recipientClientId;
        }
        if (recipientName && !card.recipientName) {
            update.recipientName = recipientName;
        }

        tx.update(cardRef, update);
    });
}

export async function updateGiftCardStatus(
    giftCardId: string,
    status: GiftCardStatus,
    extra?: { redeemedDate?: string; redeemedInAppointmentId?: string }
): Promise<void> {
    await updateDoc(doc(db, COLLECTION, giftCardId), {
        status,
        ...extra,
        updatedAt: Timestamp.now(),
    });
}

export async function updateGiftCard(
    giftCardId: string,
    data: Partial<Pick<
        GiftCard,
        'originalAmount' | 'remainingBalance' | 'purchaseMethod' | 'bankAccount' |
        'expiryDate' | 'notes' | 'purchaserName' | 'purchaserClientId' |
        'recipientName' | 'message'
    >>
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
