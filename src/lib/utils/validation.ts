import { Appointment } from '../types/appointment';
import { timeToDecimal } from './time';

/**
 * Verifica si un turno se superpone con otro
 */
export function checkOverlap(
    appointment1: Pick<Appointment, 'time' | 'duration'>,
    appointment2: Pick<Appointment, 'time' | 'duration'>
): boolean {
    const start1 = timeToDecimal(appointment1.time);
    const end1 = start1 + appointment1.duration;
    const start2 = timeToDecimal(appointment2.time);
    const end2 = start2 + appointment2.duration;

    return start1 < end2 && start2 < end1;
}

/**
 * Verifica si un horario está ocupado por un turno
 */
export function isTimeSlotOccupied(
    timeSlot: string,
    appointment: Pick<Appointment, 'time' | 'duration'>
): boolean {
    const slotTime = timeToDecimal(timeSlot);
    const appointmentStart = timeToDecimal(appointment.time);
    const appointmentEnd = appointmentStart + appointment.duration;

    return slotTime >= appointmentStart && slotTime < appointmentEnd;
}

/**
 * Valida que los datos del turno sean correctos
 */
export function validateAppointment(data: Partial<Appointment>): string[] {
    const errors: string[] = [];

    if (!data.clientName || data.clientName.trim().length === 0) {
        errors.push('El nombre del cliente es requerido');
    }

    if (!data.treatment || data.treatment.trim().length === 0) {
        errors.push('El tratamiento es requerido');
    }

    if (!data.date) {
        errors.push('La fecha es requerida');
    }

    if (!data.time) {
        errors.push('La hora es requerida');
    }

    if (!data.duration || data.duration <= 0) {
        errors.push('La duración debe ser mayor a 0');
    }

    return errors;
}
