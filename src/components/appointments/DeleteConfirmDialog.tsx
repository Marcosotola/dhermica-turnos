'use client';

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Appointment } from '@/lib/types/appointment';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    appointment: Appointment | null;
    loading?: boolean;
}

export function DeleteConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    appointment,
    loading = false,
}: DeleteConfirmDialogProps) {
    if (!appointment) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Eliminación" size="sm">
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800">
                        Esta acción no se puede deshacer.
                    </p>
                </div>

                <div className="space-y-2">
                    <p className="text-gray-700">¿Está seguro que desea eliminar este turno?</p>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-1">
                        <p className="font-semibold text-gray-900">{appointment.clientName}</p>
                        <p className="text-sm text-gray-600">{appointment.treatment}</p>
                        <p className="text-sm text-gray-600">
                            {appointment.date} - {appointment.time}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1"
                    >
                        {loading ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
