import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp,
    doc,
    getDoc,
    deleteDoc,
    updateDoc
} from 'firebase/firestore';
import { db } from './config';
import { Sale } from '../types/sale';

const SALES_COLLECTION = 'sales';

/**
 * Registra una nueva venta de producto
 */
export async function createSale(data: Omit<Sale, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, SALES_COLLECTION), {
        ...data,
        createdAt: Timestamp.now(),
    });
    return docRef.id;
}

/**
 * Actualiza una venta existente
 */
export async function updateSale(id: string, data: Partial<Omit<Sale, 'id' | 'createdAt'>>): Promise<void> {
    const docRef = doc(db, SALES_COLLECTION, id);
    await updateDoc(docRef, { ...data });
}

/**
 * Elimina una venta
 */
export async function deleteSale(id: string): Promise<void> {
    await deleteDoc(doc(db, SALES_COLLECTION, id));
}

/**
 * Obtiene ventas en un rango de fechas
 */
export async function getSalesByDateRange(startDate: string, endDate: string): Promise<Sale[]> {
    const q = query(
        collection(db, SALES_COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate()
    })) as Sale[];
}

/**
 * Obtiene ventas de un profesional específico
 */
export async function getSalesByProfessional(professionalId: string, startDate?: string, endDate?: string): Promise<Sale[]> {
    let q = query(
        collection(db, SALES_COLLECTION),
        where('soldById', '==', professionalId),
        orderBy('date', 'desc')
    );

    if (startDate && endDate) {
        q = query(q, where('date', '>=', startDate), where('date', '<=', endDate));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate()
    })) as Sale[];
}
