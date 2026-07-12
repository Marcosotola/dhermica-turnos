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

/**
 * Normaliza una fecha a formato YYYY-MM-DD
 */
function normalizeDate(d: any): string {
    if (!d || typeof d !== 'string') return '';
    // DD/MM/YYYY -> YYYY-MM-DD
    if (d.includes('/')) {
        const parts = d.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            if (day.length <= 2 && month.length <= 2 && year.length === 4) {
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }
    }
    // DD-MM-YYYY -> YYYY-MM-DD
    if (d.includes('-')) {
        const parts = d.split('-');
        if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
             const [day, month, year] = parts;
             return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }
    return d;
}

function mapDoc(d: any): Egreso {
    const data = d.data();
    return {
        id: d.id,
        ...data,
        date: normalizeDate(data.date || data.fecha || ''),
        payments: data.payments || [],
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
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
    const allEgresosMap = new Map<string, Egreso>();
    
    try {
        const promises: Promise<void>[] = [];

        // 1. Query by 'date'
        const qDate = query(
            collection(db, EGRESOS_COLLECTION),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
        );
        promises.push(getDocs(qDate).then(snap => {
            snap.docs.forEach(d => {
                const egreso = mapDoc(d);
                allEgresosMap.set(egreso.id, egreso);
            });
        }));

        // 2. Query by 'fecha'
        const qFecha = query(
            collection(db, EGRESOS_COLLECTION),
            where('fecha', '>=', startDate),
            where('fecha', '<=', endDate)
        );
        promises.push(getDocs(qFecha).then(snap => {
            snap.docs.forEach(d => {
                const egreso = mapDoc(d);
                if (!allEgresosMap.has(egreso.id)) {
                    allEgresosMap.set(egreso.id, egreso);
                }
            });
        }));

        await Promise.all(promises);

        // 3. Fallback para formatos DD/MM/YYYY y DD-MM-YYYY si es un solo día
        if (startDate === endDate) {
            const [y, m, d] = startDate.split('-');
            const mPadded = m.padStart(2, '0');
            const dPadded = d.padStart(2, '0');
            const mInt = parseInt(m).toString();
            const dInt = parseInt(d).toString();

            const yShort = y.slice(-2);
            const variations = [
                `${dPadded}/${mPadded}/${y}`,
                `${dPadded}-${mPadded}-${y}`,
                `${dInt}/${mInt}/${y}`,
                `${dInt}-${mInt}-${y}`,
                `${y}-${mInt}-${dInt}`,
                `${dPadded}/${mPadded}/${yShort}`,
                `${dInt}/${mInt}/${yShort}`
            ];

            const fallbackPromises: Promise<void>[] = [];

            const addFallbackQuery = (fieldName: string, value: string) => {
                fallbackPromises.push(getDocs(query(collection(db, EGRESOS_COLLECTION), where(fieldName, '==', value))).then(snap => {
                    snap.docs.forEach(docSnap => {
                        const egreso = mapDoc(docSnap);
                        if (!allEgresosMap.has(egreso.id)) {
                            allEgresosMap.set(egreso.id, egreso);
                        }
                    });
                }).catch(() => {}));
            };

            variations.forEach(val => {
                addFallbackQuery('date', val);
                addFallbackQuery('fecha', val);
            });

            await Promise.all(fallbackPromises);
        }
        
        return Array.from(allEgresosMap.values()).sort((a, b) => 
            b.date.localeCompare(a.date)
        );

    } catch (error) {
        console.error('Error obteniendo egresos por rango:', error);
        return [];
    }
}
