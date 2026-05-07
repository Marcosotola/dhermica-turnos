import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    Timestamp,
    startAfter,
    limit,
    orderBy,
    startAt,
    endAt,
    QueryDocumentSnapshot,
    DocumentData,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { db } from './config';
import { UserProfile, UserRole } from '../types/user';

const USERS_COLLECTION = 'users';

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Sanitize and format phone number to E.164 standard (+549...)
 * Useful for WhatsApp integration and n8n automations.
 */
export function formatPhone(phone: string): string {
    try {
        // Clean any weird chars but keep + if present
        const cleaned = phone.trim();
        if (!cleaned) return '';

        // If it doesn't start with +, assume AR (+54) for now as default
        const phoneWithContext = cleaned.startsWith('+') ? cleaned : `+54${cleaned}`;

        const phoneNumber = parsePhoneNumber(phoneWithContext, 'AR');

        if (phoneNumber && phoneNumber.isValid()) {
            // Specialized handling for Argentina: WhatsApp requires the '9' prefix for mobile numbers (+54 9 ...)
            if (phoneNumber.country === 'AR') {
                const nationalNumber = phoneNumber.nationalNumber;
                // If it already starts with 9, don't add it again. 
                // libphonenumber-js often includes the mobile prefix 9 in the national number if provided in input.
                if (nationalNumber.startsWith('9')) {
                    return `+54${nationalNumber}`;
                }
                return `+549${nationalNumber}`;
            }
            return phoneNumber.format('E.164');
        }

        // Fallback: just return digits with + prefix
        const digits = cleaned.replace(/\D/g, '');
        return `+${digits}`;
    } catch (error) {
        console.error('Error formatting phone:', error);
        const digits = phone.replace(/\D/g, '');
        return `+${digits}`;
    }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
        ...data,
        uid: uid, // Ensure UID is present
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
    } as UserProfile;
}

export async function createUserProfile(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = Timestamp.now();
    // Split fullName if firstName or lastName are missing for legacy compatibility
    const firstName = profile.firstName || profile.fullName.split(' ')[0] || '';
    const lastName = profile.lastName || profile.fullName.split(' ').slice(1).join(' ') || '';

    await setDoc(doc(db, USERS_COLLECTION, profile.uid), {
        ...profile,
        firstName,
        lastName,
        fullName: profile.fullName || `${firstName} ${lastName}`.trim(),
        phone: formatPhone(profile.phone),
        createdAt: now,
        updatedAt: now,
    });
}


/**
 * Creates a user profile for a manual client (not using Firebase Auth).
 * Generates a unique ID in Firestore.
 */
export async function createManualUserProfile(profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Timestamp.now();
    const userRef = doc(collection(db, USERS_COLLECTION));
    const uid = userRef.id;

    const firstName = profile.firstName || profile.fullName.split(' ')[0] || '';
    const lastName = profile.lastName || profile.fullName.split(' ').slice(1).join(' ') || '';

    await setDoc(userRef, {
        ...profile,
        uid: uid,
        firstName,
        lastName,
        fullName: profile.fullName || `${firstName} ${lastName}`.trim(),
        isManual: true,
        createdAt: now,
        updatedAt: now,
        phone: formatPhone(profile.phone),
    });

    return uid;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const updateData: any = {
        ...data,
        updatedAt: Timestamp.now(),
    };

    // If fullName is provided but firstName/lastName aren't, split it
    if (data.fullName && !data.firstName && !data.lastName) {
        updateData.firstName = data.fullName.split(' ')[0] || '';
        updateData.lastName = data.fullName.split(' ').slice(1).join(' ') || '';
    }
    // If firstName/lastName are provided, ensure fullName is updated
    else if (data.firstName || data.lastName) {
        // We might need the existing profile to get the other part if only one is provided
        const existing = await getUserProfile(uid);
        const fName = data.firstName ?? existing?.firstName ?? existing?.fullName?.split(' ')[0] ?? '';
        const lName = data.lastName ?? existing?.lastName ?? existing?.fullName?.split(' ').slice(1).join(' ') ?? '';
        updateData.fullName = `${fName} ${lName}`.trim();
        updateData.firstName = fName;
        updateData.lastName = lName;
    }

    await updateDoc(doc(db, USERS_COLLECTION, uid), updateData);
}

export async function addFcmToken(uid: string, token: string): Promise<void> {
    await setDoc(doc(db, USERS_COLLECTION, uid), {
        fcmTokens: arrayUnion(token),
        notificationsEnabled: true,
        updatedAt: Timestamp.now(),
    }, { merge: true });
}

export async function clearFcmTokens(uid: string): Promise<void> {
    await setDoc(doc(db, USERS_COLLECTION, uid), {
        fcmTokens: [],
        notificationsEnabled: false,
        updatedAt: Timestamp.now(),
    }, { merge: true });
}

export async function removeFcmToken(uid: string, token: string): Promise<void> {
    await setDoc(doc(db, USERS_COLLECTION, uid), {
        fcmTokens: arrayRemove(token),
        updatedAt: Timestamp.now(),
    }, { merge: true });
}

export async function deleteUserProfile(uid: string): Promise<void> {
    await deleteDoc(doc(db, USERS_COLLECTION, uid));
}

export async function getAllUsers(): Promise<UserProfile[]> {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    return snap.docs.map(d => ({
        ...d.data(),
        uid: d.id, // Ensure UID is present
        createdAt: d.data().createdAt?.toDate(),
        updatedAt: d.data().updatedAt?.toDate(),
    } as UserProfile));
}

export async function getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    const q = query(collection(db, USERS_COLLECTION), where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
        ...d.data(),
        uid: d.id, // Ensure UID is present
        createdAt: d.data().createdAt?.toDate(),
        updatedAt: d.data().updatedAt?.toDate(),
    } as UserProfile));
}

export async function getClientsPaginated(
    lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
    pageSize: number = 20
): Promise<{ users: UserProfile[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    let q = query(
        collection(db, USERS_COLLECTION),
        where('role', '==', 'client'),
        orderBy('fullName'),
        limit(pageSize)
    );

    if (lastDoc) {
        q = query(q, startAfter(lastDoc));
    }

    const snap = await getDocs(q);
    const users = snap.docs.map(d => ({
        ...d.data(),
        uid: d.id,
        createdAt: d.data().createdAt?.toDate(),
        updatedAt: d.data().updatedAt?.toDate(),
    } as UserProfile));

    return {
        users,
        lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
    };
}

export async function searchClients(term: string): Promise<UserProfile[]> {
    // Note: Firestore search is case-sensitive and prefix-based by default.
    // For a better search, use Algolia/Elasticsearch or a designated lowercase search field.
    // Here we assume standard capitalization or simple prefix match.

    // We try to match by name prefix
    const qName = query(
        collection(db, USERS_COLLECTION),
        where('role', '==', 'client'),
        orderBy('fullName'),
        startAt(term),
        endAt(term + '\uf8ff'),
        limit(20)
    );

    const snap = await getDocs(qName);
    return snap.docs.map(d => ({
        ...d.data(),
        uid: d.id,
        createdAt: d.data().createdAt?.toDate(),
        updatedAt: d.data().updatedAt?.toDate(),
    } as UserProfile));
}
