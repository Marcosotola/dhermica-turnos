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
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Professional } from '../types/professional';
import { Appointment } from '../types/appointment';
import { getActiveProfessionals, getProfessionals } from './professionals';
import { getUserProfile, formatPhone } from './users';

const APPOINTMENTS_COLLECTION = 'appointments';

/**
 * Notifies n8n webhook when a new appointment is created (fire-and-forget)
 */
async function notifyN8nNewAppointment(
    appointmentId: string,
    data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>,
    professionalName: string
) {
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        const [year, month, day] = (data.date || '').split('-');
        const formattedDate = day && month && year ? `${day}/${month}/${year}` : data.date;

        const treatmentsList = (data.treatments || []).map(t => ({
            name: t.name,
            zone: t.zone || null,
            price: t.price,
            duration: t.duration,
        }));

        const totalPaid = (data.payments || []).reduce((sum, p) => sum + p.amount, 0);

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: 'appointment_created',
                appointmentId,
                client: {
                    name: data.clientName,
                    firstName: data.clientFirstName || null,
                    lastName: data.clientLastName || null,
                    phone: data.clientPhone || null,
                    email: data.clientEmail || null,
                },
                appointment: {
                    treatment: data.treatment,
                    treatments: treatmentsList,
                    date: data.date,
                    dateFormatted: formattedDate,
                    time: data.time,
                    duration: data.duration,
                    price: data.price || 0,
                    totalPaid,
                    balance: (data.price || 0) - totalPaid,
                    status: data.status,
                    notes: data.notes || null,
                },
                professional: {
                    id: data.professionalId || null,
                    name: professionalName || null,
                },
                createdAt: new Date().toISOString(),
            }),
        });
        console.log('[n8n] Webhook notificado correctamente');
    } catch (error) {
        console.error('[n8n] Error al notificar webhook (no bloqueante):', error);
    }
}

/**
 * Notifies n8n webhook when an appointment is cancelled or deleted (fire-and-forget)
 */
async function notifyN8nAppointmentCancelled(
    appointmentId: string,
    data: Record<string, any>,
    event: 'appointment_cancelled' | 'appointment_deleted'
) {
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        const date = data.date || '';
        const [year, month, day] = date.split('-');
        const formattedDate = day && month && year ? `${day}/${month}/${year}` : date;

        let professionalName = '';
        if (data.professionalId) {
            try {
                const profSnap = await getDoc(doc(db, 'professionals', data.professionalId));
                if (profSnap.exists()) professionalName = profSnap.data().name || '';
            } catch {}
        }

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event,
                appointmentId,
                client: {
                    name: data.clientName || data.nombre || '',
                    phone: data.clientPhone || data.telefono || null,
                    email: data.clientEmail || data.email || null,
                },
                appointment: {
                    treatment: data.treatment || data.servicio || '',
                    date,
                    dateFormatted: formattedDate,
                    time: data.time || data.hora || '',
                },
                professional: {
                    id: data.professionalId || null,
                    name: professionalName || null,
                },
                cancelledAt: new Date().toISOString(),
            }),
        });
        console.log(`[n8n] Webhook ${event} notificado correctamente`);
    } catch (error) {
        console.error(`[n8n] Error al notificar ${event} (no bloqueante):`, error);
    }
}

/**
 * Sends an automated push notification via the API
 */
async function sendAutomatedNotification(title: string, body: string, uid: string, url: string) {
    try {
        const clientProfile = await getUserProfile(uid);
        if (!clientProfile || !clientProfile.fcmTokens || clientProfile.fcmTokens.length === 0 || clientProfile.notificationsEnabled === false) {
            return;
        }

        console.log(`[Notification] Triggering for user ${uid}: ${title}`);
        const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                body,
                tokens: clientProfile.fcmTokens,
                targetUserId: uid,
                targetUserName: clientProfile.fullName,
                sentBy: 'system',
                type: 'targeted',
                url
            }),
        });

        const result = await response.json();
        console.log(`[Notification] API Response for ${uid}:`, result);
    } catch (error) {
        console.error('Error sending automated notification:', error);
    }
}

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
    // DD-MM-YYYY -> YYYY-MM-DD (pero solo si el primero no es el año)
    if (d.includes('-')) {
        const parts = d.split('-');
        if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
             const [day, month, year] = parts;
             return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }
    return d;
}

