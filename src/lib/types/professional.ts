export interface Professional {
    id: string;
    userId?: string; // UID del usuario en la colección users (opcional para legacy)
    name: string;
    color: string; // Color hex para identificación visual
    active: boolean;
    createdAt: Date;
    order: number; // Para ordenar las columnas
    legacyCollectionName?: string; // Nombre de la colección antigua (ej: turnosLuciana)
    serviceCommissionPercentage?: number;
    productCommissionPercentage?: number;
}

export const DEFAULT_PROFESSIONALS: Omit<Professional, 'id' | 'createdAt'>[] = [
    { name: 'Luciana', color: '#8B5CF6', active: true, order: 1 },
    { name: 'Gisela', color: '#EC4899', active: true, order: 2 },
];
