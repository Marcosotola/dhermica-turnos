export type GiftCardStatus = 'active' | 'partially_used' | 'redeemed' | 'cancelled' | 'expired';

export interface GiftCardRedemption {
    appointmentId: string;
    amount: number;
    date: string; // YYYY-MM-DD
    redeemedBy?: string;
    recipientClientId?: string;
    recipientName?: string;
}

export interface GiftCard {
    id: string;
    code: string;

    // Montos
    originalAmount: number;
    remainingBalance: number;

    // Comprador (puede no estar registrado)
    purchaserClientId?: string;
    purchaserName: string;

    // Destinatario (referencia, sin ID obligatorio)
    recipientName?: string;
    recipientClientId?: string; // se setea al primer uso si el cliente está registrado

    // Mensaje personalizado
    message?: string;

    // Pago de la gift card
    purchaseMethod?: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    bankAccount?: 'cuenta1' | 'cuenta2' | null;

    status: GiftCardStatus;
    expiryDate?: string; // YYYY-MM-DD — default: purchaseDate + 60 días

    // Historial de usos
    redemptions: GiftCardRedemption[];

    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
}
