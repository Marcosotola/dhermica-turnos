// Comprobantes de seña que las clientas mandan por WhatsApp. n8n los lee con IA, busca el
// turno por el teléfono que envía y los guarda acá como "por confirmar": el pago recién se
// carga en el turno cuando la secretaria lo confirma mirando el banco.

export type DepositReceiptStatus = 'pending' | 'confirmed' | 'rejected';

// Motivos por los que conviene mirar el comprobante con más atención (o asignarlo a mano)
export type DepositReceiptProblem =
    | 'no_leido'      // la IA no pudo leer el archivo
    | 'sin_turno'     // el teléfono que envía no tiene turnos próximos
    | 'destinatario'  // la transferencia no es a la cuenta de Dhermica
    | 'monto'         // el monto no alcanza para la seña que falta
    | 'ya_pagada'     // el turno ya tenía la seña cargada
    | 'fecha'         // la transferencia es vieja o tiene una fecha rara
    | 'repetido';     // ya llegó un comprobante con el mismo número de operación

export const DEPOSIT_RECEIPT_PROBLEM_LABELS: Record<DepositReceiptProblem, string> = {
    no_leido: 'No se pudo leer el comprobante',
    sin_turno: 'El número no tiene turnos próximos',
    destinatario: 'La transferencia no es a la cuenta de Dhermica',
    monto: 'El monto no alcanza para la seña',
    ya_pagada: 'El turno ya tenía la seña cargada',
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

/** Turno próximo de la clienta, con lo que falta de seña (lo calcula n8n al recibir). */
export interface DepositReceiptCandidate {
    appointmentId: string;
    clientName: string;
    date: string;
    time: string;
    treatment: string;
    depositRequired: number;
    paid: number;
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

    // Turno sugerido y los otros turnos próximos del mismo teléfono
    appointmentId: string | null;
    candidates: DepositReceiptCandidate[];

    // Al confirmar o rechazar
    confirmedAmount?: number;
    paymentId?: string;
    resolvedAt?: string;
    resolvedBy?: string;
    resolvedByName?: string;
    rejectReason?: string;

    createdAt: string;
}
