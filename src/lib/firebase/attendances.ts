import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Attendance } from '../types/attendance';

const COLLECTION = 'attendances';

function mapAttendance(id: string, data: any): Attendance {
    return {
        id,
        professionalId: data.professionalId,
        date: data.date,
        amount: Number(data.amount) || 0,
        note: data.note,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        createdBy: data.createdBy,
    };
}

export async function createAttendance(
    data: Omit<Attendance, 'id' | 'createdAt'>
): Promise<string> {
    const payload: Record<string, unknown> = {
        professionalId: data.professionalId,
        date: data.date,
        amount: data.amount,
        createdAt: Timestamp.now(),
    };
    if (data.note !== undefined) payload.note = data.note;
    if (data.createdBy !== undefined) payload.createdBy = data.createdBy;

    const ref = await addDoc(collection(db, COLLECTION), payload);
    return ref.id;
}

export async function deleteAttendance(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
}

export async function getAttendancesByProfessional(professionalId: string): Promise<Attendance[]> {
    const q = query(
        collection(db, COLLECTION),
        where('professionalId', '==', professionalId),
        orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => mapAttendance(d.id, d.data()));
}

export async function getAttendancesByDateRange(startDate: string, endDate: string): Promise<Attendance[]> {
    const q = query(
        collection(db, COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => mapAttendance(d.id, d.data()));
}
