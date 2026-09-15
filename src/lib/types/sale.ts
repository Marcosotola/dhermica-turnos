import { Timestamp } from 'firebase/firestore';
import { BankAccount } from './bankAccount';

export interface SalePayment {
    id: string;
    amount: number;
    method: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    date: string; // YYYY-MM-DD
    label: string;
    bankAccount?: BankAccount | null;
    createdAt: Date;
}

export interface Sale {
    id: string;
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    totalAmount: number;
    soldById: string; // UID of the professional who sold it
    soldByName: string;
    commission?: number; // Manual commission amount set at time of sale
    paymentMethod: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr'; // Legacy/Primary
    bankAccount?: BankAccount | null; // Legacy/Primary
    payments?: SalePayment[]; // Multi-payment support
    date: string; // YYYY-MM-DD for easier querying
    createdAt: Date | Timestamp;
}
