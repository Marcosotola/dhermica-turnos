'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { formatCurrencyWithSymbol } from '@/lib/utils/currency';
import { Product } from '@/lib/types/product';
import { Professional } from '@/lib/types/professional';
import { Sale, SalePayment } from '@/lib/types/sale';
import { createSale } from '@/lib/firebase/sales';
import { toast } from 'sonner';
import { ShoppingCart, User, CreditCard, Plus, Trash2, Save } from 'lucide-react';
import { getTodayDate } from '@/lib/utils/time';

interface ProductSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    professionals: Professional[];
    onSuccess?: () => void;
}

export function ProductSaleModal({
    isOpen,
    onClose,
    product,
    professionals,
    onSuccess,
}: ProductSaleModalProps) {
    const [quantity, setQuantity] = useState<number | string>(1);
    const [commission, setCommission] = useState<number>(3000);
    const [soldById, setSoldById] = useState('');
    const [saleDate, setSaleDate] = useState(getTodayDate());
    const [loading, setLoading] = useState(false);

    // Multi-payment state
    const [payments, setPayments] = useState<SalePayment[]>([]);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [newPayment, setNewPayment] = useState({
        amount: 0,
        method: 'cash' as SalePayment['method'],
        label: 'Pago',
        bankAccount: 'cuenta1' as 'cuenta1' | 'cuenta2',
        date: getTodayDate()
    });

    useEffect(() => {
        if (isOpen && product) {
            setQuantity(1);
            setCommission(3000);
            setSoldById('');
            setSaleDate(getTodayDate());
            setPayments([]);
            setShowPaymentForm(false);
            setNewPayment({
                amount: product.price, // Default to full price
                method: 'cash',
                label: 'Pago',
                bankAccount: 'cuenta1',
                date: getTodayDate()
            });
        }
    }, [isOpen, product]);

    if (!product) return null;

    const qValue = Number(quantity) || 0;
    const totalAmount = product.price * qValue;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalAmount - totalPaid;

    const handleAddPayment = () => {
        if (newPayment.amount <= 0) {
            toast.error('El monto debe ser mayor a 0');
            return;
        }

        const payment: SalePayment = {
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
        toast.success('Pago añadido');
    };

    const removePayment = (id: string) => {
        setPayments(prev => prev.filter(p => p.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!soldById) {
            toast.error('Debe seleccionar quién realizó la venta');
            return;
        }

        let finalPayments = [...payments];
        
        // Si no hay pagos registrados pero hay un monto en el form de "nuevo pago", lo usamos
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
            toast.error('Debe registrar al menos un método de pago');
            setShowPaymentForm(true);
            return;
        }

        const currentPaid = finalPayments.reduce((sum, p) => sum + p.amount, 0);
        if (currentPaid < totalAmount) {
            if (!window.confirm(`El monto total es ${formatCurrencyWithSymbol(totalAmount)} pero solo se han registrado ${formatCurrencyWithSymbol(currentPaid)}. ¿Desea continuar?`)) {
                return;
            }
        }

        setLoading(true);
        try {
            const professional = professionals.find(p => p.id === soldById);

            await createSale({
                productId: product.id,
                productName: product.name,
                price: product.price,
                quantity: Number(quantity) || 1,
                totalAmount,
                soldById,
                soldByName: professional?.name || 'Desconocido',
                commission: Number(commission) || 0,
                // For legacy compatibility, we use the first payment method
                paymentMethod: finalPayments[0].method,
                bankAccount: finalPayments[0].bankAccount,
                payments: finalPayments,
                date: saleDate,
            });

            toast.success('Venta registrada con éxito');
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error registering sale:', error);
            toast.error('Error al registrar la venta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Registrar Venta"
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#34baab] shadow-sm">
                        <ShoppingCart className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-black text-gray-900 leading-tight">{product.name}</h4>
                        <p className="text-sm font-bold text-[#34baab]">{formatCurrencyWithSymbol(product.price)}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Total a cobrar</span>
                        <span className="text-xl font-black text-gray-900">{formatCurrencyWithSymbol(totalAmount)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Cantidad"
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="1"
                        required
                    />
                    <CurrencyInput
                        label="Comisión Vendedor"
                        value={commission}
                        onChange={(val) => setCommission(val)}
                        placeholder="0"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Vendido por"
                        value={soldById}
                        onChange={(e) => setSoldById(e.target.value)}
                        options={[
                            { value: '', label: 'Seleccionar profesional...' },
                            ...professionals.map(p => ({ value: p.id, label: p.name }))
                        ]}
                        required
                    />
                    <Input
                        label="Fecha de Venta"
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        required
                    />
                </div>

                {/* Payments Section */}
                <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Métodos de Pago</h3>
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
                                            {p.method.toUpperCase()} {p.bankAccount && `(${p.bankAccount === 'cuenta1' ? 'CTA 1' : 'CTA 2'})`} • {p.date.split('-').reverse().join('/')}
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
                                            { value: 'cuenta1', label: 'Cuenta 1' },
                                            { value: 'cuenta2', label: 'Cuenta 2' },
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
                            <Plus className="w-4 h-4" /> Agregar Método de Pago
                        </button>
                    )}
                </div>

                <div className="flex gap-3 pt-6 border-t">
                    <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                        Cancelar
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={loading} 
                        className="flex-1 bg-[#484450] hover:bg-[#383440] text-white font-black uppercase tracking-widest"
                    >
                        {loading ? 'Registrando...' : 'Confirmar Venta'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
