import { WORKING_HOURS } from '../types/appointment';

/**
 * Convierte un número decimal a formato HH:mm
 * Ejemplo: 7.5 -> "07:30", 14 -> "14:00"
 */
export function decimalToTime(decimal: number): string {
    const hours = Math.floor(decimal);
    const minutes = (decimal % 1) * 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Convierte formato HH:mm a número decimal
 * Ejemplo: "07:30" -> 7.5, "14:00" -> 14
 */
export function timeToDecimal(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
}

/**
 * Genera array de horarios disponibles según configuración
 */
export function generateTimeSlots(): string[] {
    const slots: string[] = [];
    for (let i = WORKING_HOURS.start; i <= WORKING_HOURS.end; i += WORKING_HOURS.interval) {
        slots.push(decimalToTime(i));
    }
    return slots;
}

/**
 * Capitaliza la primera letra de cada palabra
 */
export function capitalizeName(name: string): string {
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Formatea una fecha a YYYY-MM-DD (tiempo local)
 */
export function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (tiempo local)
 */
export function getTodayDate(): string {
    return formatDate(new Date());
}

/**
 * Obtiene el índice del día de la semana (0-6, donde 0 es domingo) a partir de un string YYYY-MM-DD
 */
export function getDayOfWeek(dateString: string): number {
    const [year, month, day] = dateString.split('-').map(Number);
    // Mes en JS es 0-11
    const date = new Date(year, month - 1, day);
    return date.getDay();
}

/**
 * Calcula el rango de fechas (YYYY-MM-DD) para un filtro de día/semana/mes centrado en `date`.
 * La semana arranca el lunes (ISO), no el domingo — compartido entre Finanzas, Egresos y el
 * detalle financiero por profesional, que antes calculaban cada uno el inicio de semana con un
 * criterio distinto y podían no coincidir en el mismo día.
 */
export function getDayWeekMonthRange(range: 'day' | 'week' | 'month', date: Date): { start: string; end: string } {
    if (range === 'day') {
        const s = formatDate(date);
        return { start: s, end: s };
    }
    if (range === 'week') {
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day; // lunes como inicio de semana
        const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
        const sunday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff + 6);
        return { start: formatDate(monday), end: formatDate(sunday) };
    }
    // month
    const start = formatDate(new Date(date.getFullYear(), date.getMonth(), 1));
    const end = formatDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
    return { start, end };
}
