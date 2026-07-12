// 'realizado'/'cancelado' son valores legacy (turnos viejos en español) que todavía
// aparecen en datos reales — se mantienen en el tipo para no forzar casteos `as any`
// en las comparaciones de status por todo el código.
export type AppointmentStatus = 'pending' | 'completed' | 'cancelled' | 'realizado' | 'cancelado';

export interface SelectedTreatment {
    treatmentId: string;
    name: string;
    category?: import('./treatment').TreatmentCategory;
    zone?: string;
    gender?: 'male' | 'female' | 'both';
    price: number;
    duration: number; // minutes
}

export interface Payment {
    id: string;
    amount: number;
    method: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr' | 'gift_card' | 'client_credit';
    date: string; // YYYY-MM-DD
    label: string; // e.g., "Seña", "Saldo", "Pago Parcial"
    bankAccount?: 'cuenta1' | 'cuenta2' | null;
    giftCardId?: string; // only when method === 'gift_card'
    creditId?: string; // only when method === 'client_credit'
    createdAt: Date;
}

export interface Appointment {
    id: string;
    clientName: string;
    clientFirstName?: string;
    clientLastName?: string;
    clientId?: string;
    clientPhone?: string; // Standard format (+549...)
    clientEmail?: string;
    treatment: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    duration: number; // En horas (0.5, 1, 1.5, etc.)
    professionalId?: string; // Opcional para turnos legacy
    notes?: string;
    price?: number; // Precio total del turno
    treatments?: SelectedTreatment[]; // Tratamientos del catálogo (opcional, para nuevos turnos)
    status: AppointmentStatus;
    payments: Payment[];
    commissionPercentageOverride?: number | null; // Override for professional commission percentage (e.g., 50 = 50%)
    commissionFixedOverride?: number | null; // Override for professional commission as fixed amount (e.g., 15000)
    createdAt: Date;
    updatedAt: Date;
    paymentMethod?: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr'; // Legacy/Shortcut for single payment
    isPaid?: boolean; // Legacy/Calculated value

    // Legacy fields (from original app)
    nombre?: string;
    servicio?: string;
    fecha?: string;
    hora?: string;
    duracion?: number;
}

export interface TimeSlot {
    time: string;
    available: boolean;
    appointment?: Appointment;
}

export const DURATION_OPTIONS = [
    { value: 0.5, label: '30 minutos' },
    { value: 1, label: '1 hora' },
    { value: 1.5, label: '1 hora y 30 minutos' },
    { value: 2, label: '2 horas' },
    { value: 2.5, label: '2 horas y 30 minutos' },
    { value: 3, label: '3 horas' },
    { value: 3.5, label: '3 horas y 30 minutos' },
    { value: 4, label: '4 horas' },
];

export const WORKING_HOURS = {
    start: 7.5, // 7:30
    end: 19.5, // 19:30
    interval: 0.5, // 30 minutos
};
