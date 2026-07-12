import {
    collection,
    getDocs,
    query,
    orderBy,
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
    targetUserName?: string;
}

const NOTIFICATIONS_COLLECTION = 'notifications';

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
