'use client';

import { useState, useEffect } from 'react';
import { createEgreso, updateEgreso } from '@/lib/firebase/egresos';
import { Egreso, EgresoCategory, EGRESO_CATEGORIES } from '@/lib/types/egreso';
import { BANK_ACCOUNTS, BankAccount } from '@/lib/types/bankAccount';
import { X, Plus, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { getTodayDate } from '@/lib/utils/time';
import { formatCurrencyWithSymbol as formatCurrency } from '@/lib/utils/currency';

export const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    debit: 'T. Débito',
    credit: 'T. Crédito',
    qr: 'QR / Digital',
};

export interface EgresoFormPayment {
    id: string;
    method: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    amount: string;
    bankAccount?: BankAccount | null;
}

interface EgresoForm {
    date: string;
    category: EgresoCategory;
    amount: string;
    description: string;
    payments: EgresoFormPayment[];
}

function getDefaultForm(date?: string): EgresoForm {
    return {
        date: date || getTodayDate(),
        category: 'otros',
        amount: '',
        description: '',
        payments: [{ id: Date.now().toString(), method: 'cash', amount: '', bankAccount: null }],
    };
}

function formFromEgreso(e: Egreso): EgresoForm {
    // Convert payments to form format
    const payments: EgresoFormPayment[] = e.payments && e.payments.length > 0
        ? e.payments.map(p => ({
            id: p.id || Math.random().toString(),
            method: p.method,
            amount: String(p.amount),
            bankAccount: p.bankAccount,
        }))
        : [{
            id: Date.now().toString(),
            method: e.paymentMethod || 'cash',
            amount: String(e.amount),
            bankAccount: e.bankAccount,
        }];

    return {
        date: e.date,
        category: e.category,
        amount: String(e.amount),
        description: e.description || '',
        payments,
    };
}

interface EgresoFormModalProps {
    isOpen: boolean;
    // null = gasto nuevo; con un gasto = edición
    egreso: Egreso | null;
    // Fecha con la que arranca un gasto nuevo (por defecto, hoy)
    defaultDate?: string;
    onClose: () => void;
    // Se llama después de guardar, para que la pantalla recargue sus datos
    onSaved: () => void;
}

