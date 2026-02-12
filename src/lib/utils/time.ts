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
