import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Professional } from '../types/professional';

const PROFESSIONALS_COLLECTION = 'professionals';

/**
 * Crea un nuevo profesional
 */
export async function createProfessional(
    data: Omit<Professional, 'id' | 'createdAt'>
): Promise<string> {
    const docRef = await addDoc(collection(db, PROFESSIONALS_COLLECTION), {
        ...data,
        createdAt: Timestamp.now(),
    });
    return docRef.id;
}

/**
 * Actualiza un profesional
 */
export async function updateProfessional(
    id: string,
    data: Partial<Omit<Professional, 'id' | 'createdAt'>>
): Promise<void> {
    const docRef = doc(db, PROFESSIONALS_COLLECTION, id);
    await updateDoc(docRef, data);
}

/**
 * Activa/desactiva un profesional
 */
export async function toggleProfessionalStatus(id: string, active: boolean): Promise<void> {
    const docRef = doc(db, PROFESSIONALS_COLLECTION, id);
    await updateDoc(docRef, { active });
}

/**
 * Elimina un profesional
 */
export async function deleteProfessional(id: string): Promise<void> {
    const docRef = doc(db, PROFESSIONALS_COLLECTION, id);
    await deleteDoc(docRef);
}

/**
 * Obtiene todos los profesionales ordenados por order
 */
export async function getProfessionals(): Promise<Professional[]> {
    const q = query(
        collection(db, PROFESSIONALS_COLLECTION),
        orderBy('order', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as Professional;
    });
}

/**
 * Obtiene solo los profesionales activos
 */
export async function getActiveProfessionals(): Promise<Professional[]> {
    const q = query(
        collection(db, PROFESSIONALS_COLLECTION),
        where('active', '==', true),
        orderBy('order', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as Professional;
    });
}

/**
 * Obtiene un profesional por su userId
 */
export async function getProfessionalByUserId(
    userId: string
): Promise<Professional | null> {
    const q = query(
        collection(db, PROFESSIONALS_COLLECTION),
        where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
    } as Professional;
}

/**
 * Asegura que exista una entrada de profesional para el usuario
 * Si ya existe, no hace nada. Si no existe, la crea con valores por defecto.
 */
export async function ensureProfessionalEntry(
    userId: string,
    userName: string
): Promise<void> {
    // Verificar si ya existe
    const existing = await getProfessionalByUserId(userId);
    if (existing) {
        console.log(`[ensureProfessionalEntry] Profesional ya existe para userId: ${userId}`);
        return; // Ya existe, no hacer nada
    }

    // Obtener el orden máximo actual
    const allProfs = await getProfessionals();
    const maxOrder = allProfs.length > 0
        ? Math.max(...allProfs.map((p) => p.order))
        : 0;

    // Crear entrada con valores por defecto
    console.log(`[ensureProfessionalEntry] Creando profesional para userId: ${userId}`);
    await createProfessional({
        userId,
        name: userName,
        color: '#34baab', // Color por defecto
        order: maxOrder + 1,
        active: true,
        // legacyCollectionName se omite (no se puede pasar undefined a Firebase)
    });
}
