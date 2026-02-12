'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Rental } from '@/lib/types/rental';
import { createRental, updateRental } from '@/lib/firebase/rentals';
import { toast } from 'sonner';

interface RentalModalProps {
    isOpen: boolean;
    onClose: () => void;
    rental?: Rental;
}

export function RentalModal({ isOpen, onClose, rental }: RentalModalProps) {
    const [formData, setFormData] = useState({
        date: '',
        clientName: '',
        machine: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (rental) {
            setFormData({
                date: rental.date,
                clientName: rental.clientName,
                machine: rental.machine,
            });
        } else {
            setFormData({
                date: '',
                clientName: '',
                machine: '',
            });
        }
    }, [rental, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (rental) {
                await updateRental(rental.id, formData);
                toast.success('Alquiler actualizado exitosamente');
            } else {
                await createRental(formData);
                toast.success('Alquiler creado exitosamente');
            }
            onClose();
        } catch (error) {
            console.error('Error saving rental:', error);
            toast.error('Error al guardar el alquiler');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={rental ? 'Editar Alquiler' : 'Nuevo Alquiler'}
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Fecha"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                />

                <Input
                    label="Nombre Cliente / Estética"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="Ej: Estética Bella"
                    required
                />

                <Input
                    label="Máquina"
                    value={formData.machine}
                    onChange={(e) => setFormData({ ...formData, machine: e.target.value })}
                    placeholder="Ej: Laser Soprano"
                    required
                />

                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? 'Guardando...' : rental ? 'Actualizar' : 'Crear Alquiler'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
