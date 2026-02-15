import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    onSnapshot,
    Timestamp,
    getDocs,
    getDoc,
    setDoc,
    orderBy,
} from 'firebase/firestore';
import { db } from './config';
import { Professional } from '../types/professional';
import { Appointment } from '../types/appointment';
import { getActiveProfessionals } from './professionals';

const APPOINTMENTS_COLLECTION = 'appointments';

/**
 * Mapea datos de Firebase (pueden ser legacy en español) al tipo Appointment
 */
function mapLegacyAppointment(docId: string, data: any, professionalId?: string): Appointment {
    return {
        id: docId,
        clientName: data.clientName || data.nombre || '',
        treatment: data.treatment || data.servicio || '',
        date: data.date || data.fecha || '',
        time: data.time || data.hora || '',
        duration: data.duration || data.duracion || 1,
        professionalId: professionalId || data.professionalId,
        notes: data.notes || data.observaciones || '',
        price: data.price !== undefined ? data.price : data.precio,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Appointment;
}

/**
 * Traduce datos del nuevo formato al formato legacy (español)
 */
function mapToLegacy(data: any) {
    const legacy: any = {};
    if (data.clientName !== undefined) legacy.nombre = data.clientName;
    if (data.treatment !== undefined) legacy.servicio = data.treatment;
    if (data.date !== undefined) legacy.fecha = data.date;
    if (data.time !== undefined) legacy.hora = data.time;
    if (data.duration !== undefined) legacy.duracion = data.duration;
    if (data.notes !== undefined) legacy.observaciones = data.notes;
    if (data.price !== undefined) legacy.precio = data.price;
    return legacy;
}

/**
 * Sincroniza una operación con la colección legacy del profesional correspondiente
 */
async function syncWithLegacy(
    professionalId: string | undefined,
    appointmentId: string,
    operation: 'create' | 'update' | 'delete',
    data?: any
) {
    if (!professionalId) return;

    try {
        // Obtener el profesional para saber su colección legacy
        const profRef = doc(db, 'professionals', professionalId);
        const profSnap = await getDoc(profRef);

        if (!profSnap.exists()) return;

        const legacyCollection = profSnap.data().legacyCollectionName;
        if (!legacyCollection) return;

        const legacyDocRef = doc(db, legacyCollection, appointmentId);

        if (operation === 'create') {
            await setDoc(legacyDocRef, {
                ...mapToLegacy(data),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                // Guardamos el ID del profesional por si la legacy lo usa
                professionalId
            });
        } else if (operation === 'update') {
            await updateDoc(legacyDocRef, {
                ...mapToLegacy(data),
                updatedAt: Timestamp.now()
            });
        } else if (operation === 'delete') {
            await deleteDoc(legacyDocRef);
        }
        console.log(`[Sync] Operación ${operation} sincronizada con ${legacyCollection}`);
    } catch (error) {
        console.error(`[Sync] Error sincronizando ${operation}:`, error);
    }
}

/**
 * Crea un nuevo turno
 */
export async function createAppointment(
    data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, APPOINTMENTS_COLLECTION), {
        ...data,
        createdAt: now,
        updatedAt: now,
    });

    // Sincronizar con legacy
    await syncWithLegacy(data.professionalId, docRef.id, 'create', data);

    return docRef.id;
}

/**
 * Actualiza un turno existente
 */
