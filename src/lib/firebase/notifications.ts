import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    where,
    Timestamp,
    doc,
    deleteDoc,
    limit
} from 'firebase/firestore';
import { db } from './config';

export interface NotificationRecord {
    id?: string;
    title: string;
    body: string;
    sentAt: Date;
    sentBy: string; // admin/secretary UID
    type: 'broadcast' | 'targeted';
    targetUserId?: string;
}

const NOTIFICATIONS_COLLECTION = 'notifications';

export async function createNotificationRecord(notification: Omit<NotificationRecord, 'id' | 'sentAt'>): Promise<string> {
    // Clean undefined values to prevent Firestore crash
    const cleanData = Object.entries(notification).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value;
        return acc;
    }, {} as any);

    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
        ...cleanData,
        sentAt: Timestamp.now(),
    });
    return docRef.id;
}

export async function getNotificationHistory(maxResults: number = 50): Promise<NotificationRecord[]> {
    const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        orderBy('sentAt', 'desc'),
        limit(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
        sentAt: d.data().sentAt?.toDate(),
    } as NotificationRecord));
}

export async function deleteNotificationRecord(id: string): Promise<void> {
    await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, id));
}

export async function deleteMultipleNotificationRecords(ids: string[]): Promise<void> {
    const promises = ids.map(id => deleteNotificationRecord(id));
    await Promise.all(promises);
}
