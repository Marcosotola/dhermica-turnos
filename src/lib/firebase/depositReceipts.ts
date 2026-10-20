import {
    collection,
    doc,
    onSnapshot,
    query,
    runTransaction,
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from './config';
import { BankAccount } from '../types/bankAccount';
import { DepositReceipt } from '../types/depositReceipt';

const COLLECTION = 'depositReceipts';

/** Escucha en vivo los comprobantes por confirmar (los guarda n8n vía /api/comprobantes). */
export function subscribePendingDepositReceipts(
    onChange: (receipts: DepositReceipt[]) => void,
    onError?: (error: Error) => void
): () => void {
    const q = query(collection(db, COLLECTION), where('status', '==', 'pending'));
    return onSnapshot(
        q,
        snap => {
            const receipts = snap.docs
                .map(d => ({ id: d.id, ...d.data() }) as DepositReceipt)
                .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
            onChange(receipts);
        },
        error => onError?.(error)
    );
}

interface ResolvedBy {
    uid: string;
    name: string;
}

/**
 * Carga el pago en el turno y marca el comprobante como confirmado, todo junto (si alguien
 * ya lo resolvió desde otra pantalla, no se carga dos veces).
 */
export async function confirmDepositReceipt(
    receiptId: string,
    data: { appointmentId: string; amount: number; date: string; bankAccount: BankAccount; label: string },
    by: ResolvedBy
): Promise<void> {
    const receiptRef = doc(db, COLLECTION, receiptId);
    const appointmentRef = doc(db, 'appointments', data.appointmentId);

    await runTransaction(db, async tx => {
        const receiptSnap = await tx.get(receiptRef);
        const appointmentSnap = await tx.get(appointmentRef);
        if (!receiptSnap.exists() || receiptSnap.data().status !== 'pending') {
            throw new Error('Este comprobante ya fue resuelto');
        }
        if (!appointmentSnap.exists()) {
            throw new Error('No se encontró el turno');
        }

        const payment = {
            id: Math.random().toString(36).substring(2, 9),
            amount: data.amount,
            method: 'transfer',
            label: data.label,
            bankAccount: data.bankAccount,
            date: data.date,
            receiptId,
            createdAt: new Date().toISOString(),
        };
        const payments = appointmentSnap.data().payments || [];

        tx.update(appointmentRef, { payments: [...payments, payment], updatedAt: Timestamp.now() });
        tx.update(receiptRef, {
            status: 'confirmed',
            appointmentId: data.appointmentId,
            confirmedAmount: data.amount,
            paymentId: payment.id,
            resolvedAt: new Date().toISOString(),
            resolvedBy: by.uid,
            resolvedByName: by.name,
        });
    });
}

/** Descarta el comprobante sin cargar nada (la plata no entró, no era un comprobante, etc.). */
export async function rejectDepositReceipt(receiptId: string, reason: string, by: ResolvedBy): Promise<void> {
    await updateDoc(doc(db, COLLECTION, receiptId), {
        status: 'rejected',
        rejectReason: reason,
        resolvedAt: new Date().toISOString(),
        resolvedBy: by.uid,
        resolvedByName: by.name,
    });
}
