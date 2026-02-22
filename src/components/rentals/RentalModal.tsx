'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Rental } from '@/lib/types/rental';
import { createRental, updateRental } from '@/lib/firebase/rentals';
import { getUsersByRole } from '@/lib/firebase/users';
import { UserProfile } from '@/lib/types/user';
import { Select } from '../ui/Select';
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
        price: '',
        commission: '',
        sellerId: '',
        paymentMethod: 'cash' as 'cash' | 'transfer' | 'debit' | 'credit' | 'qr',
    });
    const [staff, setStaff] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingStaff, setFetchingStaff] = useState(false);

    useEffect(() => {
        if (rental) {
            setFormData({
                date: rental.date,
                clientName: rental.clientName,
                machine: rental.machine,
                price: (rental.price ?? 0).toString(),
                commission: (rental.commission ?? 0).toString(),
                sellerId: rental.sellerId ?? '',
                paymentMethod: rental.paymentMethod ?? 'cash',
            });
        } else {
            setFormData({
                date: '',
                clientName: '',
                machine: '',
                price: '',
                commission: '10000',
                sellerId: '',
                paymentMethod: 'cash',
            });
        }
    }, [rental, isOpen]);

    useEffect(() => {
        const fetchStaff = async () => {
            if (!isOpen) return;
            setFetchingStaff(true);
            try {
                const roles: ('admin' | 'secretary' | 'promotor' | 'professional')[] = ['admin', 'secretary', 'promotor', 'professional'];
                const results = await Promise.all(roles.map(role => getUsersByRole(role)));
                const allStaff = results.flat().sort((a, b) => a.fullName.localeCompare(b.fullName));

                // Remove duplicates by UID if any (e.g. professional also being admin, though rare)
                const uniqueStaff = allStaff.filter((v, i, a) => a.findIndex(t => (t.uid === v.uid)) === i);
                setStaff(uniqueStaff);
            } catch (error) {
                console.error('Error fetching staff:', error);
            } finally {
                setFetchingStaff(false);
            }
        };
        fetchStaff();
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const selectedStaff = staff.find(s => s.uid === formData.sellerId);
            const rentalData = {
                ...formData,
                price: Number(formData.price),
                commission: Number(formData.commission),
                sellerId: formData.sellerId,
                sellerName: selectedStaff?.fullName || 'Desconocido',
            };

            if (rental) {
                await updateRental(rental.id, rentalData);
                toast.success('Alquiler actualizado exitosamente');
            } else {
                await createRental(rentalData);
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

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Precio Alquiler"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0"
                        required
                    />
                    <Input
                        label="Comisión Vendedor"
                        type="number"
                        value={formData.commission}
                        onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                        placeholder="10000"
                        required
                    />
                </div>

                <Select
                    label="Vendido por"
                    value={formData.sellerId}
                    onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                    options={[
                        { value: '', label: fetchingStaff ? 'Cargando staff...' : 'Seleccionar vendedor...' },
                        ...staff.map(s => ({ value: s.uid, label: s.fullName }))
                    ]}
                    required
                />

                <Select
                    label="Método de Pago"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    options={[
                        { value: 'cash', label: 'Efectivo' },
                        { value: 'transfer', label: 'Transferencia' },
                        { value: 'debit', label: 'Débito' },
                        { value: 'credit', label: 'Crédito' },
                        { value: 'qr', label: 'QR / Digital' },
                    ]}
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
