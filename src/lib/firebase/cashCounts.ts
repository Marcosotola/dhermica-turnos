import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    getDocs,
    Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { CashCount } from '../types/cashCount';

const COLLECTION = 'cash_counts';

function cleanNumberMap(raw: any): Record<string, number> {
    const result: Record<string, number> = {};
    if (raw && typeof raw === 'object') {
        Object.entries(raw).forEach(([key, value]) => {
            const n = Number(value);
            if (Number.isFinite(n)) result[key] = n;
        });
    }
    return result;
}

function mapCashCount(id: string, data: any): CashCount {
    return {
        id,
        date: data.date,
        balances: cleanNumberMap(data.balances),
        counted: data.counted ? cleanNumberMap(data.counted) : undefined,
        expected: data.expected ? cleanNumberMap(data.expected) : undefined,
        note: data.note,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        createdBy: data.createdBy,
    };
}

export async function createCashCount(
    data: Omit<CashCount, 'id' | 'createdAt'>
): Promise<string> {
    const payload: Record<string, unknown> = {
        date: data.date,
        balances: data.balances,
        createdAt: Timestamp.now(),
    };
    if (data.counted && Object.keys(data.counted).length > 0) payload.counted = data.counted;
    if (data.expected && Object.keys(data.expected).length > 0) payload.expected = data.expected;
    if (data.note) payload.note = data.note;
    if (data.createdBy !== undefined) payload.createdBy = data.createdBy;

    const ref = await addDoc(collection(db, COLLECTION), payload);
    return ref.id;
}

export async function deleteCashCount(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
}

// Todos los arqueos, del más viejo al más nuevo (a igual fecha, en el orden en que se cargaron).
export async function getAllCashCounts(): Promise<CashCount[]> {
    const snap = await getDocs(query(collection(db, COLLECTION), orderBy('date', 'asc')));
    return snap.docs
        .map(d => mapCashCount(d.id, d.data()))
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.getTime() - b.createdAt.getTime());
}
