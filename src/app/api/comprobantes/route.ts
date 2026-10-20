import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, timingSafeEqual } from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { adminDb } from '@/lib/firebase/admin';
import { AVISOS_SECRET_HEADER } from '@/lib/notifications/avisos';
import { BANK_ACCOUNTS, BankAccount } from '@/lib/types/bankAccount';
import type {
    DepositReceipt,
    DepositReceiptCandidate,
    DepositReceiptProblem,
    DepositReceiptReading,
} from '@/lib/types/depositReceipt';

const COLLECTION = 'depositReceipts';
const PROBLEMS: DepositReceiptProblem[] = ['no_leido', 'sin_turno', 'destinatario', 'monto', 'ya_pagada', 'fecha', 'repetido'];
const EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
};
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const LABELS = ['Seña', 'Saldo', 'Pago Total', 'Pago Parcial'];
const ACCOUNTS: BankAccount[] = BANK_ACCOUNTS.map(a => a.value);

function hasValidSecret(req: NextRequest): boolean {
    const expected = process.env.N8N_AVISOS_SECRET;
    const received = req.headers.get(AVISOS_SECRET_HEADER);
    if (!expected || !received) return false;
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);

function parseReading(r: any): DepositReceiptReading | null {
    if (!r || typeof r !== 'object') return null;
    return {
        isReceipt: r.isReceipt === true,
        amount: num(r.amount),
        date: str(r.date, 10),
        time: str(r.time, 5),
        operationNumber: str(r.operationNumber, 60),
        payerName: str(r.payerName, 120),
        payerCuit: str(r.payerCuit, 20),
        payerBank: str(r.payerBank, 80),
        recipientName: str(r.recipientName, 120),
        recipientAlias: str(r.recipientAlias, 60),
        recipientAccount: str(r.recipientAccount, 30),
        recipientBank: str(r.recipientBank, 80),
        notes: str(r.notes, 500),
    };
}

function parseCandidates(list: unknown): DepositReceiptCandidate[] {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 10).map((c: any) => ({
        appointmentId: str(c?.appointmentId, 100),
        clientName: str(c?.clientName, 120),
        date: str(c?.date, 10),
        time: str(c?.time, 5),
        treatment: str(c?.treatment, 200),
        depositRequired: num(c?.depositRequired),
        paid: num(c?.paid),
        price: num(c?.price),
    })).filter(c => c.appointmentId);
}

/** Guarda el archivo en Storage con un token de descarga (el mismo formato que usa getDownloadURL). */
async function saveFile(docId: string, file: any): Promise<{ url: string; path: string } | null> {
    const mime = str(file?.mime, 50);
    const ext = EXTENSIONS[mime];
    if (!ext || typeof file?.base64 !== 'string') return null;

    const buffer = Buffer.from(file.base64, 'base64');
    if (!buffer.length || buffer.length > MAX_FILE_BYTES) return null;

    const bucket = getStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const path = `deposit-receipts/${docId}.${ext}`;
    const token = randomUUID();
    await bucket.file(path).save(buffer, {
        contentType: mime,
        metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    return { url, path };
}

/**
 * Recibe de n8n un comprobante de pago (seña, saldo o total) ya leído por la IA y lo guarda como "por confirmar".
 * Solo acepta pedidos con la misma clave secreta que usa la app para mandarle avisos a n8n.
 * Si el mismo mensaje llega dos veces (reintentos de YCloud o de n8n), no lo duplica.
 */
export async function POST(req: NextRequest) {
    if (!hasValidSecret(req)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    let body: Record<string, any>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const messageId = str(body.messageId, 200);
    if (!messageId) {
        return NextResponse.json({ error: 'Falta messageId' }, { status: 400 });
    }

    const docId = messageId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 150);
    const ref = adminDb.collection(COLLECTION).doc(docId);
    if ((await ref.get()).exists) {
        return NextResponse.json({ ok: true, id: docId, alreadyExisted: true });
    }

    const reading = parseReading(body.reading);
    const problems = new Set<DepositReceiptProblem>(
        (Array.isArray(body.problems) ? body.problems : []).filter((p: any) => PROBLEMS.includes(p))
    );

    if (reading?.operationNumber) {
        const same = await adminDb.collection(COLLECTION)
            .where('reading.operationNumber', '==', reading.operationNumber)
            .limit(1)
            .get();
        if (!same.empty) problems.add('repetido');
    }

    let file: { url: string; path: string } | null = null;
    try {
        file = await saveFile(docId, body.file);
    } catch (error) {
        // Sin archivo igual se guarda: la secretaria puede verlo en el WhatsApp
        console.error('[comprobantes] No se pudo guardar el archivo en Storage:', error);
    }

    const candidates = parseCandidates(body.candidates);
    const appointmentId = str(body.appointmentId, 100);

    const receipt: Omit<DepositReceipt, 'id'> = {
        status: 'pending',
        problems: [...problems],
        messageId,
        fromPhone: str(body.fromPhone, 30),
        profileName: str(body.profileName, 120),
        messageText: str(body.messageText, 1000),
        receivedAt: str(body.receivedAt, 40) || new Date().toISOString(),
        fileUrl: file?.url || null,
        filePath: file?.path || null,
        fileMime: str(body.file?.mime, 50),
        reading,
        appointmentId: candidates.some(c => c.appointmentId === appointmentId) ? appointmentId : null,
        candidates,
        suggestedLabel: LABELS.includes(body.suggestedLabel) ? body.suggestedLabel : 'Seña',
        suggestedBankAccount: ACCOUNTS.includes(body.suggestedBankAccount) ? body.suggestedBankAccount : '',
        createdAt: new Date().toISOString(),
    };

    await ref.set(receipt);
    return NextResponse.json({ ok: true, id: docId, problems: receipt.problems, file: !!file });
}
