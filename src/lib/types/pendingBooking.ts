export type PendingBookingStatus = 'pending_payment' | 'confirmed' | 'expired' | 'failed';

export interface DepositBreakdown {
    giftCardId?: string;
    giftCardCode?: string;
    giftCardAmount?: number;
    clientCreditId?: string;
    clientCreditAmount?: number;
    mercadopagoAmount: number; // lo que efectivamente va a MP (puede ser 0)
}

export interface BookingSlot {
    treatmentIds: string[];
    treatmentNames: string[];
    zones: string[];
    professionalId: string;
    professionalName: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    durationMinutes: number;
    estimatedPrice: number;
}

export interface PendingBooking {
    id: string;
    clientId: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;

    slots: BookingSlot[]; // un slot por profesional (multi-profesional soportado)

    totalDurationMinutes: number;
    totalEstimatedPrice: number;
    depositAmount: number;

    depositBreakdown: DepositBreakdown;

    status: PendingBookingStatus;

    mercadopagoPreferenceId?: string;
    mercadopagoPaymentId?: string;
    mercadopagoExternalReference?: string; // igual al id del pendingBooking, para el webhook

    confirmedAppointmentIds?: string[]; // se completa cuando el pago se confirma

    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
