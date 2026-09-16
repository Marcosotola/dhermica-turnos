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
import { AparatoSession } from '../types/aparato';

const APARATOS_COLLECTION = 'aparato_sessions';

function mapDoc(d: any): AparatoSession {
    const data = d.data();
    return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
    } as AparatoSession;
}

/**
 * Crea una nueva sesión de aparato
 */
export async function createAparatoSession(
    data: Omit<AparatoSession, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, APARATOS_COLLECTION), {
        ...data,
        createdAt: now,
        updatedAt: now,
    });
    return docRef.id;
}

/**
 * Actualiza una sesión de aparato
 */
export async function updateAparatoSession(
    id: string,
    data: Partial<Omit<AparatoSession, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    await updateDoc(doc(db, APARATOS_COLLECTION, id), {
        ...data,
        updatedAt: Timestamp.now(),
    });
}

/**
 * Elimina una sesión de aparato
 */
export async function deleteAparatoSession(id: string): Promise<void> {
    await deleteDoc(doc(db, APARATOS_COLLECTION, id));
}

/**
 * Obtiene todas las sesiones ordenadas por fecha descendente
 */
export async function getAllAparatoSessions(): Promise<AparatoSession[]> {
    const q = query(collection(db, APARATOS_COLLECTION), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(mapDoc);
}

/**
 * Obtiene sesiones en un rango de fechas (para finanzas)
 */
export async function getAparatoSessionsByDateRange(
    startDate: string,
    endDate: string
): Promise<AparatoSession[]> {
    const q = query(
        collection(db, APARATOS_COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapDoc);
}

/**
 * Obtiene sesiones de un profesional específico, opcionalmente filtradas por rango de fechas
 */
export async function getAparatoSessionsByProfessional(
    professionalId: string,
    startDate?: string,
    endDate?: string
): Promise<AparatoSession[]> {
    let q = query(
        collection(db, APARATOS_COLLECTION),
        where('professionalId', '==', professionalId),
        orderBy('date', 'desc')
    );

    if (startDate && endDate) {
        q = query(
            collection(db, APARATOS_COLLECTION),
            where('professionalId', '==', professionalId),
            where('date', '>=', startDate),
            where('date', '<=', endDate),
            orderBy('date', 'desc')
        );
    }

    const snap = await getDocs(q);
    return snap.docs.map(mapDoc);
}
