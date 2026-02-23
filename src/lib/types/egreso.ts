export type EgresoCategory =
    | 'impuestos'
    | 'insumos'
    | 'alquiler'
    | 'mercaderia'
    | 'sueldos'
    | 'mantenimiento'
    | 'publicidad'
    | 'otros';

export const EGRESO_CATEGORIES: { value: EgresoCategory; label: string }[] = [
    { value: 'impuestos', label: 'Impuestos y Servicios' },
    { value: 'insumos', label: 'Insumos y Materiales' },
    { value: 'alquiler', label: 'Alquiler del Local' },
    { value: 'mercaderia', label: 'Mercadería' },
    { value: 'sueldos', label: 'Sueldos' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
    { value: 'publicidad', label: 'Publicidad' },
    { value: 'otros', label: 'Otros' },
];

export const EGRESO_CATEGORY_LABEL: Record<EgresoCategory, string> = {
    impuestos: 'Impuestos y Servicios',
    insumos: 'Insumos y Materiales',
    alquiler: 'Alquiler del Local',
    mercaderia: 'Mercadería',
    sueldos: 'Sueldos',
    mantenimiento: 'Mantenimiento',
    publicidad: 'Publicidad',
    otros: 'Otros',
};

export const EGRESO_CATEGORY_COLOR: Record<EgresoCategory, string> = {
    impuestos: 'bg-red-100 text-red-700 border-red-200',
    insumos: 'bg-orange-100 text-orange-700 border-orange-200',
    alquiler: 'bg-purple-100 text-purple-700 border-purple-200',
    mercaderia: 'bg-blue-100 text-blue-700 border-blue-200',
    sueldos: 'bg-green-100 text-green-700 border-green-200',
    mantenimiento: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    publicidad: 'bg-pink-100 text-pink-700 border-pink-200',
    otros: 'bg-gray-100 text-gray-700 border-gray-200',
};

export interface Egreso {
    id: string;
    date: string; // YYYY-MM-DD
    category: EgresoCategory;
    amount: number;
    description?: string;
    paymentMethod: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    createdAt: Date;
    updatedAt: Date;
}
