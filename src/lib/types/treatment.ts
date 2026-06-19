export type TreatmentCategory = 'Facial' | 'Corporal' | 'Depilación' | 'Manos' | 'Pies' | 'Aparatología' | 'Cejas' | 'Pestañas';

export interface TreatmentPrice {
    zone: string;
    gender?: 'male' | 'female' | 'both';
    price: number;
    duration?: number; // in minutes
}

export interface CancellationPolicy {
    hoursBeforeToCancel: number;
    forfeitDeposit: boolean;
}

export interface Treatment {
    id: string;
    name: string;
    shortDescription: string;
    fullDescription?: string;
    category: TreatmentCategory;
    prices: TreatmentPrice[];
    contraindications?: string[];
    benefits?: string[];
    results?: string[];
    preCare?: string[];
    postCare?: string[];
    imageUrl?: string;
    cancellationPolicy?: CancellationPolicy;
    depositAmount?: number; // monto fijo de seña para reserva online (0 = sin seña)
    createdAt?: Date;
    updatedAt?: Date;
}
