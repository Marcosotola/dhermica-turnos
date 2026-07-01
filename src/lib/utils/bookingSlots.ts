import { adminDb } from '../firebase/admin';
import { Professional } from '../types/professional';
import { timeToDecimal, decimalToTime, getDayOfWeek, formatDate } from './time';

const MAX_SEARCH_DAYS = 90;
const MAX_RESULTS = 5;
const GAP_BETWEEN_TREATMENTS_MIN = 15; // margen entre tratamientos de distintos profesionales

export interface SlotCandidate {
    date: string;       // YYYY-MM-DD
    time: string;       // HH:mm
    endTime: string;    // HH:mm (calculado)
    professionalId: string;
    professionalName: string;
    durationMinutes: number;
}

export interface BookingOption {
    slots: SlotCandidate[];
    sameDay: boolean;
    gapMinutes: number; // 0 si son consecutivos
}

// ── helpers ──────────────────────────────────────────────────────────────────

function addMinutesToTime(time: string, minutes: number): string {
    const decimal = timeToDecimal(time) + minutes / 60;
    return decimalToTime(decimal);
}

function minutesBetween(timeA: string, timeB: string): number {
    return Math.round((timeToDecimal(timeB) - timeToDecimal(timeA)) * 60);
}

/** Genera todos los slots de inicio posibles para un profesional en un día dado */
function getProfessionalWorkWindow(
    prof: Professional,
    date: string
): { start: string; end: string; lunchStart?: string; lunchEnd?: string } | null {
    const dayIndex = getDayOfWeek(date).toString();
    const schedule = prof.workingHours?.[dayIndex];
    if (!schedule?.enabled) return null;

    // Verificar excepciones (ausencias)
    const exceptions = prof.exceptions?.filter(ex => ex.date === date) || [];
    const hasFullDayAbsence = exceptions.some(ex => ex.type === 'absence' && !ex.start);
    if (hasFullDayAbsence) return null;

    return {
        start: schedule.start,
        end: schedule.end,
        lunchStart: schedule.lunchStart,
        lunchEnd: schedule.lunchEnd,
    };
}

/** Obtiene turnos ocupados de un profesional en una fecha (appointments + pendingBookings) */
async function getOccupiedBlocks(
    professionalId: string,
    date: string
): Promise<Array<{ startDecimal: number; endDecimal: number }>> {
    const blocks: Array<{ startDecimal: number; endDecimal: number }> = [];

    // Turnos confirmados
    const aptsSnap = await adminDb
        .collection('appointments')
        .where('professionalId', '==', professionalId)
        .where('date', '==', date)
        .get();

    aptsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'cancelled') return;
        const start = timeToDecimal(data.time);
        const end = start + (data.duration || 1);
        blocks.push({ startDecimal: start, endDecimal: end });
    });

    // Reservas pendientes de pago (bloquean el slot hasta que expiren)
    const pending = await adminDb
        .collection('pendingBookings')
        .where('status', 'in', ['pending_payment', 'confirmed'])
        .get();

    pending.docs.forEach(d => {
        const data = d.data();
        const slots: any[] = data.slots || [];
        slots.forEach(slot => {
            if (slot.professionalId === professionalId && slot.date === date) {
                const start = timeToDecimal(slot.time);
                const end = start + slot.durationMinutes / 60;
                blocks.push({ startDecimal: start, endDecimal: end });
            }
        });
    });

    return blocks;
}

/** Devuelve los horarios de inicio disponibles para un profesional en un día dado */
async function getAvailableStartTimes(
    prof: Professional,
    date: string,
    durationMinutes: number
): Promise<string[]> {
    const window = getProfessionalWorkWindow(prof, date);
    if (!window) return [];

    const durationDecimal = durationMinutes / 60;
    const occupied = await getOccupiedBlocks(prof.id, date);

    const windowStart = timeToDecimal(window.start);
    const windowEnd = timeToDecimal(window.end);
    const lunchStart = window.lunchStart ? timeToDecimal(window.lunchStart) : null;
    const lunchEnd = window.lunchEnd ? timeToDecimal(window.lunchEnd) : null;

    const available: string[] = [];

    for (let t = windowStart; t + durationDecimal <= windowEnd; t += 0.5) {
        const end = t + durationDecimal;

        // No pasar por el almuerzo
        if (lunchStart && lunchEnd) {
            if (t < lunchEnd && end > lunchStart) continue;
        }

        // No solapar con turnos existentes
        const overlaps = occupied.some(b => t < b.endDecimal && end > b.startDecimal);
        if (overlaps) continue;

        available.push(decimalToTime(t));
    }

    return available;
}

// ── búsqueda principal ────────────────────────────────────────────────────────

export interface TreatmentGroup {
    treatmentId: string;
    treatmentName: string;
    zone: string;
    durationMinutes: number;
}

