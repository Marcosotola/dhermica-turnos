'use client';

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Product } from '@/lib/types/product';
import { Professional } from '@/lib/types/professional';
import { Sale } from '@/lib/types/sale';
import { createSale } from '@/lib/firebase/sales';
import { toast } from 'sonner';
import { ShoppingCart, User, CreditCard } from 'lucide-react';
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
    const [commission, setCommission] = useState<string>('3000');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'debit' | 'credit' | 'qr'>('cash');
    const [soldById, setSoldById] = useState('');
    const [saleDate, setSaleDate] = useState(getTodayDate());
    const [loading, setLoading] = useState(false);

    if (!product) return null;
    const qValue = Number(quantity) || 0;
    const totalAmount = product.price * qValue;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!soldById) {
            toast.error('Debe seleccionar quién realizó la venta');
            return;
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
                paymentMethod,
                date: saleDate,
            });

            toast.success('Venta registrada con éxito');
            onSuccess?.();
            onClose();
            // Reset state
            setQuantity(1);
            setCommission('');
            setSoldById('');
            setSaleDate(getTodayDate());
            setPaymentMethod('cash');
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
            size="sm"
        >
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#34baab] shadow-sm">
                        <ShoppingCart className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 leading-tight">{product.name}</h4>
                        <p className="text-sm font-bold text-[#34baab]">${product.price.toLocaleString('es-AR')}</p>
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
                    <div className="flex flex-col justify-end pb-1">
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Total a cobrar</span>
                        <span className="text-xl font-black text-gray-900">{(product.price * (Number(quantity) || 0)).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</span>
                    </div>
                </div>

                <Input
                    label="Comisión Vendedor"
                    type="number"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder="0"
                />

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

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Fecha de Venta"
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        required
                    />
                    <Select
                        label="Método de Pago"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        options={[
                            { value: 'cash', label: 'Efectivo' },
                            { value: 'transfer', label: 'Transferencia' },
                            { value: 'debit', label: 'Débito' },
                            { value: 'credit', label: 'Crédito' },
                            { value: 'qr', label: 'QR / Digital' },
                        ]}
                        required
                    />
                </div>

                <div className="flex gap-3 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="flex-1 bg-[#34baab] hover:bg-[#2aa89a] text-white">
                        {loading ? 'Registrando...' : 'Confirmar Venta'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
