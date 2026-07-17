'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getFinanceOverview, FinanceOverview, FinanceMovement } from '@/lib/firebase/finance';
import { getUnpaidAppointmentsFromDate, UnpaidAppointment, getAppointmentById } from '@/lib/firebase/appointments';
import { Appointment } from '@/lib/types/appointment';
import { deleteEgreso, createEgreso } from '@/lib/firebase/egresos';
import { QuickPaymentModal } from '@/components/appointments/QuickPaymentModal';
import { getTodayDate, formatDate, getDayWeekMonthRange } from '@/lib/utils/time';
import { BALANCE_SINCE } from '@/lib/utils/clientLedger';
import { formatCurrencyWithSymbol, sanitizeDecimalInput } from '@/lib/utils/currency';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    CreditCard,
    Wallet,
    PieChart,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Users,
    ShoppingBag,
    Zap,
    BookText,
    Filter,
    ArrowUpDown,
    AlertCircle,
    X,
    Plus,
    CheckCircle2,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { EGRESO_CATEGORY_LABEL, EgresoCategory } from '@/lib/types/egreso';

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    debit: 'T. Débito',
    credit: 'T. Crédito',
    qr: 'QR / Digital',
};

interface LiquidatePayment {
    id: string;
    method: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    amount: string;
    bankAccount?: 'cuenta1' | 'cuenta2' | null;
}