export async function updateAppointment(
    id: string,
    data: Partial<Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    const docRef = doc(db, APPOINTMENTS_COLLECTION, id);

    // Verificar si el documento existe en la colección principal
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        // Documento existe en appointments - actualización normal
        let professionalId = data.professionalId;
        if (!professionalId) {
            professionalId = snap.data().professionalId;
        }

        await updateDoc(docRef, {
            ...data,
            updatedAt: Timestamp.now(),
        });

        // Sincronizar con legacy
        if (professionalId) {
            await syncWithLegacy(professionalId as string, id, 'update', data);
        }
    } else {
        // Documento NO existe en appointments - es un turno legacy
        console.log(`[Update] Turno no encontrado en appointments, buscando en colecciones legacy...`);
        const professionals = await getActiveProfessionals();

        let found = false;
        for (const prof of professionals) {
            if (prof.legacyCollectionName) {
                try {
                    const legacyDocRef = doc(db, prof.legacyCollectionName, id);
                    const legacySnap = await getDoc(legacyDocRef);

                    if (legacySnap.exists()) {
                        await updateDoc(legacyDocRef, {
                            ...mapToLegacy(data),
                            updatedAt: Timestamp.now(),
                        });
                        console.log(`[Update] Turno actualizado en ${prof.legacyCollectionName}`);
                        found = true;
                        break;
                    }
                } catch (error) {
                    console.error(`[Update] Error buscando en ${prof.legacyCollectionName}:`, error);
                }
            }
        }

        if (!found) {
            throw new Error(`No se encontró el turno ${id} en ninguna colección`);
        }
    }
}

/**
 * Elimina un turno
 */
export async function deleteAppointment(id: string): Promise<void> {
    const docRef = doc(db, APPOINTMENTS_COLLECTION, id);

    // Necesitamos saber de quién era el turno para borrarlo de su legacy
    const snap = await getDoc(docRef);
    let professionalId = '';
    if (snap.exists()) {
        professionalId = snap.data().professionalId;
    }

    // Eliminar de la colección principal
    await deleteDoc(docRef);

    // Sincronizar con legacy
    if (professionalId) {
        await syncWithLegacy(professionalId, id, 'delete');
    } else {
        // Si no tiene professionalId, es un turno legacy viejo
        // Buscar en todas las colecciones legacy de profesionales
        console.log(`[Delete] Turno sin professionalId, buscando en colecciones legacy...`);
        const professionals = await getActiveProfessionals();

        for (const prof of professionals) {
            if (prof.legacyCollectionName) {
                try {
                    const legacyDocRef = doc(db, prof.legacyCollectionName, id);
                    const legacySnap = await getDoc(legacyDocRef);

                    if (legacySnap.exists()) {
                        await deleteDoc(legacyDocRef);
                        console.log(`[Delete] Turno eliminado de ${prof.legacyCollectionName}`);
                        break; // Ya lo encontramos y eliminamos, salimos del loop
                    }
                } catch (error) {
                    console.error(`[Delete] Error buscando en ${prof.legacyCollectionName}:`, error);
                }
            }
        }
    }
}

/**
 * Suscribe a los turnos de una fecha específica, buscando en la colección unificada
 * y opcionalmente en colecciones legacy de profesionales.
 */
export function subscribeToAppointmentsByDate(
    date: string,
    professionals: Professional[],
    callback: (appointments: Appointment[]) => void
): () => void {
    const unsubscribes: (() => void)[] = [];
    const allAppointmentsMap: Record<string, Appointment[]> = {};

    const updateAll = () => {
        // Combinar todos los resultados y eliminar duplicados por ID
        const combined = Object.values(allAppointmentsMap).flat();
        const unique = Array.from(new Map(combined.map(apt => [apt.id, apt])).values());

        // Ordenar por hora
        unique.sort((a, b) => a.time.localeCompare(b.time));

        callback(unique);
    };

    console.log(`[Firebase] Suscribiendo a todas las fuentes para la fecha: ${date}`);

    // 1. Colección principal 'appointments' (campos nuevos)
    const qNew = query(collection(db, APPOINTMENTS_COLLECTION), where('date', '==', date));
    unsubscribes.push(onSnapshot(qNew, (snapshot) => {
        allAppointmentsMap['main_new'] = snapshot.docs.map(d => mapLegacyAppointment(d.id, d.data()));
        updateAll();
    }));

    // 2. Colección principal 'appointments' (campos legacy)
    const qLegacy = query(collection(db, APPOINTMENTS_COLLECTION), where('fecha', '==', date));
    unsubscribes.push(onSnapshot(qLegacy, (snapshot) => {
        allAppointmentsMap['main_legacy'] = snapshot.docs.map(d => mapLegacyAppointment(d.id, d.data()));
        updateAll();
    }));

    // 3. Colecciones legacy por profesional (ej: turnosLuciana)
    professionals.forEach(prof => {
        if (prof.legacyCollectionName) {
            console.log(`[Firebase] Escuchando colección legacy: ${prof.legacyCollectionName}`);
            const q = query(collection(db, prof.legacyCollectionName), where('fecha', '==', date));
            unsubscribes.push(onSnapshot(q, (snapshot) => {
                allAppointmentsMap[prof.id] = snapshot.docs.map(d => mapLegacyAppointment(d.id, d.data(), prof.id));
                updateAll();
            }));
        }
    });

    return () => unsubscribes.forEach(unsub => unsub());
}

