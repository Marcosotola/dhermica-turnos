export interface Rental {
    id: string;
    date: string; // YYYY-MM-DD
    clientName: string;
    machine: string;
    price: number;
    sellerId: string;
    sellerName: string;
    commission: number;
    paymentMethod: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    bankAccount?: 'cuenta1' | 'cuenta2' | null;
    createdAt: Date;
    updatedAt: Date;
}
