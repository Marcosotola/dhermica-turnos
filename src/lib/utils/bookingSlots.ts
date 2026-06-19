import { adminDb } from '../firebase/admin';
import { Professional } from '../types/professional';
import { timeToDecimal, decimalToTime, getDayOfWeek, formatDate } from './time';

const MAX_SEARCH_DAYS = 30;
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
 * Busca las próximas opciones disponibles para uno o más tratamientos.
 * Si todos los tratamientos los puede hacer el mismo profesional, devuelve una sola franja.
 * Si requieren distintos profesionales, intenta encontrar combinaciones el mismo día (consecutivas o con poco gap).
 * Busca día a día y para en cuanto tiene MAX_RESULTS opciones.
 */
export async function findAvailableBookingOptions(
    groups: TreatmentGroup[],
    preferMorning?: boolean // true=mañana, false=tarde, undefined=cualquiera
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
    const eligiblePerGroup: Professional[][] = groups.map(group =>
        professionals.filter(p =>
            !p.services?.length || p.services.includes(group.treatmentId) || p.services.includes(group.treatmentName)
        )
    );

    const results: BookingOption[] = [];
    const today = new Date();

    for (let dayOffset = 1; dayOffset <= MAX_SEARCH_DAYS && results.length < MAX_RESULTS; dayOffset++) {
        const d = new Date(today);
        d.setDate(today.getDate() + dayOffset);
        const date = formatDate(d);

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

    const candidates: Professional[] = profsSnap.docs
        .map(d => ({ id: d.id, ...(d.data() as Omit<Professional, 'id'>), createdAt: d.data().createdAt?.toDate() || new Date() }))
        .filter(p => !p.services?.length || p.services.includes(treatmentId) || p.services.includes(treatmentName));

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