/**
 * Obtiene turnos por rango de fechas
 */
export async function getAppointmentsByDateRange(
    startDate: string,
    endDate: string
): Promise<Appointment[]> {
    const q = query(
        collection(db, APPOINTMENTS_COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => mapLegacyAppointment(doc.id, doc.data()));
}

/**
 * Obtiene el historial de turnos de un cliente por ID (nuevos) y Nombre (legacy)
 */
export async function getAppointmentsByClientId(
    clientId: string,
    clientName: string
): Promise<Appointment[]> {
    const allAppointmentsMap = new Map<string, Appointment>();

    try {
        // 1. Buscar por clientId en colección principal (Exacto y rápido)
        const qId = query(collection(db, APPOINTMENTS_COLLECTION), where('clientId', '==', clientId));
        const snapId = await getDocs(qId);
        snapId.docs.forEach(d => {
            const apt = mapLegacyAppointment(d.id, d.data());
            allAppointmentsMap.set(apt.id, apt);
        });

        // 2. Buscar por nombre (para legacy y legacy de profesionales)
        // Reutilizamos la búsqueda por nombre que ya busca en todas las colecciones
        const legacyAppointments = await searchAppointmentsByClient(clientName);
        legacyAppointments.forEach(apt => {
            if (!allAppointmentsMap.has(apt.id)) {
                allAppointmentsMap.set(apt.id, apt);
            }
        });

        // 3. Convertir a array y ordenar (más reciente primero)
        return Array.from(allAppointmentsMap.values()).sort((a, b) => {
            // Primero por fecha descendente
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            // Luego por hora descendente
            return b.time.localeCompare(a.time);
        });

    } catch (error) {
        console.error('Error obteniendo historial del cliente:', error);
        return [];
    }
}

/**
 * Obtiene el historial de turnos de un profesional
 */
export async function getAppointmentsByProfessionalId(
    professionalId: string
): Promise<Appointment[]> {
    const allAppointmentsMap = new Map<string, Appointment>();

    try {
        // 1. Obtener datos del profesional para tener el userId y la colección legacy
        const profDoc = await getDoc(doc(db, 'professionals', professionalId));
        let userId = '';
        let legacyCollection = '';

        if (profDoc.exists()) {
            const profData = profDoc.data();
            userId = profData.userId || '';
            legacyCollection = profData.legacyCollectionName || '';
        }

        const promises: Promise<void>[] = [];

        // 2. Búsqueda por ID de documento de profesional (estándar nuevo)
        const qId = query(collection(db, APPOINTMENTS_COLLECTION), where('professionalId', '==', professionalId));
        promises.push(getDocs(qId).then(snap => {
            snap.docs.forEach(d => {
                const apt = mapLegacyAppointment(d.id, d.data());
                allAppointmentsMap.set(apt.id, apt);
            });
        }));

        // 3. Búsqueda por UID de usuario (fallback por si se guardó así)
        if (userId) {
            const qUid = query(collection(db, APPOINTMENTS_COLLECTION), where('professionalId', '==', userId));
            promises.push(getDocs(qUid).then(snap => {
                snap.docs.forEach(d => {
                    const apt = mapLegacyAppointment(d.id, d.data());
                    allAppointmentsMap.set(apt.id, apt);
                });
            }));
        }

        // 4. Búsqueda en colección legacy
        if (legacyCollection) {
            const qLegacy = query(collection(db, legacyCollection));
            promises.push(getDocs(qLegacy).then(snap => {
                snap.docs.forEach(d => {
                    const apt = mapLegacyAppointment(d.id, d.data(), professionalId);
                    if (!allAppointmentsMap.has(apt.id)) {
                        allAppointmentsMap.set(apt.id, apt);
                    }
                });
            }));
        }

        await Promise.all(promises);

        // 5. Ordenar por fecha y hora descendente
        return Array.from(allAppointmentsMap.values()).sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return a.time.localeCompare(b.time);
        });

    } catch (error) {
        console.error('Error obteniendo historial del profesional:', error);
        return [];
    }
}


