import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    Timestamp,
    runTransaction,
} from 'firebase/firestore';
import { db } from './config';
import { ClientCredit } from '../types/clientCredit';

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

// Marks a credit as used. If amountUsed < credit.amount, creates a new available credit for the remainder.
export async function useCredit(
    creditId: string,
    amountUsed: number,
    appointmentId: string,
    usedDate: string,
): Promise<void> {
    const creditRef = doc(db, COLLECTION, creditId);

    // Transaccional: marcar como usado y crear el residual (si lo hay) tienen que
    // pasar juntos — si uno fallara suelto, se podía perder el saldo residual del cliente.
    // También evita que el mismo crédito se use dos veces por una carrera de escrituras.
    await runTransaction(db, async (tx) => {
        const snap = await tx.get(creditRef);
        if (!snap.exists()) return;

        const data = snap.data();
        if (data.status !== 'available') return;

        const originalAmount = data.amount as number;

        tx.update(creditRef, {
            status: 'used',
            usedInAppointmentId: appointmentId,
            usedDate,
            updatedAt: Timestamp.now(),
        });

        if (originalAmount > amountUsed) {
            const now = Timestamp.now();
            const residualRef = doc(collection(db, COLLECTION));
            tx.set(residualRef, {
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
    });
}

export async function deleteClientCredit(creditId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, creditId));
}
