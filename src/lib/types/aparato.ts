export type AparatoTreatment = 'Definitiva' | 'HiFu' | 'Liposonix';

export const APARATO_TREATMENTS: AparatoTreatment[] = ['Definitiva', 'HiFu', 'Liposonix'];

export interface AparatoPayment {
    id: string;
    method: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    amount: number;
    bankAccount?: 'cuenta1' | 'cuenta2' | null;
}

export interface AparatoSession {
    id: string;
    date: string; // YYYY-MM-DD
    treatment: AparatoTreatment;
    professionalId: string;
    professionalName: string;
    status: 'pending' | 'completed';
    fixedFee?: number; // Monto total que cobra el profesional ese día (suma de payments)
    payments?: AparatoPayment[]; // Desglose de pagos por método
    paymentMethod?: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr'; // legacy/fallback (primer pago)
    bankAccount?: 'cuenta1' | 'cuenta2' | null; // legacy/fallback
    expenseId?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
