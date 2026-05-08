'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Select } from '../ui/Select';
import { Appointment, AppointmentStatus, Payment } from '@/lib/types/appointment';
import { GiftCard } from '@/lib/types/giftCard';
import { ClientCredit } from '@/lib/types/clientCredit';
import { updateAppointment } from '@/lib/firebase/appointments';
import { getGiftCardsByClient, updateGiftCardStatus } from '@/lib/firebase/giftCards';
import { getClientCredits, useCredit } from '@/lib/firebase/clientCredits';
import { formatArgentineCurrency } from '@/lib/utils/currency';
import { toast } from 'sonner';
import {
    CheckCircle2,
    Clock,
    XCircle,
    CreditCard,
    Plus,
    Trash2,
    Gift,
    Wallet,
} from 'lucide-react';

interface QuickPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: Appointment | null;
    onSuccess?: () => void;
}

export function QuickPaymentModal({
    isOpen,
    onClose,
    appointment,
    onSuccess,
}: QuickPaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<AppointmentStatus>('pending');
    const [price, setPrice] = useState(0);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [activeGiftCards, setActiveGiftCards] = useState<GiftCard[]>([]);
    const [selectedGiftCardId, setSelectedGiftCardId] = useState<string>('');
    const [activeCredits, setActiveCredits] = useState<ClientCredit[]>([]);
    const [selectedCreditId, setSelectedCreditId] = useState<string>('');
    const [newPayment, setNewPayment] = useState({
        amount: 0,
        method: 'cash' as Payment['method'],
        label: 'Pago Total',
        bankAccount: 'cuenta1' as 'cuenta1' | 'cuenta2',
        date: new Date().toLocaleDateString('en-CA')
    });

    const today = new Date().toLocaleDateString('en-CA');

    useEffect(() => {
        if (appointment && isOpen) {
            setStatus(appointment.status || 'pending');
            setPrice(appointment.price || 0);
            setPayments(appointment.payments || []);
            setNewPayment({
                amount: 0,
                method: 'cash',
                label: 'Pago Total',
                bankAccount: 'cuenta1',
                date: today
            });
            setShowPaymentForm(false);
            setSelectedGiftCardId('');
            setSelectedCreditId('');

            const clientId = appointment.clientId || `legacy-${appointment.clientName?.replace(/\s+/g, '-').toLowerCase()}`;
            getGiftCardsByClient(clientId, appointment.clientName).then(cards => {
                const active = cards.filter(c => c.status === 'active' && (!c.expiryDate || c.expiryDate >= today));
                console.log('[GiftCards] clientId:', clientId, '| clientName:', appointment.clientName, '| total:', cards.length, '| activas:', active.length);
                setActiveGiftCards(active);
            }).catch(err => {
                console.error('[GiftCards] Error al buscar gift cards:', err);
                setActiveGiftCards([]);
            });

            getClientCredits(clientId, appointment.clientName).then(credits => {
                setActiveCredits(credits.filter(c => c.status === 'available'));
            }).catch(err => {
                console.error('[Credits] Error al buscar créditos:', err);
                setActiveCredits([]);
            });
        }
    }, [appointment, isOpen]);

    if (!appointment) return null;

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = price - totalPaid;

    const handleAddPayment = () => {
        if (newPayment.method === 'gift_card') {
            if (!selectedGiftCardId) {
                toast.error('Seleccioná una gift card');
                return;
            }
            const gc = activeGiftCards.find(c => c.id === selectedGiftCardId);
            if (!gc) return;
            const payment: Payment = {
                id: Math.random().toString(36).substring(2, 9),
                amount: gc.amount,
                method: 'gift_card',
                label: `Gift Card (${gc.code})`,
                bankAccount: null,
                giftCardId: gc.id,
                date: newPayment.date,
                createdAt: new Date().toISOString() as any
            };
            setPayments(prev => [...prev, payment]);
            setActiveGiftCards(prev => prev.filter(c => c.id !== gc.id));
            setSelectedGiftCardId('');
            setShowPaymentForm(false);
            toast.success(`Gift Card ${gc.code} agregada`);
            return;
        }

        if (newPayment.method === 'client_credit') {
            if (!selectedCreditId) {
                toast.error('Seleccioná un crédito');
                return;
            }
            const credit = activeCredits.find(c => c.id === selectedCreditId);
            if (!credit) return;
            const payment: Payment = {
                id: Math.random().toString(36).substring(2, 9),
                amount: credit.amount,
                method: 'client_credit',
                label: 'Saldo a Favor',
                bankAccount: null,
                creditId: credit.id,
                date: newPayment.date,
                createdAt: new Date().toISOString() as any
            };
            setPayments(prev => [...prev, payment]);
            setActiveCredits(prev => prev.filter(c => c.id !== credit.id));
            setSelectedCreditId('');
            setShowPaymentForm(false);
            toast.success(`Saldo a favor de $${formatArgentineCurrency(credit.amount)} aplicado`);
            return;
        }

        if (newPayment.amount <= 0) {
            toast.error('El monto debe ser mayor a 0');
            return;
        }

        const payment: Payment = {
            id: Math.random().toString(36).substring(2, 9),
            amount: newPayment.amount,
            method: newPayment.method,
            label: newPayment.label,
            bankAccount: newPayment.method !== 'cash' ? newPayment.bankAccount : null,
            date: newPayment.date,
            createdAt: new Date().toISOString() as any
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
        const removed = payments.find(p => p.id === id);
        setPayments(prev => prev.filter(p => p.id !== id));
        if (removed?.method === 'gift_card' && removed.giftCardId) {
            const clientId = appointment!.clientId || `legacy-${appointment!.clientName?.replace(/\s+/g, '-').toLowerCase()}`;
            getGiftCardsByClient(clientId, appointment!.clientName).then(cards => {
                const restored = cards.find(c => c.id === removed.giftCardId && c.status === 'active' && (!c.expiryDate || c.expiryDate >= today));
                if (restored) setActiveGiftCards(prev => [...prev, restored]);
            }).catch(() => {});
        }
        if (removed?.method === 'client_credit' && removed.creditId) {
            const clientId = appointment!.clientId || `legacy-${appointment!.clientName?.replace(/\s+/g, '-').toLowerCase()}`;
            getClientCredits(clientId, appointment!.clientName).then(credits => {
                const restored = credits.find(c => c.id === removed.creditId && c.status === 'available');
                if (restored) setActiveCredits(prev => [...prev, restored]);
            }).catch(() => {});
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            let finalPayments = [...payments];
            if (showPaymentForm && newPayment.method !== 'gift_card' && newPayment.amount > 0) {
                finalPayments.push({
                    id: Math.random().toString(36).substring(2, 9),
                    amount: newPayment.amount,
                    method: newPayment.method,
                    label: newPayment.label,
                    bankAccount: newPayment.method !== 'cash' ? newPayment.bankAccount : null,
                    date: newPayment.date,
                    createdAt: new Date().toISOString() as any
                });
            }

            await updateAppointment(appointment.id, {
                status,
                price,
                payments: finalPayments
            });

            // Redimir las gift cards usadas en este turno
            const gcPayments = finalPayments.filter(p => p.method === 'gift_card' && p.giftCardId);
            await Promise.all(gcPayments.map(p =>
                updateGiftCardStatus(p.giftCardId!, 'redeemed', {
                    redeemedDate: today,
                    redeemedInAppointmentId: appointment.id,
                })
            ));

            // Marcar créditos usados (crea crédito residual si se usó parcialmente)
            const creditPayments = finalPayments.filter(p => p.method === 'client_credit' && p.creditId);
            await Promise.all(creditPayments.map(p =>
                useCredit(p.creditId!, p.amount, appointment.id, today)
            ));

            toast.success('Turno actualizado correctamente');
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error updating appointment:', error);
            toast.error('Error al guardar los cambios');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Cerrar Turno / Registrar Pagos"
            size="md"
            footer={
                <div className="flex gap-3 w-full">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-4 font-bold"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-4 bg-[#34baab] hover:bg-[#2da699] text-white font-black uppercase tracking-widest shadow-lg shadow-[#34baab]/20"
                    >
                        {loading ? 'Guardando...' : 'Guardar y Cerrar'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Appointment Brief */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Cliente</p>
                        <p className="font-bold text-gray-900">{appointment.clientName}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tratamiento</p>
                        <p className="font-bold text-gray-900">{appointment.treatment}</p>
                    </div>
                </div>

                {/* Status Selection */}
                <div className="space-y-3">
                    <p className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Estado del Turno</p>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'pending', label: 'Pendiente', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
                            { id: 'completed', label: 'Realizado', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
                            { id: 'cancelled', label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
                        ].map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setStatus(s.id as AppointmentStatus)}
                                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all min-h-17.5 ${status === s.id
                                    ? `${s.bg} ${s.border} ${s.color} shadow-sm scale-105`
                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                    }`}
                            >
                                <s.icon className={`w-5 h-5 mb-1.5 ${status === s.id ? s.color : 'text-gray-300'}`} />
                                <span className="text-[9px] font-black uppercase tracking-tight text-center leading-tight">{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Price and Balance */}
                <div className="bg-[#34baab]/5 p-5 rounded-3xl border border-[#34baab]/10 space-y-4">
                    <CurrencyInput
                        label="Precio Total del Servicio"
                        value={price}
                        onChange={setPrice}
                        placeholder="0,00"
                    />
                    
                    <div className="flex items-center justify-between px-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Total Abonado</span>
                            <span className="text-lg font-black text-[#34baab]">$ {totalPaid.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="text-right flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Saldo</span>
                            <span className={`text-lg font-black ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                $ {balance.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Payments List */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Historial de Pagos</h3>
                    </div>
                    
                    {payments.length > 0 ? (
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
                                        <span className="text-sm font-bold text-gray-900">$ {p.amount.toLocaleString('es-AR')}</span>
                                        <button
                                            type="button"
                                            aria-label="Eliminar pago"
                                            onClick={() => removePayment(p.id)}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-4 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-xs italic">
                            No hay pagos registrados
                        </div>
                    )}
                </div>

                {/* Saldo a Favor disponible */}
                {activeCredits.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className="w-4 h-4 text-amber-500" />
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Saldo a Favor Disponible</p>
                        </div>
                        {activeCredits.map(credit => {
                            const amountToApply = balance > 0 ? Math.min(credit.amount, balance) : credit.amount;
                            return (
                                <button
                                    key={credit.id}
                                    type="button"
                                    onClick={() => {
                                        const payment: Payment = {
                                            id: Math.random().toString(36).substring(2, 9),
                                            amount: amountToApply,
                                            method: 'client_credit',
                                            label: 'Saldo a Favor',
                                            bankAccount: null,
                                            creditId: credit.id,
                                            date: today,
                                            createdAt: new Date().toISOString() as any,
                                        };
                                        setPayments(prev => [...prev, payment]);
                                        setActiveCredits(prev => prev.filter(c => c.id !== credit.id));
                                        setShowPaymentForm(false);
                                        toast.success(`Saldo a favor de $${formatArgentineCurrency(amountToApply)} aplicado`);
                                    }}
                                    className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:border-amber-400 hover:bg-amber-100 transition-all"
                                >
                                    <div className="flex flex-col items-start gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
                                            <span className="text-xs font-bold text-amber-800">Aplicar Saldo a Favor</span>
                                        </div>
                                        {credit.sourceTreatmentName && (
                                            <span className="text-[9px] text-gray-500 ml-6">{credit.sourceTreatmentName}</span>
                                        )}
                                        {amountToApply < credit.amount && (
                                            <span className="text-[9px] text-amber-600 ml-6 font-bold">
                                                Resta $ {formatArgentineCurrency(credit.amount - amountToApply)} de crédito
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-black text-sm text-amber-700">$ {formatArgentineCurrency(amountToApply)}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Add Payment Form */}
                {showPaymentForm ? (
                    <div className="bg-white p-4 rounded-xl border-2 border-[#34baab]/20 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <Select
                            label="Método"
                            value={newPayment.method}
                            onChange={(e) => {
                                setNewPayment({ ...newPayment, method: e.target.value as Payment['method'] });
                                setSelectedGiftCardId('');
                                setSelectedCreditId('');
                            }}
                            options={[
                                { value: 'cash', label: 'Efectivo' },
                                { value: 'transfer', label: 'Transferencia' },
                                { value: 'debit', label: 'Débito' },
                                { value: 'credit', label: 'Crédito' },
                                { value: 'qr', label: 'QR' },
                                ...(activeGiftCards.length > 0 ? [{ value: 'gift_card', label: 'Gift Card' }] : []),
                                ...(activeCredits.length > 0 ? [{ value: 'client_credit', label: 'Saldo a Favor' }] : []),
                            ]}
                        />

                        {newPayment.method === 'gift_card' ? (
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gift Card activa</p>
                                {activeGiftCards.map(gc => (
                                    <button
                                        key={gc.id}
                                        type="button"
                                        onClick={() => setSelectedGiftCardId(gc.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                            selectedGiftCardId === gc.id
                                                ? 'border-teal-400 bg-teal-50'
                                                : 'border-gray-100 bg-white hover:border-teal-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Gift className="w-4 h-4 text-teal-500 shrink-0" />
                                            <span className="font-mono text-xs text-gray-600">{gc.code}</span>
                                            {gc.expiryDate && (
                                                <span className="text-[9px] text-gray-400">vence {gc.expiryDate.split('-').reverse().join('/')}</span>
                                            )}
                                        </div>
                                        <span className="font-black text-sm text-teal-700">$ {formatArgentineCurrency(gc.amount)}</span>
                                    </button>
                                ))}
                            </div>
                        ) : newPayment.method === 'client_credit' ? (
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo disponible</p>
                                {activeCredits.map(credit => (
                                    <button
                                        key={credit.id}
                                        type="button"
                                        onClick={() => setSelectedCreditId(credit.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                            selectedCreditId === credit.id
                                                ? 'border-amber-400 bg-amber-50'
                                                : 'border-gray-100 bg-white hover:border-amber-200'
                                        }`}
                                    >
                                        <div className="flex flex-col items-start gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
                                                <span className="text-xs font-bold text-gray-700">Seña / Crédito</span>
                                            </div>
                                            {credit.sourceTreatmentName && (
                                                <span className="text-[9px] text-gray-400 ml-6">{credit.sourceTreatmentName}</span>
                                            )}
                                        </div>
                                        <span className="font-black text-sm text-amber-700">$ {formatArgentineCurrency(credit.amount)}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <CurrencyInput
                                    label="Monto a Cobrar"
                                    value={newPayment.amount}
                                    onChange={(val) => setNewPayment({ ...newPayment, amount: val })}
                                />
                                <div className="space-y-1">
                                    <label htmlFor="quick-pay-date" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</label>
                                    <input
                                        id="quick-pay-date"
                                        type="date"
                                        value={newPayment.date}
                                        onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#34baab]"
                                    />
                                </div>
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
                                    <Select
                                        label="Etiqueta"
                                        value={newPayment.label}
                                        onChange={(e) => setNewPayment({ ...newPayment, label: e.target.value })}
                                        options={[
                                            { value: 'Pago Total', label: 'Pago Total' },
                                            { value: 'Seña', label: 'Seña' },
                                            { value: 'Pago Parcial', label: 'Pago Parcial' },
                                        ]}
                                    />
                                )}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                onClick={handleAddPayment}
                                className="flex-1 bg-[#34baab] hover:bg-[#2da699] text-white text-[10px] font-black uppercase tracking-widest"
                            >
                                Confirmar Pago
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setShowPaymentForm(false)}
                                className="px-4"
                            >
                                Cancelar
                            </Button>
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
                        <Plus className="w-4 h-4" /> Registrar Nuevo Pago
                    </button>
                )}
            </div>
        </Modal>
    );
}
