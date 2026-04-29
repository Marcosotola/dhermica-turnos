export interface RentalPayment {
    id: string;
    amount: number;
    method: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    date: string; // YYYY-MM-DD
    label: string;
    bankAccount?: 'cuenta1' | 'cuenta2' | null;
    createdAt: Date;
}

export interface Rental {
    id: string;
    date: string; // YYYY-MM-DD
    clientName: string;
    machine: string;
    price: number;
    sellerId: string;
    sellerName: string;
    commission: number;
    paymentMethod: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr'; // Legacy/Primary
    bankAccount?: 'cuenta1' | 'cuenta2' | null; // Legacy/Primary
    payments?: RentalPayment[]; // Multi-payment support
    createdAt: Date;
    updatedAt: Date;
}
