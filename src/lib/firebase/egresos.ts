import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    getDocs,
    Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Egreso } from '../types/egreso';

const EGRESOS_COLLECTION = 'egresos';

function mapDoc(d: any): Egreso {
    const data = d.data();
    return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Egreso;
}

export async function createEgreso(
    data: Omit<Egreso, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, EGRESOS_COLLECTION), {
        ...data,
        createdAt: now,
        updatedAt: now,
    });
    return docRef.id;
}

export async function updateEgreso(
    id: string,
    data: Partial<Omit<Egreso, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    await updateDoc(doc(db, EGRESOS_COLLECTION, id), {
        ...data,
        updatedAt: Timestamp.now(),
    });
}

export async function deleteEgreso(id: string): Promise<void> {
    await deleteDoc(doc(db, EGRESOS_COLLECTION, id));
}

export async function getAllEgresos(): Promise<Egreso[]> {
    const q = query(collection(db, EGRESOS_COLLECTION), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(mapDoc);
}

export async function getEgresosByDateRange(
    startDate: string,
    endDate: string
): Promise<Egreso[]> {
    const q = query(
        collection(db, EGRESOS_COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapDoc);
}
