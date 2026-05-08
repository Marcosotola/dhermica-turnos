import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    query,
    where,
    getDocs,
    Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { ClientCredit, ClientCreditStatus, ClientCreditReason } from '../types/clientCredit';

const COLLECTION = 'clientCredits';

function mapCredit(id: string, data: any): ClientCredit {
    return {
        id,
        clientId: data.clientId || '',
        clientName: data.clientName || '',
        amount: data.amount || 0,
        reason: data.reason || 'manual',
        status: data.status || 'available',
        sourceAppointmentId: data.sourceAppointmentId,
        sourceAppointmentDate: data.sourceAppointmentDate,
        sourceTreatmentName: data.sourceTreatmentName,
        usedInAppointmentId: data.usedInAppointmentId,
        usedDate: data.usedDate,
        notes: data.notes,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        createdBy: data.createdBy,
    };
}

export async function createClientCredit(
    data: Omit<ClientCredit, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const now = Timestamp.now();
    const payload: Record<string, unknown> = { createdAt: now, updatedAt: now };
    for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) payload[k] = v;
    }
    const ref = await addDoc(collection(db, COLLECTION), payload);
    return ref.id;
}

export async function getClientCredits(
    clientId: string,
    clientName: string
): Promise<ClientCredit[]> {
    const map = new Map<string, ClientCredit>();

    if (clientId && !clientId.startsWith('legacy-')) {
        const q = query(collection(db, COLLECTION), where('clientId', '==', clientId));
        const snap = await getDocs(q);
        snap.docs.forEach(d => map.set(d.id, mapCredit(d.id, d.data())));
    }

    if (clientName) {
        const q = query(collection(db, COLLECTION), where('clientName', '==', clientName));
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
            if (!map.has(d.id)) map.set(d.id, mapCredit(d.id, d.data()));
        });
    }

    return Array.from(map.values()).sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
}

export async function updateCreditStatus(
    creditId: string,
    status: ClientCreditStatus,
    extra?: { usedInAppointmentId?: string; usedDate?: string }
): Promise<void> {
    await updateDoc(doc(db, COLLECTION, creditId), {
        status,
        ...extra,
        updatedAt: Timestamp.now(),
    });
}

// Marks a credit as used. If amountUsed < credit.amount, creates a new available credit for the remainder.
export async function useCredit(
    creditId: string,
    amountUsed: number,
    appointmentId: string,
    usedDate: string,
): Promise<void> {
    const creditRef = doc(db, COLLECTION, creditId);
    const snap = await getDoc(creditRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const originalAmount = data.amount as number;

    await updateDoc(creditRef, {
        status: 'used',
        usedInAppointmentId: appointmentId,
        usedDate,
        updatedAt: Timestamp.now(),
    });

    if (originalAmount > amountUsed) {
        const now = Timestamp.now();
        await addDoc(collection(db, COLLECTION), {
            clientId: data.clientId,
            clientName: data.clientName,
            amount: originalAmount - amountUsed,
            reason: data.reason,
            status: 'available',
            sourceAppointmentId: data.sourceAppointmentId,
            sourceAppointmentDate: data.sourceAppointmentDate,
            sourceTreatmentName: data.sourceTreatmentName,
            notes: 'Saldo residual de uso parcial de crédito',
            createdAt: now,
            updatedAt: now,
        });
    }
}

export async function deleteClientCredit(creditId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, creditId));
}

export async function deleteClientCreditsBySourceAppointment(appointmentId: string): Promise<void> {
    const q = query(collection(db, COLLECTION), where('sourceAppointmentId', '==', appointmentId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}

export async function restoreCreditsUsedInAppointment(appointmentId: string): Promise<void> {
    const q = query(collection(db, COLLECTION), where('usedInAppointmentId', '==', appointmentId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d =>
        updateDoc(d.ref, {
            status: 'available',
            usedInAppointmentId: null,
            usedDate: null,
            updatedAt: Timestamp.now(),
        })
    ));
}
