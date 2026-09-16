export type AparatoTreatment = 'Definitiva' | 'HiFu' | 'Liposonix';

export const APARATO_TREATMENTS: AparatoTreatment[] = ['Definitiva', 'HiFu', 'Liposonix'];

export interface AparatoSession {
    id: string;
    date: string; // YYYY-MM-DD
    treatment: AparatoTreatment;
    professionalId: string;
    professionalName: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
