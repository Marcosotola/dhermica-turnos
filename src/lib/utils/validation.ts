import { Appointment } from '../types/appointment';
import { Professional } from '../types/professional';
import { timeToDecimal, getDayOfWeek } from './time';

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

    if (!data.clientPhone || data.clientPhone.trim().length === 0) {
        errors.push('El teléfono de contacto es requerido (WhatsApp)');
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

/**
 * Verifica si un turno está fuera del horario del profesional (es un turno "huérfano")
 */
export function checkAppointmentConflict(
    appointment: Pick<Appointment, 'date' | 'time' | 'duration'>,
    professional: Professional
): { isOrphan: boolean; reason?: string; type?: 'absence' | 'schedule' | 'lunch'; note?: string } {
    if (!professional || !professional.workingHours) return { isOrphan: false };

    const aptStart = timeToDecimal(appointment.time);
    const aptEnd = aptStart + appointment.duration;

    // 1. Verificar Excepciones (Ausencias y Horas Extra)
    const dayExceptions = professional.exceptions?.filter(ex => ex.date === appointment.date) || [];
    
    // Primero buscar si el turno está cubierto por ALGUNA hora extra
    // Si lo está, es válido y no seguimos buscando otros conflictos (almuerzo, etc)
    const isCoveredByExtra = dayExceptions.some(ex => {
        if (ex.type === 'extra' && ex.start && ex.end) {
            const exStart = timeToDecimal(ex.start);
            const exEnd = timeToDecimal(ex.end);
            return aptStart >= exStart && aptEnd <= exEnd;
        }
        return false;
    });

    if (isCoveredByExtra) return { isOrphan: false };

    // Si no está cubierto por horas extra, verificar si hay alguna ausencia que lo bloquee
    for (const ex of dayExceptions) {
        if (ex.type === 'absence') {
            if (ex.start && ex.end) {
                const exStart = timeToDecimal(ex.start);
                const exEnd = timeToDecimal(ex.end);
                if (aptStart < exEnd && aptEnd > exStart) {
                    return {
                        isOrphan: true,
                        type: 'absence',
                        note: ex.note,
                        reason: `Ausencia: ${ex.note || 'No disponible'}`
                    };
                }
            } else {
                // Ausencia de todo el día
                return {
                    isOrphan: true,
                    type: 'absence',
                    note: ex.note,
                    reason: `Ausencia: ${ex.note || 'No disponible'}`
                };
            }
        }
    }

    // 2. Verificar Horario Semanal
    const dayIndex = getDayOfWeek(appointment.date).toString();
    const schedule = professional.workingHours[dayIndex];

    if (!schedule || !schedule.enabled) {
        return {
            isOrphan: true,
            type: 'schedule',
            reason: 'El profesional no trabaja este día de la semana'
        };
    }

    const profStart = timeToDecimal(schedule.start);
    const profEnd = timeToDecimal(schedule.end);

    // 3. Verificar Límites de Jornada (Desborde)
    if (aptStart < profStart || aptEnd > profEnd) {
        return {
            isOrphan: true,
            type: 'schedule',
            reason: `Fuera del horario de jornada (${schedule.start} a ${schedule.end})`
        };
    }

    // 4. Verificar Almuerzo
    if (schedule.lunchStart && schedule.lunchEnd) {
        const lunchStart = timeToDecimal(schedule.lunchStart);
        const lunchEnd = timeToDecimal(schedule.lunchEnd);

        // Un turno tiene conflicto si se pisa con cualquier parte del almuerzo
        if (aptStart < lunchEnd && aptEnd > lunchStart) {
            return {
                isOrphan: true,
                type: 'lunch',
                reason: `Coincide con el horario de almuerzo (${schedule.lunchStart} a ${schedule.lunchEnd})`
            };
        }
    }

    return { isOrphan: false };
}
