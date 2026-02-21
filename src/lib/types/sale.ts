import { Timestamp } from 'firebase/firestore';

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
    paymentMethod: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    date: string; // YYYY-MM-DD for easier querying
    createdAt: Date | Timestamp;
}
