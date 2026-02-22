export type AparatoTreatment = 'Definitiva' | 'HiFu' | 'Liposonix';

export const APARATO_TREATMENTS: AparatoTreatment[] = ['Definitiva', 'HiFu', 'Liposonix'];

export interface AparatoSession {
    id: string;
    date: string; // YYYY-MM-DD
    treatment: AparatoTreatment;
    professionalId: string;
    professionalName: string;
    fixedFee: number; // Monto fijo que cobra el profesional ese día
    paymentMethod: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
