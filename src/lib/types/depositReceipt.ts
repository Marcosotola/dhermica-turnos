// Comprobantes de pago (seña, saldo o total) que las clientas mandan por WhatsApp. n8n los lee
// con IA, busca el turno por el teléfono que envía y los guarda acá como "por confirmar": el pago
// recién se carga en el turno cuando la secretaria lo confirma mirando el banco.
import type { BankAccount } from './bankAccount';

export type DepositReceiptStatus = 'pending' | 'confirmed' | 'rejected';

// Motivos por los que conviene mirar el comprobante con más atención (o asignarlo a mano)
export type DepositReceiptProblem =
    | 'no_leido'      // la IA no pudo leer el archivo
    | 'sin_turno'     // el teléfono que envía no tiene turnos próximos ni recientes con saldo
    | 'destinatario'  // la transferencia no es a ninguna cuenta de Dhermica
    | 'monto'         // el monto no alcanza para la seña que falta
    | 'ya_pagada'     // el turno ya está pagado
    | 'fecha'         // la transferencia es vieja o tiene una fecha rara
    | 'repetido';     // ya llegó un comprobante con el mismo número de operación

export const DEPOSIT_RECEIPT_PROBLEM_LABELS: Record<DepositReceiptProblem, string> = {
    no_leido: 'No se pudo leer el comprobante',
    sin_turno: 'El número no tiene turnos próximos ni con saldo',
    destinatario: 'La transferencia no es a ninguna cuenta de Dhermica',
    monto: 'El monto no alcanza para la seña',
    ya_pagada: 'El turno ya está pagado',
    fecha: 'La fecha de la transferencia es vieja o rara',
    repetido: 'Ya llegó un comprobante con el mismo n.º de operación',
};

/** Lo que la IA leyó del comprobante (strings vacíos si el dato no figura). */
export interface DepositReceiptReading {
    isReceipt: boolean;
    amount: number;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    operationNumber: string;
    payerName: string;
    payerCuit: string;
    payerBank: string;
    recipientName: string;
    recipientAlias: string;
    recipientAccount: string; // CBU o CVU
    recipientBank: string;
    notes: string;
}

/** Turno de la clienta, con la seña que pide, lo pagado y el precio (lo calcula n8n al recibir). */
export interface DepositReceiptCandidate {
    appointmentId: string;
    clientName: string;
    date: string;
    time: string;
    treatment: string;
    depositRequired: number;
    paid: number;
    price?: number;
}

export interface DepositReceipt {
    id: string;
    status: DepositReceiptStatus;
    problems: DepositReceiptProblem[];

    // Mensaje de WhatsApp
    messageId: string;
    fromPhone: string; // +549...
    profileName: string;
    messageText: string;
    receivedAt: string; // ISO

    // Archivo (en Firebase Storage)
    fileUrl: string | null;
    filePath: string | null;
    fileMime: string;

    reading: DepositReceiptReading | null;

    // Turno sugerido y los otros turnos del mismo teléfono
    appointmentId: string | null;
    candidates: DepositReceiptCandidate[];

    // Sugerencias de n8n: concepto del pago y cuenta a la que entró
    suggestedLabel?: string; // 'Seña' | 'Saldo' | 'Pago Total'
    suggestedBankAccount?: BankAccount | '';

    // Al confirmar o rechazar
    confirmedAmount?: number;
    paymentId?: string;
    resolvedAt?: string;
    resolvedBy?: string;
    resolvedByName?: string;
    rejectReason?: string;

    createdAt: string;
}
