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

import { formatPhone } from '../utils/phone';
import { sameName } from '../utils/clientMatch';
import { toast } from 'sonner';

// Se reexporta para no romper los imports existentes desde '@/lib/firebase/users'
export { formatPhone };

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

export async function getUserByPhone(phone: string): Promise<UserProfile | null> {
    const formatted = formatPhone(phone);
    const q = query(collection(db, USERS_COLLECTION), where('phone', '==', formatted), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    
    const d = snap.docs[0];
    const data = d.data();
    return {
        ...data,
        uid: d.id,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
    } as UserProfile;
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
    const q = query(collection(db, USERS_COLLECTION), where('email', '==', email.toLowerCase().trim()), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0];
    const data = d.data();
    return {
        ...data,
        uid: d.id,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
    } as UserProfile;
}

/**
 * Busca una ficha que ya exista para este cliente: por email (si es real) o por teléfono.
 * Si devuelve 'phone-other-name', puede ser un familiar que comparte el teléfono.
 */
export async function findDuplicateClient(
    fullName: string,
    phone: string,
    email: string
): Promise<{ profile: UserProfile; reason: 'email' | 'phone-same-name' | 'phone-other-name' } | null> {
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail && !cleanEmail.endsWith('@dhermica.internal')) {
        const byEmail = await getUserByEmail(cleanEmail);
        if (byEmail) return { profile: byEmail, reason: 'email' };
    }
    if (phone.replace(/\D/g, '').length >= 8) {
        const q = query(collection(db, USERS_COLLECTION), where('phone', '==', formatPhone(phone)));
        const snap = await getDocs(q);
        const samePhone = snap.docs.map(d => ({ ...d.data(), uid: d.id }) as UserProfile);
        const same = samePhone.find(p => sameName(p.fullName, fullName));
        if (same) return { profile: same, reason: 'phone-same-name' };
        if (samePhone.length > 0) return { profile: samePhone[0], reason: 'phone-other-name' };
    }
    return null;
}

/**
 * Para los formularios de "nuevo cliente": avisa si ya existe la ficha.
 * Devuelve true si se puede crear la ficha nueva.
 */
export async function canCreateClient(fullName: string, phone: string, email: string): Promise<boolean> {
    const dup = await findDuplicateClient(fullName, phone, email);
    if (!dup) return true;
    if (dup.reason === 'phone-other-name') {
        return window.confirm(`Ya existe la ficha de ${dup.profile.fullName} con ese teléfono. ¿Crear igual una ficha nueva para ${fullName}?`);
    }
    const dato = dup.reason === 'email' ? 'ese email' : 'ese teléfono';
    toast.error(`Ya existe la ficha de ${dup.profile.fullName} con ${dato}. Buscala en la lista de clientes.`);
    return false;
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
