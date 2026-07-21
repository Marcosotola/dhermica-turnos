'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';
import { Rental, RentalPayment } from '@/lib/types/rental';
import { createRental, updateRental } from '@/lib/firebase/rentals';
import { getUsersByRole } from '@/lib/firebase/users';
import { UserProfile } from '@/lib/types/user';
import { Select } from '../ui/Select';
import { toast } from 'sonner';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { formatCurrencyWithSymbol } from '@/lib/utils/currency';
import { getTodayDate } from '@/lib/utils/time';

interface RentalModalProps {
    isOpen: boolean;
    onClose: () => void;
    rental?: Rental;
}

export function RentalModal({ isOpen, onClose, rental }: RentalModalProps) {
    const [formData, setFormData] = useState({
        date: getTodayDate(),
        clientName: '',
        machine: '',
        price: 0 as number | string,
        commission: 10000 as number | string,
        sellerId: '',
    });
    
    // Multi-payment state
    const [payments, setPayments] = useState<RentalPayment[]>([]);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [newPayment, setNewPayment] = useState({
        amount: 0,
        method: 'cash' as RentalPayment['method'],
        label: 'Cobro',
        bankAccount: 'cuenta1' as 'cuenta1' | 'cuenta2',
        date: getTodayDate()
    });

    const [staff, setStaff] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingStaff, setFetchingStaff] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (rental) {
                setFormData({
                    date: rental.date,
                    clientName: rental.clientName,
                    machine: rental.machine,
                    price: rental.price ?? 0,
                    commission: rental.commission ?? 0,
                    sellerId: rental.sellerId ?? '',
                });
                setPayments(rental.payments || []);
                setShowPaymentForm(false);
            } else {
                setFormData({
                    date: getTodayDate(),
                    clientName: '',
                    machine: '',
                    price: 0,
                    commission: 10000,
                    sellerId: '',
                });
                setPayments([]);
                setShowPaymentForm(false);
            }
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

    const totalAmount = Number(formData.price) || 0;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalAmount - totalPaid;

    const handleAddPayment = () => {
        if (newPayment.amount <= 0) {
            toast.error('El monto debe ser mayor a 0');
            return;
        }

        const payment: RentalPayment = {
            id: Math.random().toString(36).substring(2, 9),
            amount: newPayment.amount,
            method: newPayment.method,
            label: newPayment.label,
            bankAccount: newPayment.method !== 'cash' ? newPayment.bankAccount : null,
            date: newPayment.date,
            createdAt: new Date()
        };

        setPayments(prev => [...prev, payment]);
        setNewPayment({
            ...newPayment,
            amount: 0,
        });
        setShowPaymentForm(false);
        toast.success('Cobro añadido');
    };

    const removePayment = (id: string) => {
        setPayments(prev => prev.filter(p => p.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalPayments = [...payments];
        if (finalPayments.length === 0 && showPaymentForm && newPayment.amount > 0) {
            finalPayments.push({
                id: Math.random().toString(36).substring(2, 9),
                amount: newPayment.amount,
                method: newPayment.method,
                label: newPayment.label,
                bankAccount: newPayment.method !== 'cash' ? newPayment.bankAccount : null,
                date: newPayment.date,
                createdAt: new Date()
            });
        }

        if (finalPayments.length === 0) {
            toast.error('Debe registrar al menos un método de cobro');
            setShowPaymentForm(true);
            return;
        }

        const currentPaid = finalPayments.reduce((sum, p) => sum + p.amount, 0);
        if (currentPaid < totalAmount) {
            if (!window.confirm(`El monto total es ${formatCurrencyWithSymbol(totalAmount)} pero solo se han cobrado ${formatCurrencyWithSymbol(currentPaid)}. ¿Desea continuar?`)) {
                return;
            }
        }

        setLoading(true);
        try {
            const selectedStaff = staff.find(s => s.uid === formData.sellerId);
            const rentalData = {
                ...formData,
                price: totalAmount,
                commission: Number(formData.commission),
                sellerId: formData.sellerId,
                sellerName: selectedStaff?.fullName || 'Desconocido',
                paymentMethod: finalPayments[0].method,
                bankAccount: finalPayments[0].bankAccount,
                payments: finalPayments,
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
            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Fecha"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                    />
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
                </div>

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
                    <CurrencyInput
                        label="Precio Alquiler"
                        value={formData.price}
                        onChange={(val) => setFormData({ ...formData, price: val })}
                        placeholder="0"
                        required
                    />
                    <CurrencyInput
                        label="Comisión Vendedor"
                        value={formData.commission}
                        onChange={(val) => setFormData({ ...formData, commission: val })}
                        placeholder="10.000"
                        required
                    />
                </div>

                {/* Payments Section */}
                <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Métodos de Cobro</h3>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-gray-400 uppercase mr-2">Saldo:</span>
                            <span className={`text-sm font-black ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrencyWithSymbol(balance)}
                            </span>
                        </div>
                    </div>

                    {/* Payments List */}
                    {payments.length > 0 && (
                        <div className="space-y-2">
                            {payments.map((p) => (
                                <div key={p.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-gray-900 uppercase">{p.label}</span>
                                        <span className="text-[9px] text-gray-500">
                                            {p.method.toUpperCase()} {p.bankAccount && `(${p.bankAccount === 'cuenta1' ? 'BRUBANK' : 'REBA'})`} • {p.date.split('-').reverse().join('/')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-gray-900">{formatCurrencyWithSymbol(p.amount)}</span>
                                        <button
                                            type="button"
                                            onClick={() => removePayment(p.id)}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Payment Form */}
                    {showPaymentForm ? (
                        <div className="bg-gray-50 p-4 rounded-xl border-2 border-[#34baab]/20 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 gap-3">
                                <CurrencyInput
                                    label="Monto"
                                    value={newPayment.amount}
                                    onChange={(val) => setNewPayment({ ...newPayment, amount: val })}
                                />
                                <Select
                                    label="Método"
                                    value={newPayment.method}
                                    onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value as any })}
                                    options={[
                                        { value: 'cash', label: 'Efectivo' },
                                        { value: 'transfer', label: 'Transferencia' },
                                        { value: 'debit', label: 'Débito' },
                                        { value: 'credit', label: 'Crédito' },
                                        { value: 'qr', label: 'QR' },
                                    ]}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {newPayment.method !== 'cash' ? (
                                    <Select
                                        label="Cuenta"
                                        value={newPayment.bankAccount}
                                        onChange={(e) => setNewPayment({ ...newPayment, bankAccount: e.target.value as any })}
                                        options={[
                                            { value: 'cuenta1', label: 'Cuenta Brubank' },
                                            { value: 'cuenta2', label: 'Cuenta Reba' },
                                        ]}
                                    />
                                ) : (
                                    <div />
                                )}
                                <div className="flex gap-2 items-end">
                                    <Button
                                        type="button"
                                        onClick={handleAddPayment}
                                        className="flex-1 bg-[#34baab] hover:bg-[#2da699] text-white text-[10px] font-black uppercase tracking-widest h-10"
                                    >
                                        Añadir
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowPaymentForm(false)}
                                        className="h-10 px-4"
                                    >
                                        Cerrar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setNewPayment({ ...newPayment, amount: balance > 0 ? balance : 0 });
                                setShowPaymentForm(true);
                            }}
                            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-[#34baab] hover:text-[#34baab] hover:bg-[#34baab]/5 transition-all text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Agregar Método de Cobro
                        </button>
                    )}
                </div>

                <div className="flex gap-3 pt-6 border-t">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={loading} 
                        className="flex-1 bg-[#484450] hover:bg-[#383440] text-white font-black uppercase tracking-widest"
                    >
                        {loading ? 'Guardando...' : rental ? 'Actualizar' : 'Crear Alquiler'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
