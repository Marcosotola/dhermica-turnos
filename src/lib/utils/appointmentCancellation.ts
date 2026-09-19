import { toast } from 'sonner';
import { Appointment } from '../types/appointment';
import type { CreditAction } from '@/components/appointments/CancelAppointmentDialog';
import { createClientCredit } from '../firebase/clientCredits';
import { cancelAppointment } from '../firebase/appointments';

/**
 * Cancela un turno y, según lo elegido en el diálogo de cancelación, retiene la seña como
 * crédito a favor del cliente o la registra como perdida. Compartido entre turnos/page.tsx
 * y agenda/page.tsx, que antes reimplementaban esto cada uno por su lado — mismo riesgo de
 * "se cambia la política de cancelación en un lado y no en el otro" que ya se vio con el bug
 * de treatmentName/name en los webhooks de pago.
 */
export async function cancelAppointmentWithCredit(
    appointment: Appointment,
    creditAction: CreditAction,
    notes: string | undefined,
    createdBy: string | undefined
): Promise<void> {
    const totalPaid = (appointment.payments || []).reduce((sum, p) => sum + p.amount, 0);

    // Primero se cancela el turno y recién después se registra el crédito. Al revés, si la
    // cancelación fallaba quedaba un crédito creado para un turno que seguía vivo, y cada
    // reintento del usuario creaba otro crédito más (la seña duplicada a favor del cliente).
    await cancelAppointment(appointment.id);

    if (creditAction !== 'none' && totalPaid > 0) {
        try {
            await createClientCredit({
                clientId: appointment.clientId || `legacy-${appointment.clientName?.replace(/\s+/g, '-').toLowerCase()}`,
                clientName: appointment.clientName,
                amount: totalPaid,
                reason: 'cancelled_appointment',
                status: creditAction === 'retain' ? 'available' : 'forfeited',
                sourceAppointmentId: appointment.id,
                sourceAppointmentDate: appointment.date,
                sourceTreatmentName: appointment.treatment,
                notes,
                createdBy,
            });
        } catch (error) {
            console.error('Error registrando el crédito de la seña:', error);
            toast.error(`El turno se canceló, pero NO se pudo registrar la seña de $${totalPaid.toLocaleString('es-AR')}. Cargala a mano como crédito del cliente.`, { duration: 10000 });
            return;
        }
    }

    if (creditAction === 'retain' && totalPaid > 0) {
        toast.success(`Turno cancelado. Crédito de $${totalPaid.toLocaleString('es-AR')} retenido a favor del cliente.`);
    } else if (creditAction === 'forfeit' && totalPaid > 0) {
        toast.success('Turno cancelado. Seña registrada como perdida.');
    } else {
        toast.success('Turno cancelado.');
    }
}