/**
 * Determina la lista de fechas candidatas para buscar disponibilidad.
 * Si algún grupo requiere un aparato, solo se consideran las fechas registradas
 * en `aparato_sessions` para ese tipo de aparato. En caso contrario, itera
 * los próximos MAX_SEARCH_DAYS días.
 */
async function buildCandidateDates(
    groups: TreatmentGroup[],
    today: Date,
    todayStr: string,
    startAfterDate?: string
): Promise<string[]> {
    const aparatoDatesPerGroup = await Promise.all(
        groups.map(async (group) => {
            const treatSnap = await adminDb.collection('treatments').doc(group.treatmentId).get();
            if (!treatSnap.exists) return null;
            const requiereAparato: string | undefined = treatSnap.data()!.requiereAparato;
            if (!requiereAparato) return null;

            const sesSnap = await adminDb
                .collection('aparato_sessions')
                .where('treatment', '==', requiereAparato)
                .where('date', '>=', todayStr)
                .get();
            return sesSnap.docs.map(d => d.data().date as string).sort();
        })
    );

    const constrained = aparatoDatesPerGroup.filter((d): d is string[] => d !== null);

    if (constrained.length > 0) {
        // Intersección: solo fechas disponibles para TODOS los grupos con restricción
        let allowed = new Set(constrained[0]);
        for (let i = 1; i < constrained.length; i++) {
            allowed = new Set([...allowed].filter(d => constrained[i].includes(d)));
        }
        return [...allowed]
            .filter(d => d > todayStr && (!startAfterDate || d > startAfterDate))
            .sort();
    }

    // Sin restricción de aparato: generar los próximos MAX_SEARCH_DAYS días
    const dates: string[] = [];
    for (let offset = 1; offset <= MAX_SEARCH_DAYS; offset++) {
        const d = new Date(today);
        d.setDate(today.getDate() + offset);
        const date = formatDate(d);
        if (startAfterDate && date <= startAfterDate) continue;
        dates.push(date);
    }
    return dates;
}

/**
 * Busca las próximas opciones disponibles para uno o más tratamientos.
 * Si todos los tratamientos los puede hacer el mismo profesional, devuelve una sola franja.
 * Si requieren distintos profesionales, intenta encontrar combinaciones el mismo día (consecutivas o con poco gap).
 * Si algún tratamiento requiere un aparato (campo `requiereAparato` en Firestore), solo
 * considera las fechas registradas en `aparato_sessions` para ese tipo de aparato.
 */
export async function findAvailableBookingOptions(
    groups: TreatmentGroup[],
    preferMorning?: boolean, // true=mañana, false=tarde, undefined=cualquiera
    startAfterDate?: string  // YYYY-MM-DD — omite días en o antes de esta fecha
): Promise<BookingOption[]> {
    // 1. Cargar profesionales activos
    const profsSnap = await adminDb
        .collection('professionals')
        .where('active', '==', true)
        .get();
    const professionals: Professional[] = profsSnap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Professional, 'id'>),
        createdAt: d.data().createdAt?.toDate() || new Date(),
    }));

    // 2. Para cada grupo, filtrar qué profesionales pueden hacerlo
    const eligiblePerGroup: Professional[][] = groups.map(group => {
        const nameNorm = group.treatmentName.trim().toLowerCase();
        return professionals.filter(p => {
            if (!p.services?.length) return true;
            if (p.services.includes(group.treatmentId)) return true;
            // comparación tolerante: ignora espacios extra y mayúsculas
            return p.services.some(s => s.trim().toLowerCase() === nameNorm);
        });
    });

    // 3. Determinar fechas candidatas (respeta restricciones de aparato)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const candidateDates = await buildCandidateDates(groups, today, todayStr, startAfterDate);

    const results: BookingOption[] = [];

    for (const date of candidateDates) {
        if (results.length >= MAX_RESULTS) break;

        if (groups.length === 1) {
            // Caso simple: un solo tratamiento
            const group = groups[0];
            for (const prof of eligiblePerGroup[0]) {
                const times = await getAvailableStartTimes(prof, date, group.durationMinutes);
                const filtered = filterByPreference(times, preferMorning);
                for (const time of filtered) {
                    if (results.length >= MAX_RESULTS) break;
                    results.push({
                        sameDay: true,
                        gapMinutes: 0,
                        slots: [{
                            date,
                            time,
                            endTime: addMinutesToTime(time, group.durationMinutes),
                            professionalId: prof.id,
                            professionalName: prof.name,
                            durationMinutes: group.durationMinutes,
                        }],
                    });
                }
                if (results.length >= MAX_RESULTS) break;
            }
        } else {
            // Caso multi-tratamiento: buscar combinaciones mismo día
            await findMultiGroupCombinations(
                groups, eligiblePerGroup, date, preferMorning, results
            );
        }
    }

    return results;
}

