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
    deleteField,
} from 'firebase/firestore';
import { db } from './config';
import { Treatment } from '../types/treatment';
import treatmentContent from '../data/treatmentContent.json';

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
        // Explicitly delete the field when policy is removed; ignoreUndefinedProperties would just skip it otherwise
        cancellationPolicy: data.cancellationPolicy === undefined ? deleteField() : data.cancellationPolicy,
        updatedAt: Timestamp.now(),
    });
}

export async function deleteTreatment(id: string): Promise<void> {
    const docRef = doc(db, TREATMENTS_COLLECTION, id);
    await deleteDoc(docRef);
}

// Contenido sugerido para completar tratamientos (descripción, beneficios, contraindicaciones
// y cuidados). Solo se usan los campos que el tratamiento tiene vacíos, nunca pisa lo cargado.
const CONTENT_FIELDS = ['fullDescription', 'benefits', 'contraindications', 'preCare', 'postCare'] as const;
type ContentField = typeof CONTENT_FIELDS[number] | 'shortDescription';
type ContentUpdate = Partial<Pick<Treatment, ContentField>>;

const isEmptyValue = (v: unknown) => v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');

export function getPendingTreatmentContent(treatments: Treatment[]): { treatment: Treatment; update: ContentUpdate }[] {
    const content = treatmentContent.tratamientos as Record<string, Record<string, unknown>>;
    const fixes = treatmentContent.correcciones as Record<string, Record<string, string[]>>;

    return treatments.flatMap(treatment => {
        const update: Record<string, unknown> = {};
        const suggested = content[treatment.id] || {};
        CONTENT_FIELDS.forEach(field => {
            if (suggested[field] && isEmptyValue(treatment[field])) update[field] = suggested[field];
        });
        Object.entries(fixes[treatment.id] || {}).forEach(([field, [from, to]]) => {
            const text = update[field] ?? treatment[field as ContentField];
            if (typeof text === 'string' && text.startsWith(from)) update[field] = to + text.slice(from.length);
        });
        return Object.keys(update).length > 0 ? [{ treatment, update: update as ContentUpdate }] : [];
    });
}

export async function applyPendingTreatmentContent(treatments: Treatment[]): Promise<number> {
    const pending = getPendingTreatmentContent(treatments);
    const now = Timestamp.now();
    await Promise.all(pending.map(({ treatment, update }) =>
        updateDoc(doc(db, TREATMENTS_COLLECTION, treatment.id), { ...update, updatedAt: now })
    ));
    return pending.length;
}
