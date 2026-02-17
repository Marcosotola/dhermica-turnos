import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    query,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Treatment } from '../types/treatment';

const TREATMENTS_COLLECTION = 'treatments';

export async function getTreatments(): Promise<Treatment[]> {
    try {
        const q = query(collection(db, TREATMENTS_COLLECTION), orderBy('category'), orderBy('name'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
        } as Treatment));
    } catch (error) {
        console.error('Error fetching treatments:', error);
        return [];
    }
}

export async function getTreatmentById(id: string): Promise<Treatment | null> {
    try {
        const docRef = doc(db, TREATMENTS_COLLECTION, id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return {
                id: snap.id,
                ...snap.data(),
                createdAt: snap.data().createdAt?.toDate(),
                updatedAt: snap.data().updatedAt?.toDate(),
            } as Treatment;
        }
        return null;
    } catch (error) {
        console.error('Error fetching treatment:', error);
        return null;
    }
}

export async function createTreatment(data: Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, TREATMENTS_COLLECTION), {
        ...data,
        createdAt: now,
        updatedAt: now,
    });
    return docRef.id;
}

export async function updateTreatment(id: string, data: Partial<Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const docRef = doc(db, TREATMENTS_COLLECTION, id);
    await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
    });
}

export async function deleteTreatment(id: string): Promise<void> {
    const docRef = doc(db, TREATMENTS_COLLECTION, id);
    await deleteDoc(docRef);
}
