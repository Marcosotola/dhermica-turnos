import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    getDocs,
} from 'firebase/firestore';
import { db } from './config';
import { Rental } from '../types/rental';

const RENTALS_COLLECTION = 'rentals';

/**
 * Crea un nuevo alquiler
 */
export async function createRental(
    data: Omit<Rental, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, RENTALS_COLLECTION), {
        ...data,
        createdAt: now,
        updatedAt: now,
    });
    return docRef.id;
}

/**
 * Actualiza un alquiler
 */
export async function updateRental(
    id: string,
    data: Partial<Omit<Rental, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    const docRef = doc(db, RENTALS_COLLECTION, id);
    await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
    });
}

/**
 * Elimina un alquiler
 */
export async function deleteRental(id: string): Promise<void> {
    const docRef = doc(db, RENTALS_COLLECTION, id);
    await deleteDoc(docRef);
}

/**
 * Obtiene alquileres en un rango de fechas
 */
export async function getRentalsByDateRange(startDate: string, endDate: string): Promise<Rental[]> {
    const q = query(
        collection(db, RENTALS_COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Rental;
    });
}

/**
 * Obtiene todos los alquileres ordenados por fecha descendente
 */
export async function getRentals(): Promise<Rental[]> {
    const q = query(
        collection(db, RENTALS_COLLECTION),
        orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Rental;
    });
}

/**
 * Suscribe a los cambios en la colección de alquileres
 */
export function subscribeToRentals(callback: (rentals: Rental[]) => void): () => void {
    const q = query(
        collection(db, RENTALS_COLLECTION),
        orderBy('date', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const rentals = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            } as Rental;
        });
        callback(rentals);
    });
}
