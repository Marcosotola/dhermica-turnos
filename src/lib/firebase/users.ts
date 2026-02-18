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
    DocumentData
} from 'firebase/firestore';
import { db } from './config';
import { UserProfile, UserRole } from '../types/user';

const USERS_COLLECTION = 'users';

/**
 * Sanitize phone number to format (XXXXXXXXXX)
 */
export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    // If it starts with 54, remove it (assuming Argentina)
    let digits = cleaned;
    if (digits.startsWith('54')) {
        digits = digits.substring(2);
    }
    // Remove 0 and 15
    if (digits.startsWith('0')) digits = digits.substring(1);
    if (digits.startsWith('15')) digits = digits.substring(2);

    return `(${digits})`;
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
    await setDoc(doc(db, USERS_COLLECTION, profile.uid), {
        ...profile,
        phone: formatPhone(profile.phone),
        createdAt: now,
        updatedAt: now,
    });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    await updateDoc(doc(db, USERS_COLLECTION, uid), {
        ...data,
        updatedAt: Timestamp.now(),
    });
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
