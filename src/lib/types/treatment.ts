// Las categorías se gestionan en la colección `treatment_categories` (admin y secretaria).
// Cada tratamiento guarda el nombre de su categoría.
export type TreatmentCategory = string;

export interface TreatmentCategoryDoc {
    id: string;
    name: string;
    order: number;
}

// Se usan para inicializar la colección la primera vez y como respaldo si todavía está vacía
export const DEFAULT_TREATMENT_CATEGORIES: TreatmentCategory[] = [
    'Facial', 'Corporal', 'Aparatología', 'Depilación', 'Manos', 'Pies', 'Cejas', 'Pestañas', 'Plasma', 'Botox', 'Peluquería', 'Nutrición',
];

// Categorías gestionadas (o las predeterminadas si no hay ninguna) + las que usan tratamientos
// y no estén en la lista, sin duplicados ignorando mayúsculas
export function getTreatmentCategories(
    treatments: { category?: TreatmentCategory }[],
    managed: TreatmentCategory[] = [],
): TreatmentCategory[] {
    const result = managed.length > 0 ? [...managed] : [...DEFAULT_TREATMENT_CATEGORIES];
    const seen = new Set(result.map(c => c.toLowerCase()));
    treatments.forEach(t => {
        const cat = t.category?.trim();
        if (cat && !seen.has(cat.toLowerCase())) {
            seen.add(cat.toLowerCase());
            result.push(cat);
        }
    });
    return result;
}

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
