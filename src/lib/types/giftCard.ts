export type GiftCardStatus = 'active' | 'redeemed' | 'cancelled';

export interface GiftCard {
    id: string;
    code: string;
    amount: number;
    purchaseMethod?: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    bankAccount?: 'cuenta1' | 'cuenta2' | null;
    clientId?: string;
    clientName?: string;
    purchasedByName?: string;
    status: GiftCardStatus;
    expiryDate?: string; // YYYY-MM-DD
    redeemedInAppointmentId?: string;
    redeemedDate?: string; // YYYY-MM-DD
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
}
