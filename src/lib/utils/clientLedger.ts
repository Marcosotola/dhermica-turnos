import { Appointment } from '../types/appointment';
import { ClientCredit } from '../types/clientCredit';

export type LedgerEntryType =
    | 'payment'
    | 'credit_generated'
    | 'credit_used'
    | 'credit_forfeited';

export interface LedgerEntry {
    id: string;
    date: string;               // YYYY-MM-DD — fecha real de la transacción
    type: LedgerEntryType;
    amount: number;
    label: string;
    method?: string;
    bankAccount?: string | null;
    appointmentId?: string;
    appointmentDate?: string;
    treatmentName?: string;
    creditId?: string;
    notes?: string;
}

export interface ClientLedgerSummary {
    totalBilled: number;        // suma de precios de todos los turnos completados/pendientes
    totalPaid: number;          // suma de todos los pagos recibidos
    totalDebt: number;          // lo que el cliente aún debe
    availableCredit: number;    // señas retenidas a favor del cliente
    netBalance: number;         // deuda - crédito disponible (negativo = a favor del cliente)
}

export function buildClientLedger(
    appointments: Appointment[],
    credits: ClientCredit[]
): LedgerEntry[] {
    const entries: LedgerEntry[] = [];

    for (const apt of appointments) {
        for (const payment of (apt.payments || [])) {
            entries.push({
                id: `apt-${apt.id}-pay-${payment.id}`,
                date: payment.date || apt.date,
                type: 'payment',
                amount: payment.amount,
                label: payment.label || 'Pago',
                method: payment.method,
                bankAccount: payment.bankAccount,
                appointmentId: apt.id,
                appointmentDate: apt.date,
                treatmentName: apt.treatment,
            });
        }
    }

    for (const credit of credits) {
        const creditDate =
            credit.createdAt instanceof Date
                ? credit.createdAt.toLocaleDateString('en-CA')
                : String(credit.createdAt).slice(0, 10);

        if (credit.status === 'forfeited') {
            entries.push({
                id: `credit-forfeited-${credit.id}`,
                date: creditDate,
                type: 'credit_forfeited',
                amount: credit.amount,
                label: 'Seña Perdida',
                appointmentId: credit.sourceAppointmentId,
                appointmentDate: credit.sourceAppointmentDate,
                treatmentName: credit.sourceTreatmentName,
                creditId: credit.id,
                notes: credit.notes,
            });
        } else {
            // available o used: mostrar la generación del crédito
            entries.push({
                id: `credit-gen-${credit.id}`,
                date: creditDate,
                type: 'credit_generated',
                amount: credit.amount,
                label: 'Seña Retenida (Crédito)',
                appointmentId: credit.sourceAppointmentId,
                appointmentDate: credit.sourceAppointmentDate,
                treatmentName: credit.sourceTreatmentName,
                creditId: credit.id,
                notes: credit.notes,
            });

            if (credit.status === 'used' && credit.usedDate) {
                entries.push({
                    id: `credit-used-${credit.id}`,
                    date: credit.usedDate,
                    type: 'credit_used',
                    amount: credit.amount,
                    label: 'Crédito Aplicado',
                    appointmentId: credit.usedInAppointmentId,
                    creditId: credit.id,
                });
            }
        }
    }

    return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export function getClientLedgerSummary(
    appointments: Appointment[],
    credits: ClientCredit[]
): ClientLedgerSummary {
    const activeStatuses = new Set(['completed', 'pending', 'realizado']);

    let totalBilled = 0;
    let totalPaid = 0;

    for (const apt of appointments) {
        if (activeStatuses.has(apt.status)) {
            totalBilled += apt.price || 0;
        }
        totalPaid += (apt.payments || []).reduce((s, p) => s + p.amount, 0);
    }

    const totalDebt = Math.max(0, totalBilled - totalPaid);

    const availableCredit = credits
        .filter(c => c.status === 'available')
        .reduce((s, c) => s + c.amount, 0);

    const netBalance = totalDebt - availableCredit;

    return { totalBilled, totalPaid, totalDebt, availableCredit, netBalance };
}

export function formatPaymentMethod(method: string | undefined): string {
    switch (method) {
        case 'cash': return 'Efectivo';
        case 'transfer': return 'Transferencia';
        case 'debit': return 'Débito';
        case 'credit': return 'Crédito';
        case 'qr': return 'QR';
        default: return method || '—';
    }
}

export function formatLedgerDate(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }
    return dateStr;
}