async function findMultiGroupCombinations(
    groups: TreatmentGroup[],
    eligiblePerGroup: Professional[][],
    date: string,
    preferMorning: boolean | undefined,
    results: BookingOption[]
): Promise<void> {
    // Obtener slots disponibles para el primer grupo
    const firstGroup = groups[0];
    for (const firstProf of eligiblePerGroup[0]) {
        const firstTimes = await getAvailableStartTimes(firstProf, date, firstGroup.durationMinutes);
        const filteredFirst = filterByPreference(firstTimes, preferMorning);

        for (const firstTime of filteredFirst) {
            if (results.length >= MAX_RESULTS) return;

            const firstEnd = addMinutesToTime(firstTime, firstGroup.durationMinutes);
            const chainSlots: SlotCandidate[] = [{
                date,
                time: firstTime,
                endTime: firstEnd,
                professionalId: firstProf.id,
                professionalName: firstProf.name,
                durationMinutes: firstGroup.durationMinutes,
            }];

            // Intentar encadenar el resto de grupos a continuación
            let currentEnd = firstEnd;
            let valid = true;

            for (let g = 1; g < groups.length; g++) {
                const group = groups[g];
                let found = false;

                for (const prof of eligiblePerGroup[g]) {
                    if (chainSlots.some(s => s.professionalId === prof.id)) continue; // no repetir prof

                    // Intentar arrancar justo después del anterior (+ margen)
                    const earliestStart = addMinutesToTime(currentEnd, GAP_BETWEEN_TREATMENTS_MIN);
                    const times = await getAvailableStartTimes(prof, date, group.durationMinutes);

                    // Buscar el primer slot disponible >= earliestStart
                    const nextTime = times.find(t => timeToDecimal(t) >= timeToDecimal(earliestStart));
                    if (!nextTime) continue;

                    const gapMin = minutesBetween(currentEnd, nextTime);
                    chainSlots.push({
                        date,
                        time: nextTime,
                        endTime: addMinutesToTime(nextTime, group.durationMinutes),
                        professionalId: prof.id,
                        professionalName: prof.name,
                        durationMinutes: group.durationMinutes,
                    });
                    currentEnd = addMinutesToTime(nextTime, group.durationMinutes);
                    found = true;
                    break;
                }

                if (!found) { valid = false; break; }
            }

            if (valid && chainSlots.length === groups.length) {
                const totalGap = chainSlots.slice(1).reduce((acc, slot, i) => {
                    return acc + Math.max(0, minutesBetween(chainSlots[i].endTime, slot.time) - GAP_BETWEEN_TREATMENTS_MIN);
                }, 0);

                results.push({
                    slots: chainSlots,
                    sameDay: true,
                    gapMinutes: totalGap,
                });
            }
        }
    }
}

function filterByPreference(times: string[], preferMorning?: boolean): string[] {
    if (preferMorning === undefined) return times;
    return times.filter(t => {
        const h = timeToDecimal(t);
        return preferMorning ? h < 13 : h >= 13;
    });
}

/** Elige el mejor profesional disponible para un slot concreto (para asignación directa) */
export async function assignBestProfessional(
    treatmentId: string,
    treatmentName: string,
    date: string,
    time: string,
    durationMinutes: number
): Promise<{ professionalId: string; professionalName: string } | null> {
    const profsSnap = await adminDb
        .collection('professionals')
        .where('active', '==', true)
        .get();

    const nameNorm = treatmentName.trim().toLowerCase();
    const candidates: Professional[] = profsSnap.docs
        .map(d => ({ id: d.id, ...(d.data() as Omit<Professional, 'id'>), createdAt: d.data().createdAt?.toDate() || new Date() }))
        .filter(p => {
            if (!p.services?.length) return true;
            if (p.services.includes(treatmentId)) return true;
            return p.services.some(s => s.trim().toLowerCase() === nameNorm);
        });

    // Contar turnos de cada candidato en ese día y elegir el que tenga menos
    const counts = await Promise.all(candidates.map(async prof => {
        const snap = await adminDb
            .collection('appointments')
            .where('professionalId', '==', prof.id)
            .where('date', '==', date)
            .get();
        const active = snap.docs.filter(d => d.data().status !== 'cancelled').length;
        return { prof, count: active };
    }));

    // Filtrar los que tienen ese slot libre
    const available: typeof counts = [];
    for (const entry of counts) {
        const times = await getAvailableStartTimes(entry.prof, date, durationMinutes);
        if (times.includes(time)) available.push(entry);
    }

    if (!available.length) return null;

    available.sort((a, b) => a.count - b.count);
    return { professionalId: available[0].prof.id, professionalName: available[0].prof.name };
}