export default function FinanzasPage() {
    const { profile } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<FinanceOverview | null>(null);
    const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'custom'>('day');
    const [customRange, setCustomRange] = useState({
        start: getTodayDate(),
        end: getTodayDate()
    });
    const [currentDate, setCurrentDate] = useState(new Date());
    const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
    const [visibleMovements, setVisibleMovements] = useState(20);
    const [typeFilter, setTypeFilter] = useState<'all' | 'ingreso' | 'egreso'>('all');
    const [unpaidAppointments, setUnpaidAppointments] = useState<UnpaidAppointment[]>([]);
    const [showUnpaid, setShowUnpaid] = useState(false);
    const [selectedMovement, setSelectedMovement] = useState<FinanceMovement | null>(null);
    const [detailApt, setDetailApt] = useState<Appointment | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showAptModal, setShowAptModal] = useState(false);
    const [showEgresoDetail, setShowEgresoDetail] = useState(false);
    const [periodRange, setPeriodRange] = useState({ start: '', end: '' });
    const [liquidateModalOpen, setLiquidateModalOpen] = useState(false);
    const [liquidatingMovement, setLiquidatingMovement] = useState<FinanceMovement | null>(null);
    const [liquidatePayments, setLiquidatePayments] = useState<LiquidatePayment[]>([]);
    const [liquidating, setLiquidating] = useState(false);

    const isAdmin = profile?.role === 'admin';
    const isSecretary = profile?.role === 'secretary';
    const isContador = profile?.role === 'contador';
    const canSeeIncome = isAdmin || isSecretary || isContador;
    const canSeeAdminMetrics = isAdmin || isSecretary;

    useEffect(() => {
        loadData();
        setVisibleMovements(20);
        setTypeFilter('all');
    }, [dateRange, currentDate, customRange, profile]);

    useEffect(() => {
        if (!isAdmin && !isSecretary) return;
        getUnpaidAppointmentsFromDate(BALANCE_SINCE)
            .then(setUnpaidAppointments)
            .catch((error) => {
                console.error('Error loading unpaid appointments:', error);
                toast.error('Error al cargar los turnos sin cobrar');
            });
    }, [isAdmin, isSecretary]);

    const loadData = async () => {
        if (!profile) return;
        setLoading(true);
        try {
            let start = '';
            let end = '';

            if (dateRange === 'custom') {
                start = customRange.start;
                end = customRange.end;
            } else {
                ({ start, end } = getDayWeekMonthRange(dateRange, currentDate));
            }

            setPeriodRange({ start, end });
            const data = await getFinanceOverview(start, end);
            setOverview(data);
        } catch (error) {
            console.error('Error loading finance data:', error);
            toast.error('Error al cargar datos financieros');
        } finally {
            setLoading(false);
        }
    };

    const navigateDate = (direction: number) => {
        const d = new Date(currentDate);
        if (dateRange === 'day') d.setDate(d.getDate() + direction);
        else if (dateRange === 'week') d.setDate(d.getDate() + (direction * 7));
        else d.setMonth(d.getMonth() + direction);
        setCurrentDate(d);
    };

    const formatCurrency = formatCurrencyWithSymbol;

    const getDateLabel = () => {
        if (dateRange === 'day') return currentDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
        if (dateRange === 'week') return `Semana del ${currentDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`;
        return currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    };

    const toggleMetric = (metric: string) => {
        setExpandedMetric(expandedMetric === metric ? null : metric);
    };

    const handleMovementClick = async (m: FinanceMovement) => {
        if (m.referenceType === 'appointment' && m.referenceId) {
            setDetailLoading(true);
            try {
                const apt = await getAppointmentById(m.referenceId);
                if (apt) {
                    setDetailApt(apt);
                    setShowAptModal(true);
                }
            } catch {
                toast.error('No se pudo cargar el turno');
            } finally {
                setDetailLoading(false);
            }
        } else if (m.referenceType === 'egreso') {
            setSelectedMovement(m);
            setShowEgresoDetail(true);
        } else if (m.referenceType === 'commission') {
            router.push('/egresos');
        }
    };

    const handleDeleteEgreso = async () => {
        if (!selectedMovement) return;
        setDetailLoading(true);
        try {
            await deleteEgreso(selectedMovement.id);
            toast.success('Gasto eliminado');
            setShowEgresoDetail(false);
            setSelectedMovement(null);
            loadData();
        } catch {
            toast.error('Error al eliminar el gasto');
        } finally {
            setDetailLoading(false);
        }
    };

    const openLiquidate = (movement: FinanceMovement) => {
        setLiquidatingMovement(movement);
        setLiquidatePayments([{ id: Date.now().toString(), method: 'cash', amount: String(movement.amount), bankAccount: null }]);
        setLiquidateModalOpen(true);
    };

    const handleLiquidate = async () => {
        if (!liquidatingMovement || !liquidatingMovement.referenceId) return;

        const amount = liquidatePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const hasInvalidPayment = liquidatePayments.some(p =>
            !p.amount || Number(p.amount) <= 0 ||
            ((p.method === 'transfer' || p.method === 'qr' || p.method === 'debit') && !p.bankAccount)
        );

        if (liquidatePayments.length === 0 || amount <= 0 || hasInvalidPayment) {
            toast.error('Completá el monto y el método de pago de cada pago');
            return;
        }

        setLiquidating(true);
        try {
            const professionalName = liquidatingMovement.description.replace('Comisión (Pendiente): ', '');
            const payments = liquidatePayments.map(p => ({
                id: p.id,
                method: p.method,
                amount: Number(p.amount),
                bankAccount: p.method !== 'cash' ? (p.bankAccount || 'cuenta1') : null,
            }));

            await createEgreso({
                date: getTodayDate(),
                category: 'sueldos',
                amount,
                description: `Liquidación comisión: ${professionalName}`,
                payments,
                paymentMethod: payments[0].method,
                bankAccount: payments[0].bankAccount,
                professionalId: liquidatingMovement.referenceId,
                isCommissionPayment: true,
                commissionPeriodStart: periodRange.start,
                commissionPeriodEnd: periodRange.end,
            });

            toast.success('Comisión liquidada');
            setLiquidateModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error liquidando comisión:', error);
            toast.error('Error al liquidar la comisión');
        } finally {
            setLiquidating(false);
        }
    };

    if (loading && !overview) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-[#34baab]" />
            </div>
        );
    }

    const personalData = profile?.uid && overview?.byProfessional ? (
        Object.values(overview.byProfessional).find(p => p.userId === profile.uid) || null
    ) : null;

    const totalUnpaid = unpaidAppointments.reduce((sum, a) => sum + a.amountDue, 0);

    const pendingCommissionByName: Record<string, FinanceMovement> = {};
    (overview?.movements || []).forEach(m => {
        if (m.type === 'egreso' && m.id.startsWith('comm_') && m.referenceId) {
            pendingCommissionByName[m.id] = m;
        }
    });

    const methodLabels: Record<string, string> = {
        cash: 'Efectivo',
        cuenta1: 'Cuenta 1',
        cuenta2: 'Cuenta 2',
        debit: 'Débito',
        credit: 'Crédito',
        qr: 'QR / Digital',
        transfer: 'Transferencia',
    };

    return (
        <>
        <div className="min-h-screen bg-gray-50 pb-24 font-sans">
            <Toaster position="top-center" richColors />

            {/* Header */}
            <div className="bg-[#484450] text-white pt-12 pb-20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#34baab]/10 rounded-full -mr-48 -mt-48 blur-3xl" />
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                            <DollarSign className="w-8 h-8 text-[#34baab]" />
                        </div>
                        {canSeeIncome ? 'Balance Financiero' : 'Mis Ganancias'}
                    </h1>
                    <p className="text-gray-300 font-medium">
                        {canSeeIncome ? 'Resumen general de ingresos y comisiones.' : 'Seguimiento de tus servicios y comisiones.'}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-20">
                {/* Filters & Controls */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-gray-100">
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto">
                        {(['day', 'week', 'month', 'custom'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`flex-1 min-w-[80px] md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${dateRange === range ? 'bg-[#34baab] text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {range === 'day' ? 'Día' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Rango'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        {dateRange === 'custom' ? (
                            <div className="flex flex-col md:flex-row items-center gap-4">
                                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200">
                                    <label htmlFor="date-desde" className="text-[10px] font-black uppercase text-gray-400">Desde:</label>
                                    <input
                                        id="date-desde"
                                        type="date"
                                        value={customRange.start}
                                        onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="bg-transparent border-none text-gray-800 font-bold text-sm focus:ring-0 outline-none p-0"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200">
                                    <label htmlFor="date-hasta" className="text-[10px] font-black uppercase text-gray-400">Hasta:</label>
                                    <input
                                        id="date-hasta"
                                        type="date"
                                        value={customRange.end}
                                        onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="bg-transparent border-none text-gray-800 font-bold text-sm focus:ring-0 outline-none p-0"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200">
                                <button aria-label="Período anterior" onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </button>

                                {dateRange === 'day' ? (
                                    <input
                                        aria-label="Seleccionar fecha"
                                        type="date"
                                        value={formatDate(currentDate)}
                                        onChange={(e) => setCurrentDate(new Date(e.target.value + 'T00:00:00'))}
                                        className="bg-transparent border-none text-gray-800 font-black text-sm focus:ring-0 outline-none p-0 text-center uppercase tracking-tight"
                                    />
                                ) : (
                                    <span className="text-sm font-black text-gray-800 min-w-[150px] text-center capitalize">
                                        {getDateLabel()}
                                    </span>
                                )}

                                <button aria-label="Período siguiente" onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                    <ChevronRight className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Deuda Pendiente - fija, independiente del rango de fechas */}
                {(isAdmin || isSecretary) && (
                    <div className="mt-6 mb-2">
                        <button
                            onClick={() => setShowUnpaid(prev => !prev)}
                            className={`w-full bg-white rounded-2xl p-4 shadow-sm border transition-all flex items-center gap-4 text-left ${showUnpaid ? 'border-orange-400 ring-1 ring-orange-400/20' : unpaidAppointments.length > 0 ? 'border-orange-200 hover:shadow-md' : 'border-gray-100 hover:shadow-md'}`}
                        >
                            <div className={`p-2.5 rounded-xl ${unpaidAppointments.length > 0 ? 'bg-orange-50 text-orange-500' : 'bg-gray-50 text-gray-400'}`}>
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-gray-400 font-black uppercase tracking-widest text-[9px] mb-0.5">Turnos sin cobrar</h3>
                                <div className="flex items-baseline gap-2">
                                    <p className={`text-lg font-black ${unpaidAppointments.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                        {formatCurrency(totalUnpaid)}
                                    </p>
                                    <span className="text-[10px] font-bold text-gray-400">
                                        {unpaidAppointments.length} turno{unpaidAppointments.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showUnpaid ? 'rotate-180' : ''}`} />
                        </button>

                        {showUnpaid && (
                            <div className="mt-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                {unpaidAppointments.length === 0 ? (
                                    <p className="p-6 text-center text-sm text-gray-400 font-medium">Sin deudas pendientes desde mayo 2026</p>
                                ) : (
                                    <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                                        {unpaidAppointments.map(apt => (
                                            <div key={apt.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-800 truncate">{apt.clientName}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                        {apt.date.split('-').reverse().join('/')} · {apt.time} · {apt.treatment}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                                        Pagó {formatCurrency(apt.totalPaid)} de {formatCurrency(apt.price ?? 0)}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-sm font-black text-orange-600">{formatCurrency(apt.amountDue)}</p>
                                                    <button
                                                        onClick={() => router.push('/turnos?date=' + apt.date)}
                                                        className="text-[9px] font-bold text-[#34baab] hover:underline uppercase tracking-wide mt-0.5 block"
                                                    >
                                                        Ver turno
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-6 mt-8">
                    {/* 1. Top Metrics Bar - Interactive Tiles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                        {/* Saldo Neto */}
                        {canSeeAdminMetrics && (
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => toggleMetric('saldo')}
                                    className={`w-full bg-white rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-sm border transition-all flex items-center gap-3 md:gap-4 text-left ${expandedMetric === 'saldo' ? 'border-[#34baab] shadow-md ring-1 ring-[#34baab]/20' : 'border-gray-100 hover:shadow-md'}`}
                                >
                                    <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl ${(overview?.saldo ?? 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        <Wallet className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-gray-400 font-black uppercase tracking-widest text-[8px] md:text-[9px] mb-0.5 truncate">Saldo Neto</h3>
                                        <p className={`text-base md:text-xl font-black truncate ${(overview?.saldo ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                            {formatCurrency(overview?.saldo || 0)}
                                        </p>
                                    </div>
                                    <ArrowUpDown className={`w-3 h-3 text-gray-300 transition-transform flex-shrink-0 ${expandedMetric === 'saldo' ? 'rotate-180' : ''}`} />
                                </button>
                                {expandedMetric === 'saldo' && (() => {
                                    const saldoByMethod = Object.keys(overview?.incomeByMethodDetailed || {}).reduce((acc, key) => {
                                        // commissions are virtual egresos assigned to cash — subtract them from cash bucket so totals match
                                        const commAdj = key === 'cash' ? (overview!.totalProfCommissions || 0) : 0;
                                        const net = (overview!.incomeByMethodDetailed[key] || 0) - (overview!.egresosByMethod[key] || 0) - commAdj;
                                        if (net !== 0) acc[key] = net;
                                        return acc;
                                    }, {} as Record<string, number>);
                                    return (
                                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 duration-200 space-y-2.5">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-1">Saldo disponible por lugar:</p>
                                            {Object.entries(saldoByMethod).map(([key, val]) => (
                                                <div key={key} className="flex justify-between items-center">
                                                    <span className="text-xs font-medium text-gray-600">{methodLabels[key] || key}</span>
                                                    <span className={`text-sm font-black ${val >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(val)}</span>
                                                </div>
                                            ))}
                                            {Object.keys(saldoByMethod).length === 0 && (
                                                <p className="text-xs text-gray-400 italic">Sin movimientos en este período</p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Ingresos Totales */}
                        {canSeeIncome && (
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => toggleMetric('ingresos')}
                                    className={`w-full bg-[#484450] rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-sm border transition-all flex items-center gap-3 md:gap-4 text-left ${expandedMetric === 'ingresos' ? 'border-[#34baab] ring-1 ring-[#34baab]/50' : 'border-white/5 hover:shadow-lg'}`}
                                >
                                    <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-[#34baab]/20 text-[#34baab]">
                                        <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-gray-400 font-black uppercase tracking-widest text-[8px] md:text-[9px] mb-0.5 truncate">Ingresos</h3>
                                        <p className="text-base md:text-xl font-black text-white truncate">{formatCurrency(overview?.totalIncome || 0)}</p>
                                    </div>
                                    <ArrowUpDown className={`w-3 h-3 text-gray-500 transition-transform flex-shrink-0 ${expandedMetric === 'ingresos' ? 'rotate-180' : ''}`} />
                                </button>
                                {expandedMetric === 'ingresos' && (
                                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 duration-200 space-y-3">
                                        <div className="space-y-2 pb-3 border-b border-gray-100">
                                            {[
                                                { label: 'Servicios', val: overview?.totalServiceIncome },
                                                { label: 'Señas / Parciales', val: overview?.totalPartialIncome },
                                                { label: 'Productos', val: overview?.totalProductIncome },
                                                { label: 'Alquileres', val: overview?.totalRentalIncome },
                                                { label: 'Gift Cards', val: overview?.totalGiftCardIncome },
                                            ].filter(i => (i.val || 0) > 0).map(i => (
                                                <div key={i.label} className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-gray-500 uppercase">{i.label}</span>
                                                    <span className="text-sm font-black text-gray-700">{formatCurrency(i.val || 0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Por Método de Pago:</p>
                                        <div className="space-y-2">
                                            {Object.entries(overview?.incomeByMethodDetailed || {}).map(([key, val]) => val > 0 && (
                                                <div key={key} className="flex justify-between items-center">
                                                    <span className="text-xs font-medium text-gray-600">{methodLabels[key] || key}</span>
                                                    <span className="text-sm font-black text-emerald-600">{formatCurrency(val)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Egresos Totales */}
                        {canSeeAdminMetrics && (
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => toggleMetric('egresos')}
                                    className={`w-full bg-white rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-sm border transition-all flex items-center gap-3 md:gap-4 text-left ${expandedMetric === 'egresos' ? 'border-red-500 ring-1 ring-red-500/20' : 'border-gray-100 hover:shadow-md'}`}
                                >
                                    <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-red-50 text-red-500">
                                        <TrendingDown className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-gray-400 font-black uppercase tracking-widest text-[8px] md:text-[9px] mb-0.5 truncate">Egresos</h3>
                                        <p className="text-base md:text-xl font-black text-gray-900 truncate">{formatCurrency(overview?.totalEgresosGeneral || 0)}</p>
                                    </div>
                                    <ArrowUpDown className={`w-3 h-3 text-gray-300 transition-transform flex-shrink-0 ${expandedMetric === 'egresos' ? 'rotate-180' : ''}`} />
                                </button>
                                {expandedMetric === 'egresos' && (
                                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 duration-200 space-y-3">
                                        <div className="space-y-2 pb-3 border-b border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-500 uppercase">Gastos</span>
                                                <span className="text-sm font-black text-gray-700">{formatCurrency(overview?.totalEgresos || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-500 uppercase">Comisiones</span>
                                                <span className="text-sm font-black text-gray-700">{formatCurrency(overview?.totalProfCommissions || 0)}</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Por Método de Pago:</p>
                                        <div className="space-y-2 pb-3 border-b border-gray-100">
                                            {Object.entries(overview?.egresosByMethod || {}).filter(([, val]) => val > 0).length === 0 ? (
                                                <p className="text-xs text-gray-400 italic">Sin egresos manuales en este período</p>
                                            ) : Object.entries(overview?.egresosByMethod || {}).map(([key, val]) => val > 0 && (
                                                <div key={key} className="flex justify-between items-center">
                                                    <span className="text-xs font-medium text-gray-600">{methodLabels[key] || key}</span>
                                                    <span className="text-sm font-black text-red-500">{formatCurrency(val)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Por Categoría:</p>
                                        <div className="max-h-[160px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                            {Object.entries(overview?.egresosByCategory || {}).map(([cat, val]) => (
                                                <div key={cat} className="flex justify-between items-center">
                                                    <span className="text-xs font-medium text-gray-600 truncate pr-2">{EGRESO_CATEGORY_LABEL[cat as EgresoCategory] || cat}</span>
                                                    <span className="text-sm font-black text-gray-700">{formatCurrency(val)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Comisiones/Ganancias */}
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => toggleMetric('comisiones')}
                                className={`w-full rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-sm border transition-all flex items-center gap-3 md:gap-4 text-left ${canSeeAdminMetrics ? (expandedMetric === 'comisiones' ? 'bg-white border-amber-500 ring-1 ring-amber-500/20' : 'bg-white border-gray-100 hover:shadow-md') : 'bg-[#34baab] border-none shadow-md text-white'}`}
                            >
                                <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl ${canSeeAdminMetrics ? 'bg-amber-50 text-amber-500' : 'bg-white/20 text-white'}`}>
                                    {canSeeAdminMetrics ? <Users className="w-5 h-5 md:w-6 md:h-6" /> : <DollarSign className="w-5 h-5 md:w-6 md:h-6" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-black uppercase tracking-widest text-[8px] md:text-[9px] mb-0.5 truncate ${canSeeAdminMetrics ? 'text-gray-400' : 'text-white/70'}`}>
                                        {canSeeAdminMetrics ? 'Comisiones' : 'Mi Ganancia'}
                                    </h3>
                                    <p className={`text-base md:text-xl font-black truncate ${canSeeAdminMetrics ? 'text-gray-900' : 'text-white'}`}>
                                        {formatCurrency(canSeeAdminMetrics
                                            ? Object.values(overview?.byProfessional || {}).reduce((s, d) => s + (d.totalCommission || 0), 0)
                                            : (personalData?.totalCommission || 0))}
                                    </p>
                                </div>
                                {canSeeAdminMetrics && <ArrowUpDown className={`w-3 h-3 text-gray-300 transition-transform flex-shrink-0 ${expandedMetric === 'comisiones' ? 'rotate-180' : ''}`} />}
                            </button>
                            {canSeeAdminMetrics && expandedMetric === 'comisiones' && (
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                    <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                                        {Object.entries(overview?.byProfessional || {}).map(([id, data]) => {
                                            if (data.totalCommission <= 0) return null;
                                            const commId = `comm_${data.name.replace(/\s+/g, '_')}`;
                                            const pendingMovement = pendingCommissionByName[commId];
                                            return (
                                                <div key={id} className="pb-3 border-b border-gray-100 last:border-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm font-bold text-gray-800">{data.name}</span>
                                                        <span className="text-sm font-black text-amber-600">{formatCurrency(data.totalCommission)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                            {data.serviceCommission > 0 && <span className="text-xs text-gray-500">Serv: <span className="font-bold text-gray-700">{formatCurrency(data.serviceCommission)}</span></span>}
                                                            {data.productCommission > 0 && <span className="text-xs text-gray-500">Prod: <span className="font-bold text-gray-700">{formatCurrency(data.productCommission)}</span></span>}
                                                            {data.rentalCommission > 0 && <span className="text-xs text-gray-500">Alq: <span className="font-bold text-gray-700">{formatCurrency(data.rentalCommission)}</span></span>}
                                                            {data.aparatoFee > 0 && <span className="text-xs text-gray-500">Ap: <span className="font-bold text-gray-700">{formatCurrency(data.aparatoFee)}</span></span>}
                                                        </div>
                                                        {pendingMovement && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openLiquidate(pendingMovement)}
                                                                className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm shrink-0"
                                                            >
                                                                <DollarSign className="w-2.5 h-2.5" />
                                                                Liquidar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>


                    {/* 3. Libro Diario - REFINED TABLE WITH LOAD MORE */}
                    {canSeeIncome && (
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[#34baab]/10 rounded-xl">
                                        <BookText className="w-5 h-5 text-[#34baab]" />
                                    </div>
                                    <div>
                                        <h3 className="text-gray-800 font-black text-lg">Libro Diario</h3>
                                        <p className="text-[10px] text-gray-400 font-medium">Movimientos financieros detallados</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100 self-end md:self-auto">
                                    <Filter className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
                                    <select
                                        aria-label="Filtrar por tipo de movimiento"
                                        value={typeFilter}
                                        onChange={(e) => {
                                            setTypeFilter(e.target.value as any);
                                            setVisibleMovements(20);
                                        }}
                                        className="bg-transparent border-none text-[10px] font-bold text-gray-600 focus:ring-0 outline-none pr-7 py-1"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="ingreso">Ingresos</option>
                                        <option value="egreso">Egresos</option>
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-x-auto -mx-6 px-6">
                                <table className="w-full text-left table-fixed min-w-[620px]">
                                    <thead>
                                        <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                                            <th className="w-[90px] px-2 py-3">Fecha</th>
                                            <th className="w-[72px] px-2 py-3">Tipo</th>
                                            <th className="w-[96px] px-2 py-3">Categoría</th>
                                            <th className="w-[150px] px-2 py-3">Descripción</th>
                                            <th className="w-[80px] px-2 py-3">Cuenta</th>
                                            <th className="w-[110px] px-2 py-3 text-right">Monto</th>
                                            <th className="w-[110px] px-2 py-3 text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {overview?.movements
                                            .filter(m => typeFilter === 'all' || m.type === typeFilter)
                                            .slice(0, visibleMovements)
                                            .map((m, idx) => (
                                            <tr
                                                key={m.id + idx}
                                                className={`transition-colors hover:bg-gray-50 ${(m.referenceType === 'appointment' || m.referenceType === 'egreso' || m.referenceType === 'commission') ? 'cursor-pointer' : ''}`}
                                                onClick={() => handleMovementClick(m)}
                                            >
                                                <td className="px-2 py-3">
                                                    <span className="text-xs font-bold text-gray-700">{m.date.split('-').reverse().join('/')}</span>
                                                </td>
                                                <td className="px-2 py-3">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${
                                                        m.type === 'ingreso' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                        {m.type === 'ingreso' ? 'Ingr.' : 'Egr.'}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-3">
                                                    <span className="text-xs font-bold capitalize truncate block text-gray-700" title={m.category}>{m.category}</span>
                                                </td>
                                                <td className="px-2 py-3">
                                                    <span className="text-xs text-gray-500 font-medium truncate block" title={m.description}>
                                                        {m.description}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-3">
                                                    <div className="flex flex-col leading-tight">
                                                        <span className="text-xs font-bold text-gray-600 uppercase">
                                                            {m.method === 'cash' ? 'Efect.' : m.method === 'transfer' ? 'Transf.' : m.method === 'qr' ? 'Digital' : m.method}
                                                        </span>
                                                        {m.bankAccount && (
                                                            <span className="text-[10px] font-black text-[#34baab] uppercase">
                                                                {m.bankAccount === 'cuenta1' ? 'Cta 1' : 'Cta 2'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 text-right">
                                                    <span className={`text-xs font-black ${m.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {m.type === 'ingreso' ? '+' : '-'}{formatCurrency(m.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-3 text-right">
                                                    <span className="text-xs font-black text-gray-900">{formatCurrency(m.balance || 0)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {overview && overview.movements.length > visibleMovements && (
                                <div className="mt-8 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setVisibleMovements(prev => prev + 20)}
                                        className="px-6 py-2 bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#34baab] hover:text-white transition-all shadow-sm"
                                    >
                                        Ver Más Movimientos (+20)
                                    </button>
                                </div>
                            )}

                            {overview?.movements.length === 0 && (
                                <div className="py-8 text-center text-gray-400 italic text-xs">
                                    Sin movimientos en este periodo.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Modal: detalle de turno */}
        {detailApt && (
            <QuickPaymentModal
                isOpen={showAptModal}
                onClose={() => { setShowAptModal(false); setDetailApt(null); }}
                appointment={detailApt}
                onSuccess={() => { setShowAptModal(false); setDetailApt(null); loadData(); }}
            />
        )}

        {/* Modal: detalle de egreso */}
        {showEgresoDetail && selectedMovement && (
            <div
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
                onClick={() => setShowEgresoDetail(false)}
            >
                <div
                    className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 space-y-5"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between">
                        <h2 className="font-black text-lg text-gray-900">Detalle de Gasto</h2>
                        <button
                            type="button"
                            onClick={() => setShowEgresoDetail(false)}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                    <div className="space-y-3 bg-gray-50 rounded-2xl p-4">
                        {[
                            { label: 'Fecha', value: selectedMovement.date.split('-').reverse().join('/') },
                            { label: 'Categoría', value: EGRESO_CATEGORY_LABEL[selectedMovement.category as EgresoCategory] || selectedMovement.category },
                            { label: 'Descripción', value: selectedMovement.description },
                            { label: 'Método', value: methodLabels[selectedMovement.method] || selectedMovement.method },
                            { label: 'Monto', value: formatCurrency(selectedMovement.amount) },
                        ].map(row => (
                            <div key={row.label} className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{row.label}</span>
                                <span className={`text-sm font-bold ${row.label === 'Monto' ? 'text-red-600' : 'text-gray-800'}`}>{row.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => router.push('/egresos')}
                            className="flex-1"
                        >
                            Ir a Egresos
                        </Button>
                        <Button
                            type="button"
                            onClick={handleDeleteEgreso}
                            disabled={detailLoading}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black"
                        >
                            {detailLoading ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal: Liquidar Comisión */}
        {liquidateModalOpen && liquidatingMovement && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-[#34baab]/20 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-[#34baab]" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900">Liquidar Comisión</h2>
                    </div>

                    <p className="text-sm text-gray-500 font-medium">
                        Registrá el pago para <span className="font-bold text-gray-700">{liquidatingMovement.description.replace('Comisión (Pendiente): ', '')}</span> por el período mostrado. Comisión calculada: <span className="font-bold text-gray-700">{formatCurrency(liquidatingMovement.amount)}</span>. Podés ajustar el monto final para sumar un incentivo o aplicar un descuento.
                    </p>

                    <div className="pt-2 max-h-[50vh] overflow-y-auto pr-1 -mr-1">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-500">Desglose de Pagos *</label>
                            <button
                                type="button"
                                onClick={() => setLiquidatePayments(p => [...p, { id: Date.now().toString(), method: 'cash', amount: '', bankAccount: null }])}
                                className="text-[10px] font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 text-gray-600"
                            >
                                <Plus className="w-3 h-3" /> Agregar Pago
                            </button>
                        </div>

                        <div className="space-y-3">
                            {liquidatePayments.map((p, idx) => (
                                <div key={p.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative">
                                    {liquidatePayments.length > 1 && (
                                        <button
                                            type="button"
                                            aria-label="Eliminar pago"
                                            onClick={() => setLiquidatePayments(ps => ps.filter(pay => pay.id !== p.id))}
                                            className="absolute -top-2 -right-2 bg-white border border-gray-200 text-red-500 p-1.5 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor={`fin-liq-method-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Medio</label>
                                            <select
                                                id={`fin-liq-method-${idx}`}
                                                value={p.method}
                                                onChange={e => {
                                                    const method = e.target.value as LiquidatePayment['method'];
                                                    setLiquidatePayments(ps => ps.map((pay, i) => i !== idx ? pay : {
                                                        ...pay,
                                                        method,
                                                        bankAccount: method === 'cash' ? null : pay.bankAccount,
                                                    }));
                                                }}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-white"
                                            >
                                                {Object.entries(PAYMENT_LABELS).map(([val, label]) => (
                                                    <option key={val} value={val}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor={`fin-liq-amount-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Monto</label>
                                            <input
                                                id={`fin-liq-amount-${idx}`}
                                                type="text"
                                                inputMode="decimal"
                                                value={p.amount}
                                                onChange={e => {
                                                    const amount = sanitizeDecimalInput(e.target.value);
                                                    setLiquidatePayments(ps => ps.map((pay, i) => i !== idx ? pay : { ...pay, amount }));
                                                }}
                                                placeholder="0"
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-white"
                                            />
                                        </div>
                                    </div>

                                    {p.method !== 'cash' && (
                                        <div className="mt-3">
                                            <label htmlFor={`fin-liq-account-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Cuenta</label>
                                            <select
                                                id={`fin-liq-account-${idx}`}
                                                value={p.bankAccount || 'cuenta1'}
                                                onChange={e => {
                                                    const bankAccount = e.target.value as NonNullable<LiquidatePayment['bankAccount']>;
                                                    setLiquidatePayments(ps => ps.map((pay, i) => i !== idx ? pay : { ...pay, bankAccount }));
                                                }}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-white"
                                            >
                                                <option value="cuenta1">Cuenta 1</option>
                                                <option value="cuenta2">Cuenta 2</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total a Liquidar:</span>
                        <span className="text-lg font-black text-[#34baab]">
                            {formatCurrency(liquidatePayments.reduce((s, p) => s + (Number(p.amount) || 0), 0))}
                        </span>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setLiquidateModalOpen(false)}
                            className="flex-1 py-3 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleLiquidate}
                            disabled={liquidating}
                            className="flex-1 py-3 rounded-2xl bg-[#34baab] hover:bg-[#2da598] text-white font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {liquidating ? 'Liquidando...' : 'Confirmar Pago'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
