export type TreatmentCategory = 'Facial' | 'Corporal' | 'Depilación' | 'Manos' | 'Pies' | 'Aparatología' | 'Cejas' | 'Pestañas';

export interface TreatmentPrice {
    zone: string;
    gender?: 'male' | 'female' | 'both';
    price: number;
    duration?: number; // in minutes
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
    createdAt?: Date;
    updatedAt?: Date;
}
