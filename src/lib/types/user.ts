export type UserRole = 'admin' | 'professional' | 'secretary' | 'client';

export interface UserProfile {
    uid: string;
    email: string;
    fullName: string;
    birthDate: string; // ISO format YYYY-MM-DD
    phone: string; // Format: (3523908198)
    hasTattoos: boolean;
    isPregnant: boolean;
    sex: 'male' | 'female';
    relevantMedicalInfo: string; // Allergies/Diseases
    role: UserRole;
    fcmTokens?: string[]; // Multiple tokens for different devices
    notificationsEnabled?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
