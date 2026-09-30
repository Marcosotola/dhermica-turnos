import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    writeBatch,
    Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { TreatmentCategoryDoc, getTreatmentCategories } from '../types/treatment';

const COLLECTION = 'treatment_categories';
const TREATMENTS_COLLECTION = 'treatments';

// Lanza error si falla la lectura (para no confundir "no se pudo leer" con "colección vacía")
export async function getTreatmentCategoryDocs(): Promise<TreatmentCategoryDoc[]> {
    const snap = await getDocs(query(collection(db, COLLECTION), orderBy('order', 'asc')));
    return snap.docs.map(d => ({
        id: d.id,
        name: d.data().name,
        order: d.data().order ?? 0,
    }));
}

// Primera vez: crea la colección con las predeterminadas + las que ya usan los tratamientos
export async function seedTreatmentCategories(treatments: { category?: string }[]): Promise<TreatmentCategoryDoc[]> {
    const names = getTreatmentCategories(treatments);
    const batch = writeBatch(db);
    const now = Timestamp.now();
    const created: TreatmentCategoryDoc[] = names.map((name, order) => {
        const ref = doc(collection(db, COLLECTION));
        batch.set(ref, { name, order, createdAt: now, updatedAt: now });
        return { id: ref.id, name, order };
    });
    await batch.commit();
    return created;
}

export async function createTreatmentCategory(name: string, order: number): Promise<string> {
    const now = Timestamp.now();
    const ref = await addDoc(collection(db, COLLECTION), { name, order, createdAt: now, updatedAt: now });
    return ref.id;
}

// Renombra la categoría y actualiza todos los tratamientos que la usan
export async function renameTreatmentCategory(id: string, oldName: string, newName: string): Promise<number> {
    const treatmentsSnap = await getDocs(
        query(collection(db, TREATMENTS_COLLECTION), where('category', '==', oldName))
    );
    const now = Timestamp.now();
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTION, id), { name: newName, updatedAt: now });
    treatmentsSnap.docs.forEach(d => batch.update(d.ref, { category: newName, updatedAt: now }));
    await batch.commit();
    return treatmentsSnap.size;
}

export async function updateTreatmentCategoryOrders(items: { id: string; order: number }[]): Promise<void> {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    items.forEach(({ id, order }) => batch.update(doc(db, COLLECTION, id), { order, updatedAt: now }));
    await batch.commit();
}

export async function deleteTreatmentCategory(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
}
