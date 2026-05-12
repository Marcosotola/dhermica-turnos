'use server';

import * as admin from 'firebase-admin';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { UserProfile, UserRole } from '@/lib/types/user';

export async function adminCreateUser(formData: any) {
    try {
        const {
            email,
            password,
            firstName,
            lastName,
            birthDate,
            phone,
            hasTattoos,
            sex,
            isPregnant,
            relevantMedicalInfo,
            wantNotifications,
            role = 'client'
        } = formData;

        // 1. Create User in Firebase Auth
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: `${firstName} ${lastName}`.trim(),
            phoneNumber: phone || undefined,
        });

        const uid = userRecord.uid;
        const fullName = `${firstName} ${lastName}`.trim();

        // 2. Create User Profile in Firestore
        const now = admin.firestore.Timestamp.now();
        const profile: any = {
            uid,
            email,
            fullName,
            firstName,
            lastName,
            birthDate: birthDate || '',
            phone: phone || '',
            hasTattoos,
            sex: sex as 'male' | 'female',
            isPregnant: sex === 'male' ? false : isPregnant,
            relevantMedicalInfo: relevantMedicalInfo || '',
            role: role as UserRole,
            notificationsEnabled: wantNotifications,
            createdAt: now,
            updatedAt: now,
        };

        await adminDb.collection('users').doc(uid).set(profile);

        return { success: true, uid };
    } catch (error: any) {
        console.error('Error in adminCreateUser:', error);
        return { 
            success: false, 
            error: error.message,
            code: error.code
        };
    }
}
