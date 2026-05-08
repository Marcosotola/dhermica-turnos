export type ClientCreditStatus = 'available' | 'used' | 'forfeited';
export type ClientCreditReason = 'cancelled_appointment' | 'overpayment' | 'manual';

export interface ClientCredit {
    id: string;
    clientId: string;
    clientName: string;
    amount: number;
    reason: ClientCreditReason;
    status: ClientCreditStatus;
    sourceAppointmentId?: string;
    sourceAppointmentDate?: string;
    sourceTreatmentName?: string;
    usedInAppointmentId?: string;
    usedDate?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
}
