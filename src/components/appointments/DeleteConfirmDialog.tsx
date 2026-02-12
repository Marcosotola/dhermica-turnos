'use client';

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    itemName?: string;
    itemDetail?: string;
    loading?: boolean;
}

export function DeleteConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmar Eliminación",
    description = "¿Está seguro que desea eliminar este elemento?",
    itemName,
    itemDetail,
    loading = false,
}: DeleteConfirmDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800">
                        Esta acción no se puede deshacer.
                    </p>
                </div>

                <div className="space-y-2">
                    <p className="text-gray-700">{description}</p>
                    {(itemName || itemDetail) && (
                        <div className="bg-gray-50 p-4 rounded-lg space-y-1">
                            {itemName && <p className="font-semibold text-gray-900">{itemName}</p>}
                            {itemDetail && <p className="text-sm text-gray-600">{itemDetail}</p>}
                        </div>
                    )}
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