/**
 * Busca turnos por nombre de cliente o tratamiento en todas las colecciones (unificada y legacy)
 */
export async function searchAppointmentsByClient(
    clientName: string,
    date?: string
): Promise<Appointment[]> {
    const searchTerm = clientName.toLowerCase();
    const allAppointmentsMap = new Map<string, Appointment>();

    try {
        // 1. Obtener profesionales para saber qué colecciones legacy buscar
        const professionals = await getActiveProfessionals();

        // 2. Preparar todas las promesas de búsqueda
        const searchPromises: Promise<void>[] = [];

        // Búsqueda en colección principal 'appointments'
        const qMain = date
            ? query(collection(db, APPOINTMENTS_COLLECTION), where('date', '==', date))
            : query(collection(db, APPOINTMENTS_COLLECTION));

        searchPromises.push(getDocs(qMain).then(snapshot => {
            snapshot.docs.forEach(d => {
                const apt = mapLegacyAppointment(d.id, d.data());
                if (apt.clientName.toLowerCase().includes(searchTerm) ||
                    apt.treatment.toLowerCase().includes(searchTerm)) {
                    allAppointmentsMap.set(apt.id, apt);
                }
            });
        }));

        // Búsqueda en colecciones legacy de profesionales
        professionals.forEach(prof => {
            if (prof.legacyCollectionName) {
                const qLegacy = date
                    ? query(collection(db, prof.legacyCollectionName), where('fecha', '==', date))
                    : query(collection(db, prof.legacyCollectionName));

                searchPromises.push(getDocs(qLegacy).then(snapshot => {
                    snapshot.docs.forEach(d => {
                        const apt = mapLegacyAppointment(d.id, d.data(), prof.id);
                        if (apt.clientName.toLowerCase().includes(searchTerm) ||
                            apt.treatment.toLowerCase().includes(searchTerm)) {
                            allAppointmentsMap.set(apt.id, apt);
                        }
                    });
                }));
            }
        });

        // 3. Esperar todas las búsquedas
        await Promise.all(searchPromises);

        // 4. Convertir a array y ordenar (más reciente primero)
        return Array.from(allAppointmentsMap.values()).sort((a, b) => {
            // Primero por fecha descendente
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            // Luego por hora descendente
            return b.time.localeCompare(a.time);
        });

    } catch (error) {
        console.error('Error en búsqueda global:', error);
        return [];
    }
}

/**
 * Obtiene todos los turnos de un profesional específico
 */
export async function getAppointmentsByProfessional(
    professionalId: string
): Promise<Appointment[]> {
    try {
        const q = query(
            collection(db, APPOINTMENTS_COLLECTION),
            where('professionalId', '==', professionalId)
        );

        const snapshot = await getDocs(q);
        const appointments = snapshot.docs.map((doc) => mapLegacyAppointment(doc.id, doc.data(), professionalId));

        // Ordenar en memoria para evitar requerir índices compuestos en Firestore
        return appointments.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return a.time.localeCompare(b.time);
        });
    } catch (error) {
        console.error('Error fetching appointments by professional:', error);
        return [];
    }
}