export function EgresoFormModal({ isOpen, egreso, defaultDate, onClose, onSaved }: EgresoFormModalProps) {
    const [form, setForm] = useState<EgresoForm>(() => getDefaultForm(defaultDate));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) setForm(egreso ? formFromEgreso(egreso) : getDefaultForm(defaultDate));
    }, [isOpen, egreso, defaultDate]);

    if (!isOpen) return null;

    const isEditing = egreso !== null;
    const paymentsTotal = form.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    async function handleSave() {
        if (!form.date || !form.category || !form.amount) {
            toast.error('Completá fecha, categoría y monto');
            return;
        }
        if (!form.description.trim()) {
            toast.error('Completá la descripción del gasto');
            return;
        }

        if (Math.abs(paymentsTotal - Number(form.amount)) > 0.01) {
            toast.error(`La suma de los pagos (${formatCurrency(paymentsTotal)}) debe coincidir con el monto total (${formatCurrency(Number(form.amount))})`);
            return;
        }

        setSaving(true);
        try {
            const payload = {
                date: form.date,
                category: form.category,
                amount: Number(form.amount),
                description: form.description.trim(),
                payments: form.payments.map(p => ({
                    id: p.id,
                    method: p.method,
                    amount: Number(p.amount),
                    bankAccount: p.method !== 'cash' ? (p.bankAccount || 'cuenta1') : null,
                })),
                // Legacy fields for backward compatibility
                paymentMethod: form.payments[0]?.method || 'cash',
                bankAccount: form.payments[0]?.method !== 'cash' ? (form.payments[0]?.bankAccount || 'cuenta1') : null,
            };
            if (egreso) {
                await updateEgreso(egreso.id, payload);
                toast.success('Egreso actualizado');
            } else {
                await createEgreso(payload);
                toast.success('Egreso registrado');
            }
            onClose();
            onSaved();
        } catch (error) {
            console.error('Error saving egreso:', error);
            toast.error('Error al guardar');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <h2 className="text-2xl font-black text-gray-900">{isEditing ? 'Editar Egreso' : 'Nuevo Egreso'}</h2>
                    <button aria-label="Cerrar" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Fecha */}
                    <div>
                        <label htmlFor="egreso-date" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Fecha *</label>
                        <input
                            id="egreso-date"
                            type="date"
                            value={form.date}
                            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-gray-50"
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label htmlFor="egreso-description" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Descripción *</label>
                        <textarea
                            id="egreso-description"
                            rows={2}
                            placeholder="¿En qué se gastó? Ej: Alquiler máquina de depilación láser"
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-gray-50 placeholder:text-gray-400 resize-none"
                        />
                    </div>

                    {/* Categoría */}
                    <div>
                        <label htmlFor="egreso-category" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Categoría *</label>
                        <select
                            id="egreso-category"
                            value={form.category}
                            onChange={e => setForm(f => ({ ...f, category: e.target.value as EgresoCategory }))}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-gray-50"
                        >
                            {EGRESO_CATEGORIES.map(c => (
                                <option key={c.value} value={c.value} className="text-gray-900">{c.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Monto */}
                    <div>
                        <label htmlFor="egreso-amount" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Monto *</label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                id="egreso-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                value={form.amount}
                                onChange={e => {
                                    const amount = e.target.value;
                                    // Con un solo método de pago, su monto es el total: no hace falta escribirlo dos veces
                                    setForm(f => ({
                                        ...f,
                                        amount,
                                        payments: f.payments.length === 1 ? [{ ...f.payments[0], amount }] : f.payments,
                                    }));
                                }}
                                className="w-full border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-gray-50 placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Pagos */}
                    <div className="border-t border-gray-100 pt-4 mt-2">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-500">Desglose de Pagos *</label>
                            <button
                                type="button"
                                onClick={() => setForm(f => ({
                                    ...f,
                                    payments: [...f.payments, { id: Date.now().toString(), method: 'cash', amount: '', bankAccount: null }]
                                }))}
                                className="text-[10px] font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 text-gray-600"
                            >
                                <Plus className="w-3 h-3" /> Agregar Pago
                            </button>
                        </div>

                        <div className="space-y-3">
                            {form.payments.map((p, idx) => (
                                <div key={p.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative group">
                                    {form.payments.length > 1 && (
                                        <button
                                            type="button"
                                            aria-label="Eliminar pago"
                                            onClick={() => setForm(f => ({
                                                ...f,
                                                payments: f.payments.filter(pay => pay.id !== p.id)
                                            }))}
                                            className="absolute -top-2 -right-2 bg-white border border-gray-200 text-red-500 p-1.5 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor={`egreso-method-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Medio</label>
                                            <select
                                                id={`egreso-method-${idx}`}
                                                value={p.method}
                                                onChange={e => {
                                                    const method = e.target.value as EgresoFormPayment['method'];
                                                    setForm(f => ({
                                                        ...f,
                                                        payments: f.payments.map((pay, i) => i !== idx ? pay : {
                                                            ...pay,
                                                            method,
                                                            bankAccount: method === 'cash' ? null : (pay.bankAccount || 'cuenta1'),
                                                        }),
                                                    }));
                                                }}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-white"
                                            >
                                                {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
                                                    <option key={v} value={v}>{l}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor={`egreso-pay-amount-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Monto</label>
                                            <input
                                                id={`egreso-pay-amount-${idx}`}
                                                type="number"
                                                value={p.amount}
                                                onChange={e => {
                                                    const amount = e.target.value;
                                                    setForm(f => ({
                                                        ...f,
                                                        payments: f.payments.map((pay, i) => i !== idx ? pay : { ...pay, amount }),
                                                    }));
                                                }}
                                                placeholder="0"
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-white"
                                            />
                                        </div>
                                    </div>

                                    {p.method !== 'cash' && (
                                        <div className="mt-3">
                                            <label htmlFor={`egreso-account-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Cuenta</label>
                                            <select
                                                id={`egreso-account-${idx}`}
                                                value={p.bankAccount || 'cuenta1'}
                                                onChange={e => {
                                                    const bankAccount = e.target.value as NonNullable<EgresoFormPayment['bankAccount']>;
                                                    setForm(f => ({
                                                        ...f,
                                                        payments: f.payments.map((pay, i) => i !== idx ? pay : { ...pay, bankAccount }),
                                                    }));
                                                }}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-white"
                                            >
                                                {BANK_ACCOUNTS.map(acc => (
                                                    <option key={acc.value} value={acc.value}>{acc.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-4 mt-2 border-t border-gray-100 flex-shrink-0">
                    {form.payments.length > 0 && (
                        <div className="mb-4 flex justify-between items-center px-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Desglosado:</span>
                            <span className={`text-sm font-black ${Math.abs(paymentsTotal - Number(form.amount)) < 0.01 ? 'text-[#34baab]' : 'text-red-500'}`}>
                                {formatCurrency(paymentsTotal)}
                            </span>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-[#34baab] hover:bg-[#2a968a] text-white font-black py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Egreso'}
                    </button>
                </div>
            </div>
        </div>
    );
}
