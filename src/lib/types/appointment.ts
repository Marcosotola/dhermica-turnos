export type AppointmentStatus = 'pending' | 'completed' | 'cancelled';

export interface Payment {
    id: string;
    amount: number;
    method: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    date: string; // YYYY-MM-DD
    label: string; // e.g., "Seña", "Saldo", "Pago Parcial"
    createdAt: Date;
}

export interface Appointment {
    id: string;
    clientName: string;
    clientFirstName?: string;
    clientLastName?: string;
    clientId?: string;
    treatment: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    duration: number; // En horas (0.5, 1, 1.5, etc.)
    professionalId?: string; // Opcional para turnos legacy
    notes?: string;
    price?: number; // Precio total del turno
    status: AppointmentStatus;
    payments: Payment[];
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
