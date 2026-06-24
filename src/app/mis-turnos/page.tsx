'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    CalendarCheck,
    Clock,
    ClipboardList,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    Loader2,
    CheckCircle2,
    XCircle,
    Gift,
    AlertCircle,
    DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { Appointment } from '@/lib/types/appointment';
import { getAppointmentsByClientId } from '@/lib/firebase/appointments';
import { formatArgentineCurrency } from '@/lib/utils/currency';
import { Toaster } from 'sonner';
import { ClientCredit } from '@/lib/types/clientCredit';
import { getClientCredits } from '@/lib/firebase/clientCredits';
import { ClientLedger } from '@/components/clients/ClientLedger';
import { GiftCard } from '@/lib/types/giftCard';
import { getGiftCardsByPurchaser } from '@/lib/firebase/giftCards';
import { getClientLedgerSummary, BALANCE_SINCE } from '@/lib/utils/clientLedger';
import { ClientCancelButton } from '@/components/appointments/ClientCancelButton';
import { CalendarPlus } from 'lucide-react';

export default function MisTurnosPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [credits, setCredits] = useState<ClientCredit[]>([]);
    const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [turnosOpen, setTurnosOpen] = useState(false);

    useEffect(() => {
        if (!loading && (!user || (profile?.role !== 'client' && profile?.role !== 'cliente-prueba'))) {
            router.push('/dashboard');
        }
    }, [user, profile, loading, router]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user || !profile) return;
            setHistoryLoading(true);
            try {
                const [apts, creds, gcs] = await Promise.all([
                    getAppointmentsByClientId(user.uid, profile.fullName),
                    getClientCredits(user.uid, profile.fullName),
                    getGiftCardsByPurchaser(user.uid, profile.fullName),
                ]);
                setAppointments(apts);
                setCredits(creds);
                setGiftCards(gcs);
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setHistoryLoading(false);
            }
        };

        if (!loading && user && profile) {
            fetchHistory();
        }
    }, [user, profile, loading]);

    if (loading || (historyLoading && appointments.length === 0)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#34baab] animate-spin" />
            </div>
        );
    }

    const summary = getClientLedgerSummary(appointments, credits);
    const today = new Date().toISOString().split('T')[0];
    const activeGiftCards = giftCards.filter(g =>
        (g.status === 'active' || g.status === 'partially_used') &&
        (!g.expiryDate || g.expiryDate >= today)
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-[#484450] rounded-3xl p-6 mb-6 shadow-lg text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-lg">
                                <ClipboardList className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight">Mis Turnos</h1>
                                <p className="text-gray-300 text-sm font-medium">Tu historial y estado de cuenta.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/reservar" className="flex items-center gap-2 bg-[#34baab] hover:bg-[#2aa89a] transition-colors px-4 py-2 rounded-xl text-sm font-bold shadow">
                                <CalendarPlus className="w-4 h-4" /> Reservar
                            </Link>
                            <Link href="/dashboard" className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-xl text-sm font-bold">
                                <ChevronLeft className="w-4 h-4" /> Volver
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto space-y-4">

                    {/* Banner de estado */}
                    {historyLoading ? null : summary.netBalance > 0 ? (
                        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-4">
                            <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                            <div>
                                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Saldo pendiente</p>
                                <p className="text-xl font-black text-red-600">$ {formatArgentineCurrency(summary.netBalance)}</p>
                            </div>
                        </div>
                    ) : summary.netBalance < 0 ? (
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4">
                            <Gift className="w-6 h-6 text-amber-500 shrink-0" />
                            <div>
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Saldo a favor</p>
                                <p className="text-xl font-black text-amber-600">$ {formatArgentineCurrency(Math.abs(summary.netBalance))}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-4">
                            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                            <div>
                                <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Al día</p>
                                <p className="text-sm font-bold text-green-700">No hay deuda pendiente</p>
                            </div>
                        </div>
                    )}

                    {!historyLoading && (
                        <p className="text-[10px] text-gray-400 font-medium px-1">
                            * Saldo calculado desde el {(() => { const [y, m, d] = BALANCE_SINCE.split('-'); return `${d}/${m}/${y}`; })()}. Turnos anteriores no tenían registro de pagos.
                        </p>
                    )}

                    {/* Historial de Turnos colapsable */}
                    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <button
                            type="button"
                            onClick={() => setTurnosOpen(v => !v)}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <CalendarCheck className="w-4 h-4 text-[#34baab]" />
                                <span className="font-bold text-gray-900 text-sm">Mis Turnos</span>
                                <span className="text-xs text-gray-400 font-medium">({appointments.length})</span>
                            </div>
                            {turnosOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>

                        {turnosOpen && (
                            <div className="p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                {historyLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-8 h-8 text-[#34baab] animate-spin" />
                                    </div>
                                ) : appointments.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                        <p className="font-black text-gray-400 text-sm">No hay turnos registrados</p>
                                        <p className="text-gray-400 text-xs mt-1">¡Te esperamos pronto!</p>
                                    </div>
                                ) : (
                                    [...appointments]
                                        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                                        .map(apt => {
                                            const totalPaid = (apt.payments || []).reduce((s, p) => s + p.amount, 0);
                                            const balance = (apt.price || 0) - totalPaid;
                                            const status = apt.status || 'pending';
                                            return (
                                                <div key={apt.id} className="p-3 rounded-2xl border border-gray-100 bg-gray-50/50">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-start gap-2 min-w-0">
                                                            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shrink-0 border border-gray-100">
                                                                <CalendarCheck className="w-4 h-4 text-[#34baab]" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-gray-900 text-sm truncate">{apt.treatment}</p>
                                                                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                                    <Clock className="w-3 h-3 shrink-0" />
                                                                    {(() => { const [y, m, d] = apt.date.split('-'); return `${d}/${m}/${y}`; })()} — {apt.time}hs
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                                            <span className="text-sm font-black text-[#34baab]">$ {formatArgentineCurrency(apt.price || 0)}</span>
                                                            {(status as string) === 'completed' || (status as string) === 'realizado' ? (
                                                                <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-[9px] uppercase font-black flex items-center gap-1">
                                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Realizado
                                                                </span>
                                                            ) : (status as string) === 'cancelled' || (status as string) === 'cancelado' ? (
                                                                <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[9px] uppercase font-black flex items-center gap-1">
                                                                    <XCircle className="w-2.5 h-2.5" /> Cancelado
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-[9px] uppercase font-black flex items-center gap-1">
                                                                    <Clock className="w-2.5 h-2.5" /> Pendiente
                                                                </span>
                                                            )}
                                                            {(apt.payments || []).length > 0 && balance === 0 && (
                                                                <span className="text-[9px] font-black text-[#34baab]">Totalmente saldado</span>
                                                            )}
                                                            {(apt.payments || []).length > 0 && balance > 0 && (
                                                                <span className="text-[9px] font-black text-red-500">Debe $ {formatArgentineCurrency(balance)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {apt.notes && (
                                                        <p className="mt-2 pt-2 border-t border-gray-100 text-[11px] italic text-gray-400">"{apt.notes}"</p>
                                                    )}
                                                    {/* Botón de cancelación: solo para turnos pendientes futuros */}
                                                    {(status === 'pending') && apt.date >= today && (
                                                        <ClientCancelButton
                                                            appointment={apt}
                                                            clientId={user!.uid}
                                                            clientName={profile!.fullName}
                                                            onCancelled={() => {
                                                                setAppointments(prev =>
                                                                    prev.map(a => a.id === apt.id ? { ...a, status: 'cancelled' } : a)
                                                                );
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Gift Cards */}
                    <div className="space-y-2">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <Gift className="w-3.5 h-3.5 text-[#34baab]" /> Mis Gift Cards
                        </p>
                        {activeGiftCards.length === 0 ? (
                            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
                                <Gift className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                <p className="text-sm font-bold text-gray-400">No tenés gift cards activas</p>
                                <p className="text-xs text-gray-300 mt-0.5">Podés consultarnos para obtener una.</p>
                            </div>
                        ) : (
                            activeGiftCards.map(gc => (
                                <div key={gc.id} className="rounded-2xl bg-gradient-to-r from-teal-500 via-teal-400 to-cyan-400 p-4 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Gift Card activa</p>
                                            <p className="text-2xl font-black text-white">$ {formatArgentineCurrency(gc.remainingBalance)}</p>
                                            <p className="text-xs font-mono text-white/80 mt-1">{gc.code}</p>
                                        </div>
                                        {gc.expiryDate && (
                                            <p className="text-[10px] text-white/70">
                                                Vence {(() => { const [y, m, d] = gc.expiryDate!.split('-'); return `${d}/${m}/${y}`; })()}
                                            </p>
                                        )}
                                    </div>
                                    {gc.notes && <p className="text-[10px] text-white/70 mt-2 italic">"{gc.notes}"</p>}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Historial de Transacciones */}
                    <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-1 mb-2 flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-[#34baab]" /> Historial de Transacciones
                        </p>
                        <ClientLedger
                            appointments={appointments}
                            credits={credits}
                            loading={historyLoading}
                            hideSummary
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}
