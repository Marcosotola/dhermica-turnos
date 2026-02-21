'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Sale } from '@/lib/types/sale';
import { getSalesByDateRange, deleteSale, updateSale } from '@/lib/firebase/sales';
import { Professional } from '@/lib/types/professional';
import { toast } from 'sonner';
import { Trash2, Pencil, X, Check, Loader2, ShoppingBag } from 'lucide-react';
import { getTodayDate } from '@/lib/utils/time';

interface SalesHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    professionals: Professional[];
    onRefresh?: () => void;
}

const PAYMENT_OPTIONS = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'debit', label: 'Débito' },
    { value: 'credit', label: 'Crédito' },
    { value: 'qr', label: 'QR / Digital' },
];

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Efectivo', transfer: 'Transferencia', debit: 'Débito', credit: 'Crédito', qr: 'QR / Digital'
};

export function SalesHistoryModal({ isOpen, onClose, professionals, onRefresh }: SalesHistoryModalProps) {
    const today = getTodayDate();
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Sale>>({});
    const [savingId, setSavingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) fetchSales();
    }, [isOpen, startDate, endDate]);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const data = await getSalesByDateRange(startDate, endDate);
            setSales(data);
        } catch {
            toast.error('Error al cargar ventas');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (sale: Sale) => {
        setEditingId(sale.id);
        setEditForm({
            quantity: sale.quantity,
            commission: sale.commission,
            paymentMethod: sale.paymentMethod,
            soldById: sale.soldById,
            date: sale.date,
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveEdit = async (sale: Sale) => {
        setSavingId(sale.id);
        try {
            const qty = Number(editForm.quantity) || 1;
            const totalAmount = sale.price * qty;
            const selectedProf = professionals.find(p => p.id === editForm.soldById || p.userId === editForm.soldById);
            await updateSale(sale.id, {
                ...editForm,
                quantity: qty,
                totalAmount,
                soldByName: selectedProf?.name || sale.soldByName,
                commission: Number(editForm.commission) || 0,
            });
            toast.success('Venta actualizada');
            setEditingId(null);
            fetchSales();
            onRefresh?.();
        } catch {
            toast.error('Error al actualizar la venta');
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta venta?')) return;
        setDeletingId(id);
        try {
            await deleteSale(id);
            toast.success('Venta eliminada');
            setSales(prev => prev.filter(s => s.id !== id));
            onRefresh?.();
        } catch {
            toast.error('Error al eliminar la venta');
        } finally {
            setDeletingId(null);
        }
    };

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Historial de Ventas" size="lg">
            <div className="space-y-4">
                {/* Date filters */}
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Desde" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <Input label="Hasta" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>

                {/* Sales list */}
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin text-[#34baab]" />
                    </div>
                ) : sales.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No hay ventas en este período.</p>
                    </div>
                ) : (
                    <>
                        {/* Totals summary */}
                        <div className="bg-[#34baab]/10 border border-[#34baab]/20 rounded-2xl p-4 grid grid-cols-3 gap-2">
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ventas</p>
                                <p className="text-lg font-black text-gray-800">{sales.length}</p>
                            </div>
                            <div className="text-center border-x border-[#34baab]/20">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total</p>
                                <p className="text-lg font-black text-[#34baab]">
                                    {formatCurrency(sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0))}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Comisiones</p>
                                <p className="text-lg font-black text-gray-800">
                                    {formatCurrency(sales.reduce((acc, s) => acc + (s.commission || 0), 0))}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                            {sales.map(sale => (
                                <div key={sale.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    {editingId === sale.id ? (
                                        /* Edit mode */
                                        <div className="space-y-3">
                                            <p className="font-black text-gray-800 text-sm">{sale.productName}</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Input
                                                    label="Cantidad"
                                                    type="number"
                                                    min={1}
                                                    value={editForm.quantity ?? ''}
                                                    onChange={e => setEditForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                                                />
                                                <Input
                                                    label="Comisión"
                                                    type="number"
                                                    value={editForm.commission ?? ''}
                                                    onChange={e => setEditForm(f => ({ ...f, commission: Number(e.target.value) }))}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Input
                                                    label="Fecha"
                                                    type="date"
                                                    value={editForm.date ?? ''}
                                                    onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                                                />
                                                <Select
                                                    label="Método"
                                                    value={editForm.paymentMethod ?? 'cash'}
                                                    onChange={e => setEditForm(f => ({ ...f, paymentMethod: e.target.value as any }))}
                                                    options={PAYMENT_OPTIONS}
                                                />
                                            </div>
                                            <Select
                                                label="Vendido por"
                                                value={editForm.soldById ?? ''}
                                                onChange={e => setEditForm(f => ({ ...f, soldById: e.target.value }))}
                                                options={[
                                                    { value: '', label: 'Seleccionar...' },
                                                    ...professionals.map(p => ({ value: p.userId || p.id, label: p.name }))
                                                ]}
                                            />
                                            <div className="flex gap-2 pt-1">
                                                <Button
                                                    onClick={() => saveEdit(sale)}
                                                    disabled={savingId === sale.id}
                                                    className="flex-1 bg-[#34baab] text-white text-sm"
                                                >
                                                    {savingId === sale.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Guardar</>}
                                                </Button>
                                                <Button variant="ghost" onClick={cancelEdit} className="flex-1 text-sm">
                                                    <X className="w-4 h-4 mr-1" />Cancelar
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* View mode */
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-black text-gray-800 text-sm truncate">{sale.productName}</p>
                                                <p className="text-xs text-gray-500">{sale.date} · {sale.soldByName} · {PAYMENT_LABELS[sale.paymentMethod]}</p>
                                                <div className="flex gap-3 mt-1">
                                                    <span className="text-xs text-gray-600">x{sale.quantity} · {formatCurrency(sale.totalAmount)}</span>
                                                    {sale.commission !== undefined && sale.commission > 0 && (
                                                        <span className="text-xs text-[#34baab] font-bold">Comisión: {formatCurrency(sale.commission)}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => startEdit(sale)}
                                                    className="p-2 rounded-xl hover:bg-blue-50 text-blue-500 transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(sale.id)}
                                                    disabled={deletingId === sale.id}
                                                    className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors"
                                                >
                                                    {deletingId === sale.id
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
