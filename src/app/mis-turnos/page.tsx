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
    Filter,
    Search,
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
import { getGiftCardsByRecipient } from '@/lib/firebase/giftCards';
import { getClientLedgerSummary } from '@/lib/utils/clientLedger';
import { ClientCancelButton } from '@/components/appointments/ClientCancelButton';
import { CalendarPlus } from 'lucide-react';

export default function MisTurnosPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [credits, setCredits] = useState<ClientCredit[]>([]);
    const [receivedGiftCards, setReceivedGiftCards] = useState<GiftCard[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [turnosOpen, setTurnosOpen] = useState(false);
    const [aptStatus, setAptStatus] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
    const [aptSearch, setAptSearch] = useState('');
    const [aptDateFrom, setAptDateFrom] = useState('');
    const [aptDateTo, setAptDateTo] = useState('');

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
                const [apts, creds, receivedGcs] = await Promise.all([
                    getAppointmentsByClientId(user.uid, profile.fullName),
                    getClientCredits(user.uid, profile.fullName),
                    getGiftCardsByRecipient(user.uid, profile.fullName),
                ]);
                setAppointments(apts);
                setCredits(creds);
                setReceivedGiftCards(receivedGcs);
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

    const summary = getClientLedgerSummary(appointments, credits, receivedGiftCards);
    const today = new Date().toISOString().split('T')[0];

    const hasAptFilters = aptStatus !== 'all' || !!aptSearch || !!aptDateFrom || !!aptDateTo;

    const normalizedStatus = (s?: string) => {
        if (s === 'completed' || s === 'realizado') return 'completed';
        if (s === 'cancelled' || s === 'cancelado') return 'cancelled';
        return 'pending';
    };

    const filteredAppointments = appointments.filter(apt => {
        const matchStatus = aptStatus === 'all' || normalizedStatus(apt.status) === aptStatus;
        const matchSearch = !aptSearch || (apt.treatment || '').toLowerCase().includes(aptSearch.toLowerCase());
        const matchFrom = !aptDateFrom || apt.date >= aptDateFrom;
        const matchTo = !aptDateTo || apt.date <= aptDateTo;
        return matchStatus && matchSearch && matchFrom && matchTo;
    });

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
                                <span className="text-xs text-gray-400 font-medium">
                                    ({hasAptFilters ? `${filteredAppointments.length} de ${appointments.length}` : appointments.length})
                                </span>
                                {hasAptFilters && (
                                    <span className="text-[9px] font-black bg-[#34baab] text-white px-1.5 py-0.5 rounded uppercase tracking-wide">Filtrado</span>
                                )}
                            </div>
                            {turnosOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>

                        {turnosOpen && (
                            <div className="p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                {/* Filtros */}
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-1">
                                        {([
                                            { value: 'all', label: 'Todos' },
                                            { value: 'pending', label: 'Pendientes' },
                                            { value: 'completed', label: 'Realizados' },
                                            { value: 'cancelled', label: 'Cancelados' },
                                        ] as const).map(f => (
                                            <button
                                                key={f.value}
                                                type="button"
                                                onClick={() => setAptStatus(f.value)}
                                                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors ${
                                                    aptStatus === f.value
                                                        ? 'bg-[#34baab] text-white'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        <input
                                            type="text"
                                            value={aptSearch}
                                            onChange={e => setAptSearch(e.target.value)}
                                            placeholder="Buscar tratamiento..."
                                            className="flex-1 px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#34baab]"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        <div className="flex-1 grid grid-cols-2 gap-1.5">
                                            <input
                                                type="date"
                                                value={aptDateFrom}
                                                onChange={e => setAptDateFrom(e.target.value)}
                                                title="Desde"
                                                className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#34baab]"
                                            />
                                            <input
                                                type="date"
                                                value={aptDateTo}
                                                onChange={e => setAptDateTo(e.target.value)}
                                                title="Hasta"
                                                className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#34baab]"
                                            />
                                        </div>
                                        {hasAptFilters && (
                                            <button
                                                type="button"
                                                onClick={() => { setAptStatus('all'); setAptSearch(''); setAptDateFrom(''); setAptDateTo(''); }}
                                                className="text-[10px] text-[#34baab] font-bold whitespace-nowrap hover:underline"
                                            >
                                                Limpiar
                                            </button>
                                        )}
                                    </div>
                                </div>

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
                                ) : filteredAppointments.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                        <p className="font-black text-gray-400 text-sm">No hay turnos que coincidan con el filtro</p>
                                    </div>
                                ) : (
                                    [...filteredAppointments]
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
                                                            {status === 'completed' || status === 'realizado' ? (
                                                                <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-[9px] uppercase font-black flex items-center gap-1">
                                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Realizado
                                                                </span>
                                                            ) : status === 'cancelled' || status === 'cancelado' ? (
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

                    {/* Historial de Transacciones */}
                    <div>
                        <ClientLedger
                            appointments={appointments}
                            credits={credits}
                            giftCards={receivedGiftCards}
                            loading={historyLoading}
                            hideSummary
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}