/**
 * Mapea datos de Firebase (pueden ser legacy en español) al tipo Appointment
 */
function mapLegacyAppointment(docId: string, data: any, professionalId?: string): Appointment {
    const rawDate = data.date || data.fecha || '';
    const appointmentDate = normalizeDate(rawDate);
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

    // Auto-complete past appointments if no status is set
    let status = data.status;
    if (!status) {
        if (data.realizado) {
            status = 'completed';
        } else if (appointmentDate && appointmentDate < today) {
            status = 'completed';
        } else {
            status = 'pending';
        }
    }

    // Compatibilidad con múltiples nombres de campo para pagos
    const paymentsData = data.payments || data.pagos || data.paymentList || [];
    let payments: any[] = [];
    if (Array.isArray(paymentsData)) {
        payments = paymentsData;
    } else if (typeof paymentsData === 'object' && paymentsData !== null) {
        // En caso de que sea un objeto de Firebase o algo no esperado
        payments = Object.values(paymentsData);
    }

    const clientName = data.clientName || data.nombre || '';
    const clientFirstName = data.clientFirstName || (clientName ? clientName.split(' ')[0] : '');
    const clientLastName = data.clientLastName || (clientName ? clientName.split(' ').slice(1).join(' ') : '');

    return {
        id: docId,
        clientName,
        clientFirstName,
        clientLastName,
        clientPhone: data.clientPhone || data.telefono || '',
        clientEmail: data.clientEmail || data.email || '',
        treatment: data.treatment || data.servicio || '',
        date: appointmentDate,
        time: data.time || data.hora || '',
        duration: data.duration || data.duracion || 1,
        professionalId: professionalId || data.professionalId,
        notes: data.notes || data.observaciones || '',
        price: data.price !== undefined ? data.price : data.precio,
        status: status,
        payments: Array.isArray(payments) ? payments.map((p: any) => ({
            ...p,
            amount: Number(p.amount) || 0,
            date: normalizeDate(p.date || appointmentDate || new Date().toLocaleDateString('en-CA'))
        })) : [],
        isPaid: data.isPaid || false,
        paymentMethod: data.paymentMethod || undefined,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
        treatments: data.treatments || [],
        commissionPercentageOverride: data.commissionPercentageOverride,
        commissionFixedOverride: data.commissionFixedOverride,
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
    if (data.status !== undefined) legacy.status = data.status;

    // Guardar en múltiples campos para asegurar que cualquier versión de la app lo lea
    if (data.payments !== undefined) {
        legacy.payments = data.payments;
        legacy.pagos = data.payments;
        legacy.paymentList = data.payments;
    }

    if (data.isPaid !== undefined) legacy.isPaid = data.isPaid;
    if (data.paymentMethod !== undefined) legacy.paymentMethod = data.paymentMethod;
    if (data.notes !== undefined) legacy.notes = data.notes;
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
        clientPhone: formatPhone(data.clientPhone || ''),
        notified1h: false,
        notified24h: false,
        notified48h: false,
        createdAt: now,
        updatedAt: now,
    });


    // Sincronizar con legacy
    await syncWithLegacy(data.professionalId, docRef.id, 'create', data);

    // Notificar al cliente si existe
    if (data.clientId) {
        const [year, month, day] = data.date.split('-');
        const formattedDate = `${day}-${month}-${year}`;

        sendAutomatedNotification(
            'Dhermica Estetica Unisex: ¡Turno Registrado! 👋',
            `Tu cita para ${data.treatment} el ${formattedDate} a las ${data.time} ha sido agendada.`,
            data.clientId,
            '/mis-turnos'
        );
    }

    // Notificar a n8n para envío de WhatsApp
    let professionalName = '';
    if (data.professionalId) {
        try {
            const profSnap = await getDoc(doc(db, 'professionals', data.professionalId));
            if (profSnap.exists()) professionalName = profSnap.data().name || '';
        } catch {}
    }
    notifyN8nNewAppointment(docRef.id, data, professionalName);

    return docRef.id;
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
    const snap = await getDoc(doc(db, APPOINTMENTS_COLLECTION, id));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        id: snap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        payments: (data.payments || []).map((p: any) => ({
            ...p,
            createdAt: p.createdAt?.toDate?.() || new Date(),
        })),
    } as Appointment;
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
        const oldData = snap.data();
        const dateChanged = data.date && data.date !== oldData.date;
        const timeChanged = data.time && data.time !== oldData.time;

        const updateData: any = {
            ...data,
            updatedAt: Timestamp.now(),
        };

        if (data.clientPhone) {
            updateData.clientPhone = formatPhone(data.clientPhone);
        }

        // Reset reminder flags if date or time changes
        if (dateChanged || timeChanged) {
            updateData.notified1h = false;
            updateData.notified24h = false;
            updateData.notified48h = false;
        }

        await updateDoc(docRef, updateData);

        // Notificar al cliente si cambió fecha u hora
        if (oldData.clientId && (dateChanged || timeChanged)) {
            const newDate = data.date || oldData.date;
            const newTime = data.time || oldData.time;
            const [year, month, day] = newDate.split('-');
            const formattedDate = `${day}-${month}-${year}`;

            sendAutomatedNotification(
                'Dhermica: Turno Actualizado 🔄',
                `Tu cita para ${oldData.treatment || 'el servicio'} ha sido reprogramada para el ${formattedDate} a las ${newTime}.`,
                oldData.clientId,
                '/mis-turnos'
            );
        }

        const professionalId = data.professionalId || oldData.professionalId;
        // Sincronizar con legacy
        if (professionalId) {
            await syncWithLegacy(professionalId as string, id, 'update', data);
        }
    } else {
        // Documento NO existe en appointments - es un turno legacy
        console.log(`[Update] Turno no encontrado en appointments, buscando en colecciones legacy...`);
        const professionals = await getActiveProfessionals();

        const legacyProfs = professionals.filter(p => p.legacyCollectionName);
        const results = await Promise.all(
            legacyProfs.map(async (prof) => {
                try {
                    const legacyDocRef = doc(db, prof.legacyCollectionName!, id);
                    const legacySnap = await getDoc(legacyDocRef);
                    return legacySnap.exists() ? legacyDocRef : null;
                } catch {
                    return null;
                }
            })
        );

        const foundRef = results.find(r => r !== null);
        if (!foundRef) {
            throw new Error(`No se encontró el turno ${id} en ninguna colección`);
        }
        await updateDoc(foundRef, {
            ...mapToLegacy(data),
            updatedAt: Timestamp.now(),
        });
        console.log(`[Update] Turno actualizado en colección legacy`);
    }
}

