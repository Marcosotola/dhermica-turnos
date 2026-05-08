'use client';

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Appointment } from '@/lib/types/appointment';
import { formatArgentineCurrency } from '@/lib/utils/currency';

interface DeleteAppointmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    appointment: Appointment | null;
    loading?: boolean;
}

export function DeleteAppointmentDialog({
    isOpen,
    onClose,
    onConfirm,
    appointment,
    loading = false,
}: DeleteAppointmentDialogProps) {
    if (!appointment) return null;

    const totalPaid = (appointment.payments || []).reduce((sum, p) => sum + p.amount, 0);

    const dateFormatted = (() => {
        const parts = (appointment.date || '').split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : appointment.date;
    })();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Turno" size="sm">
            <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl space-y-1">
                    <p className="font-bold text-gray-900">{appointment.treatment}</p>
                    <p className="text-sm text-gray-500">{dateFormatted} — {appointment.time}hs</p>
                    {appointment.clientName && (
                        <p className="text-sm text-gray-500">{appointment.clientName}</p>
                    )}
                </div>

                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-4">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-red-800">Esta acción es irreversible</p>
                        <p className="text-xs text-red-600">
                            Se eliminará el turno completamente de todos los registros.
                            {totalPaid > 0 && (
                                <> Los pagos registrados (<strong>${formatArgentineCurrency(totalPaid)}</strong>) y cualquier crédito asociado también serán eliminados.</>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 pt-1">
                    <Button variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
                        Cancelar
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        {loading ? 'Eliminando...' : 'Eliminar definitivamente'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
