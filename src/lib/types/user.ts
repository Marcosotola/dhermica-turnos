export type UserRole = 'admin' | 'professional' | 'secretary' | 'client' | 'cliente-prueba' | 'promotor' | 'contador';

export function isClientRole(role: string | undefined): boolean {
    return role === 'client' || role === 'cliente-prueba';
}

export interface UserProfile {
    uid: string;
    email: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    birthDate?: string; // ISO format YYYY-MM-DD
    phone: string; // Formato E.164, ej: +5493523908198
    hasTattoos: boolean;
    isPregnant: boolean;
    sex: 'male' | 'female';
    relevantMedicalInfo: string; // Allergies/Diseases
    role: UserRole;
    isManual?: boolean;
    fcmTokens?: string[]; // Multiple tokens for different devices
    notificationsEnabled?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
