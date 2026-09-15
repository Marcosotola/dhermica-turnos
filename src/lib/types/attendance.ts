export interface Attendance {
    id: string;
    professionalId: string;
    date: string; // YYYY-MM-DD — día trabajado
    amount: number; // monto pagado por ese día
    note?: string;
    createdAt: Date;
    createdBy?: string;
}