/**
 * Cancela un turno (soft cancel) — mantiene el registro con status 'cancelled'
 */
export async function cancelAppointment(id: string): Promise<void> {
    const docRef = doc(db, APPOINTMENTS_COLLECTION, id);
    const snap = await getDoc(docRef);

    await updateDoc(docRef, {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
    });

    if (snap.exists()) {
        const data = snap.data();
        const professionalId = data.professionalId;

        if (professionalId) {
            await syncWithLegacy(professionalId, id, 'update', { status: 'cancelled', updatedAt: Timestamp.now() });
        }

        const appointmentDate = data.date || '';
        const appointmentTime = data.time || '';
        const treatment = data.treatment || data.servicio || 'Servicio';
        let dateDisplay = '';
        if (appointmentDate.includes('-')) {
            const [year, month, day] = appointmentDate.split('-');
            dateDisplay = ` del ${day}-${month}-${year}`;
        }

        if (data.clientId) {
            sendAutomatedNotification(
                'Dhermica Estetica Unisex: Turno Cancelado ❌',
                `Tu cita para ${treatment}${dateDisplay} a las ${appointmentTime} ha sido cancelada.`,
                data.clientId,
                '/mis-turnos'
            );
        }

        notifyN8nAppointmentCancelled(id, data, 'appointment_cancelled');
    }
}

