export interface Exception {
    date: string; // YYYY-MM-DD
    type: 'absence' | 'extra';
    start?: string;
    end?: string;
    note?: string;
    services?: string[];
}

export interface ProfessionalPrice {
    treatmentId: string;
    treatmentName: string;
    zone?: string;
    gender?: 'male' | 'female' | 'both';
    price: number;
}

export interface Professional {
    id: string;
    userId?: string; // UID del usuario en la colección users (opcional para legacy)
    name: string;
    color: string; // Color hex para identificación visual
    active: boolean;
    createdAt: Date;
    order: number; // Para ordenar las columnas
    legacyCollectionName?: string; // Nombre de la colección antigua (ej: turnosLuciana)
    // Tipo de personal: 'tratamiento' (default, hace turnos y cobra comisión) o 'apoyo'
    // (secretaria, limpieza: no hace turnos, cobra por día trabajado vía `dailyRate`)
    type?: 'tratamiento' | 'apoyo';
    dailyRate?: number; // Tarifa por día trabajado, solo aplica si type === 'apoyo'
    serviceCommissionMode?: 'percentage' | 'fixed';
    serviceCommissionPercentage?: number;
    productCommissionPercentage?: number;
    professionalPrices?: ProfessionalPrice[];
    services?: string[]; // IDs o nombres de tratamientos que realiza
    workingHours?: {
        [key: string]: { // key is day index 0-6 or name
            start: string;
            end: string;
            lunchStart?: string;
            lunchEnd?: string;
            enabled: boolean;
        }
    };
    exceptions?: Exception[];
}

export const DEFAULT_PROFESSIONALS: Omit<Professional, 'id' | 'createdAt'>[] = [
    { name: 'Luciana', color: '#8B5CF6', active: true, order: 1 },
    { name: 'Gisela', color: '#EC4899', active: true, order: 2 },
];