/**
 * Elimina un turno permanentemente (hard delete) — borra el registro y todo lo asociado
 */
export async function deleteAppointment(id: string): Promise<void> {
    const docRef = doc(db, APPOINTMENTS_COLLECTION, id);

    // Necesitamos saber de quién era el turno para borrarlo de su legacy (y para notificar)
    const snap = await getDoc(docRef);
    let professionalId = '';
    let clientId = '';
    let treatment = '';

    let payments: any[] = [];

    if (snap.exists()) {
        const data = snap.data();
        professionalId = data.professionalId;
        clientId = data.clientId;
        treatment = data.treatment || data.servicio || 'Servicio';
        payments = data.payments || [];
    }

    // Limpiar créditos asociados a este turno antes de eliminarlo
    const { deleteClientCreditsBySourceAppointment, restoreCreditsUsedInAppointment } = await import('./clientCredits');
    await Promise.all([
        deleteClientCreditsBySourceAppointment(id),
        restoreCreditsUsedInAppointment(id),
    ]);

    // Eliminar de la colección principal
    await deleteDoc(docRef);

    // Notificar al cliente y a n8n
    if (snap.exists()) {
        const snapData = snap.data()!;
        const appointmentDate = snapData.date || '';
        const appointmentTime = snapData.time || '';
        let dateDisplay = '';

        if (appointmentDate.includes('-')) {
            const [year, month, day] = appointmentDate.split('-');
            dateDisplay = ` del ${day}-${month}-${year}`;
        }

        if (clientId) {
            sendAutomatedNotification(
                'Dhermica Estetica Unisex: Turno Cancelado ❌',
                `Tu cita para ${treatment}${dateDisplay} a las ${appointmentTime} ha sido cancelada.`,
                clientId,
                '/mis-turnos'
            );
        }

        notifyN8nAppointmentCancelled(id, snapData, 'appointment_deleted');
    }

    // Sincronizar con legacy
    if (professionalId) {
        await syncWithLegacy(professionalId, id, 'delete');
    } else {
        // Si no tiene professionalId, es un turno legacy viejo
        // Buscar en todas las colecciones legacy de profesionales
        console.log(`[Delete] Turno sin professionalId, buscando en colecciones legacy...`);
        const professionals = await getActiveProfessionals();

        const legacyProfs = professionals.filter(p => p.legacyCollectionName);
        const results = await Promise.all(
            legacyProfs.map(async (prof) => {
                try {
                    const legacyDocRef = doc(db, prof.legacyCollectionName!, id);
                    const legacySnap = await getDoc(legacyDocRef);
                    return legacySnap.exists() ? legacyDocRef : null;
                } catch {
                    return null;
                }
            })
        );

        const foundRef = results.find(r => r !== null);
        if (foundRef) {
            await deleteDoc(foundRef);
            console.log(`[Delete] Turno eliminado de colección legacy`);
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
 * Obtiene turnos por rango de fechas buscando en todas las fuentes (unificada y legacy)
 */
export async function getAppointmentsByDateRange(
    startDate: string,
    endDate: string
): Promise<Appointment[]> {
    const allAppointmentsMap = new Map<string, Appointment>();
    
    try {
        const professionals = await getProfessionals();
        const promises: Promise<void>[] = [];

        // 1. Colección principal 'appointments' (campos 'date' y 'fecha')
        const qMainDate = query(
            collection(db, APPOINTMENTS_COLLECTION),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
        );
        promises.push(getDocs(qMainDate).then(snap => {
            snap.docs.forEach(d => {
                const apt = mapLegacyAppointment(d.id, d.data());
                allAppointmentsMap.set(d.id, apt);
            });
        }).catch(err => console.error('Error en qMainDate:', err)));

        const qMainFecha = query(
            collection(db, APPOINTMENTS_COLLECTION),
            where('fecha', '>=', startDate),
            where('fecha', '<=', endDate)
        );
        promises.push(getDocs(qMainFecha).then(snap => {
            snap.docs.forEach(d => {
                if (!allAppointmentsMap.has(d.id)) {
                    const apt = mapLegacyAppointment(d.id, d.data());
                    allAppointmentsMap.set(d.id, apt);
                }
            });
        }).catch(err => console.error('Error en qMainFecha:', err)));

        // 2. Colecciones legacy de profesionales
        professionals.forEach(prof => {
            if (prof.legacyCollectionName) {
                const qLegacy = query(collection(db, prof.legacyCollectionName));
                promises.push(getDocs(qLegacy).then(snap => {
                    snap.docs.forEach(d => {
                        if (!allAppointmentsMap.has(d.id)) {
                            const apt = mapLegacyAppointment(d.id, d.data(), prof.id);
                            if (apt.date >= startDate && apt.date <= endDate) {
                                allAppointmentsMap.set(d.id, apt);
                            }
                        }
                    });
                }).catch(err => console.error(`Error en qLegacy (${prof.legacyCollectionName}):`, err)));
            }
        });

        await Promise.all(promises);

        // 3. Fallback para formatos DD/MM/YYYY y DD-MM-YYYY si es un solo día
        if (startDate === endDate) {
            const [y, m, d] = startDate.split('-');
            const mPadded = m.padStart(2, '0');
            const dPadded = d.padStart(2, '0');
            const mInt = parseInt(m).toString();
            const dInt = parseInt(d).toString();

            const variations = [
                `${dPadded}/${mPadded}/${y}`,
                `${dPadded}-${mPadded}-${y}`,
                `${dInt}/${mInt}/${y}`,
                `${dInt}-${mInt}-${y}`,
                `${y}-${mInt}-${dInt}`
            ];

            const fallbackPromises: Promise<void>[] = [];

            const addFallbackQuery = (collectionName: string, fieldName: string, value: string) => {
                fallbackPromises.push(getDocs(query(collection(db, collectionName), where(fieldName, '==', value))).then(snap => {
                    snap.docs.forEach(docSnap => {
                        if (!allAppointmentsMap.has(docSnap.id)) {
                            const apt = mapLegacyAppointment(docSnap.id, docSnap.data());
                            allAppointmentsMap.set(docSnap.id, apt);
                        }
                    });
                }).catch(() => {}));
            };

            variations.forEach(val => {
                // Main collection
                addFallbackQuery(APPOINTMENTS_COLLECTION, 'date', val);
                addFallbackQuery(APPOINTMENTS_COLLECTION, 'fecha', val);

                // Legacy collections
                professionals.forEach(prof => {
                    if (prof.legacyCollectionName) {
                        addFallbackQuery(prof.legacyCollectionName, 'fecha', val);
                        addFallbackQuery(prof.legacyCollectionName, 'date', val);
                    }
                });
            });

            await Promise.all(fallbackPromises);
        }
        
        // Convertir a array y ordenar
        return Array.from(allAppointmentsMap.values()).sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.time.localeCompare(b.time);
        });

    } catch (error) {
        console.error('Error obteniendo turnos por rango:', error);
        return [];
    }
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
    const searchTerm = clientName.trim().toLowerCase();
    if (!searchTerm) return [];
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
 * Trae todos los nombres únicos de clientes de todas las colecciones de turnos
 * (colección principal + colecciones legacy de cada profesional).
 * Se usa en Fichas para construir la lista de clientes históricos sin search term.
 */
export async function getAllLegacyClientNames(): Promise<string[]> {
    const names = new Set<string>();

    try {
        const professionals = await getActiveProfessionals();
        const promises: Promise<void>[] = [];

        // Colección principal
        promises.push(getDocs(collection(db, APPOINTMENTS_COLLECTION)).then(snap => {
            snap.docs.forEach(d => {
                const name = d.data().clientName || d.data().nombre || '';
                if (name.trim()) names.add(name.trim());
            });
        }));

        // Colecciones legacy de profesionales
        professionals.forEach(prof => {
            if (prof.legacyCollectionName) {
                promises.push(getDocs(collection(db, prof.legacyCollectionName)).then(snap => {
                    snap.docs.forEach(d => {
                        const name = d.data().clientName || d.data().nombre || '';
                        if (name.trim()) names.add(name.trim());
                    });
                }));
            }
        });

        await Promise.all(promises);
        return Array.from(names);
    } catch (error) {
        console.error('Error obteniendo nombres de clientes legacy:', error);
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

/**
 * Backfills contact information for future appointments that are missing it.
 * Only targets appointments from a specific date onwards for registered clients.
 */
export async function backfillFutureAppointments(startDate: string): Promise<{ updated: number, errors: number }> {
    let updatedCount = 0;
    let errorCount = 0;

    try {
        console.log(`[Backfill] Iniciando actualización de turnos desde: ${startDate}`);
        const q = query(
            collection(db, APPOINTMENTS_COLLECTION),
            where('date', '>=', startDate)
        );

        const querySnapshot = await getDocs(q);
        console.log(`[Backfill] Se encontraron ${querySnapshot.docs.length} turnos futuros en total.`);
        
        const missingPhoneDocs = querySnapshot.docs.filter(d => {
            const d2 = d.data();
            return d2.clientId && !d2.clientPhone;
        });

        // Pre-fetch all unique users in parallel
        const uniqueClientIds = [...new Set(missingPhoneDocs.map(d => d.data().clientId as string))];
        const userDocs = await Promise.all(
            uniqueClientIds.map(uid => getDoc(doc(db, 'users', uid)))
        );
        const userCache: Record<string, any> = {};
        userDocs.forEach(userDoc => {
            if (userDoc.exists()) userCache[userDoc.id] = userDoc.data();
        });

        for (const docSnap of missingPhoneDocs) {
            const data = docSnap.data();
            try {
                const userData = userCache[data.clientId];
                if (userData?.phone) {
                    await updateDoc(docSnap.ref, {
                        clientPhone: userData.phone,
                        clientEmail: userData.email || '',
                        updatedAt: serverTimestamp()
                    });
                    updatedCount++;
                }
            } catch (e) {
                console.error(`[Backfill] Error actualizando turno ${docSnap.id}:`, e);
                errorCount++;
            }
        }

        console.log(`[Backfill] Finalizado. Actualizados: ${updatedCount}, Errores: ${errorCount}`);
        return { updated: updatedCount, errors: errorCount };
    } catch (error) {
        console.error('[Backfill] Error fatal en proceso:', error);
        throw error;
    }
}

export interface UnpaidAppointment extends Appointment {
    totalPaid: number;
    amountDue: number;
}

/**
 * Obtiene turnos completados con saldo pendiente de cobro desde una fecha dada.
 * Solo busca en la colección principal (no legacy).
 */
export async function getUnpaidAppointmentsFromDate(fromDate: string): Promise<UnpaidAppointment[]> {
    const q = query(
        collection(db, APPOINTMENTS_COLLECTION),
        where('date', '>=', fromDate),
        orderBy('date', 'desc')
    );

    const snap = await getDocs(q);
    const result: UnpaidAppointment[] = [];

    for (const docSnap of snap.docs) {
        const apt = mapLegacyAppointment(docSnap.id, docSnap.data());
        if (apt.status !== 'completed') continue;

        const totalPaid = apt.payments.reduce((sum, p) => sum + p.amount, 0);
        const totalPrice = apt.price ?? apt.treatments?.reduce((sum, t) => sum + t.price, 0) ?? 0;
        const amountDue = totalPrice - totalPaid;

        if (totalPrice > 0 && amountDue > 0.01) {
            result.push({ ...apt, totalPaid, amountDue });
        }
    }

    return result;
}
