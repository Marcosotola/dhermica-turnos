'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getFinanceOverview, FinanceOverview, FinanceMovement, addDays } from '@/lib/firebase/finance';
import { getAllCashCounts, createCashCount, deleteCashCount } from '@/lib/firebase/cashCounts';
import { getBalancesAt } from '@/lib/firebase/cashBalance';
import { PlaceBalances } from '@/lib/utils/cashBalance';
import { CashCount, BALANCE_PLACES } from '@/lib/types/cashCount';
import { getUnpaidAppointmentsFromDate, UnpaidAppointment, getAppointmentById } from '@/lib/firebase/appointments';
import { Appointment } from '@/lib/types/appointment';
import { deleteEgreso, createEgreso } from '@/lib/firebase/egresos';
import { QuickPaymentModal } from '@/components/appointments/QuickPaymentModal';
import { EgresoFormModal } from '@/components/egresos/EgresoFormModal';
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
    ClipboardCheck,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { EGRESO_CATEGORY_LABEL, EgresoCategory } from '@/lib/types/egreso';
import { BANK_ACCOUNTS, BankAccount, formatBankAccount } from '@/lib/types/bankAccount';

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
    bankAccount?: BankAccount | null;
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
    const [showCommissionWarnings, setShowCommissionWarnings] = useState(false);
    const [egresoModalOpen, setEgresoModalOpen] = useState(false);
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

    // Saldos acumulados por lugar (arqueo / saldo inicial)
    const [cashCounts, setCashCounts] = useState<CashCount[]>([]);
    const [placeBalances, setPlaceBalances] = useState<{ opening: PlaceBalances; closing: PlaceBalances } | null>(null);
    const [countModalOpen, setCountModalOpen] = useState(false);
    const [countDate, setCountDate] = useState('');
    const [countValues, setCountValues] = useState<Record<string, string>>({});
    const [withdrawValues, setWithdrawValues] = useState<Record<string, string>>({});
    const [countNote, setCountNote] = useState('');
    const [countExpected, setCountExpected] = useState<PlaceBalances | null>(null);
    const [countExpectedLoading, setCountExpectedLoading] = useState(false);
    const [savingCount, setSavingCount] = useState(false);
    const balancesRequest = useRef(0);
    const expectedRequest = useRef(0);

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
            if (canSeeAdminMetrics) void loadBalances(start, end);
        } catch (error) {
            console.error('Error loading finance data:', error);
            toast.error('Error al cargar datos financieros');
        } finally {
            setLoading(false);
        }
    };

    // Saldo inicial y final de cada lugar para el período mostrado, a partir de los arqueos.
    // Se carga aparte: si falla, el resto de Finanzas sigue funcionando.
    const loadBalances = async (start: string, end: string) => {
        const requestId = ++balancesRequest.current;
        try {
            const counts = await getAllCashCounts();
            const dayBefore = addDays(start, -1);
            const snapshots = await getBalancesAt([dayBefore, end], counts);
            if (requestId !== balancesRequest.current) return;
            setCashCounts(counts);
            setPlaceBalances({ opening: snapshots[dayBefore], closing: snapshots[end] });
        } catch (error) {
            console.error('Error loading balances:', error);
            if (requestId === balancesRequest.current) setPlaceBalances(null);
        }
    };

    // Lo que el sistema calcula que debería haber en cada lugar al cierre de `date`,
    // sin contar arqueos de ese mismo día (para poder compararlo contra lo que se cuenta).
    const refreshCountExpected = async (date: string, counts: CashCount[]) => {
        const requestId = ++expectedRequest.current;
        setCountExpectedLoading(true);
        try {
            const snapshots = await getBalancesAt([date], counts.filter(c => c.date < date));
            if (requestId === expectedRequest.current) setCountExpected(snapshots[date]);
        } catch (error) {
            console.error('Error calculando saldo esperado:', error);
            if (requestId === expectedRequest.current) setCountExpected(null);
        } finally {
            if (requestId === expectedRequest.current) setCountExpectedLoading(false);
        }
    };

    const openCountModal = () => {
        const today = getTodayDate();
        setCountDate(today);
        setCountValues({});
        setWithdrawValues({});
        setCountNote('');
        setCountExpected(null);
        setCountModalOpen(true);
        void refreshCountExpected(today, cashCounts);
    };

    const handleSaveCount = async () => {
        if (!countDate) {
            toast.error('Elegí la fecha del arqueo');
            return;
        }
        if (countDate > getTodayDate()) {
            toast.error('La fecha del arqueo no puede ser futura');
            return;
        }

        // balances = lo que QUEDA después de retirar (arrastra al día siguiente);
        // counted = lo contado antes de retirar (se compara contra lo que calcula el sistema)
        const balances: Record<string, number> = {};
        const counted: Record<string, number> = {};
        const expected: Record<string, number> = {};
        for (const { key, label } of BALANCE_PLACES) {
            const raw = countValues[key];
            if (raw === undefined || raw === '') continue;
            const value = Number(raw);
            if (!Number.isFinite(value)) continue;

            const withdrawn = Number(withdrawValues[key]) || 0;
            if (withdrawn > value) {
                toast.error(`${label}: el retiro (${formatCurrency(withdrawn)}) no puede ser mayor a lo contado (${formatCurrency(value)})`);
                return;
            }

            counted[key] = value;
            balances[key] = Math.round((value - withdrawn) * 100) / 100;
            const exp = countExpected?.[key];
            if (exp !== null && exp !== undefined) expected[key] = exp;
        }
        if (Object.keys(balances).length === 0) {
            toast.error('Cargá el monto de al menos un lugar');
            return;
        }

        setSavingCount(true);
        try {
            await createCashCount({
                date: countDate,
                balances,
                counted,
                expected,
                note: countNote.trim() || undefined,
                createdBy: profile?.uid,
            });
            toast.success('Arqueo registrado');
            setCountModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error guardando arqueo:', error);
            toast.error('Error al guardar el arqueo');
        } finally {
            setSavingCount(false);
        }
    };

    const handleDeleteCount = async (count: CashCount) => {
        const label = count.date.split('-').reverse().join('/');
        if (!window.confirm(`¿Eliminar el arqueo del ${label}? Los saldos se van a recalcular desde el arqueo anterior.`)) return;
        try {
            await deleteCashCount(count.id);
            toast.success('Arqueo eliminado');
            setCountModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error eliminando arqueo:', error);
            toast.error('Error al eliminar el arqueo');
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
            // Un gasto pagado con varios métodos genera varios movimientos: se elimina el gasto entero.
            await deleteEgreso(selectedMovement.referenceId || selectedMovement.id);
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
            const isStaffWage = liquidatingMovement.description.startsWith('Sueldo (Pendiente): ');
            const professionalName = liquidatingMovement.description.replace(/^(Comisión|Sueldo) \(Pendiente\): /, '');
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
                description: `Liquidación ${isStaffWage ? 'sueldo' : 'comisión'}: ${professionalName}`,
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

    const ledgerMovements = (overview?.movements || []).filter(m => !m.isPending);

    // Un gasto pagado con varios métodos aparece como varios movimientos: el detalle muestra
    // el gasto completo con cada pago.
    const egresoParts = selectedMovement?.referenceType === 'egreso'
        ? (overview?.movements || []).filter(m => m.referenceType === 'egreso' && m.referenceId === selectedMovement.referenceId)
        : [];
    const egresoTotal = egresoParts.reduce((sum, m) => sum + m.amount, 0);

    const methodLabels: Record<string, string> = {
        cash: 'Efectivo',
        cuenta1: 'Cuenta Brubank',
        cuenta2: 'Cuenta Reba',
        mercadopago: 'Mercado Pago',
        prex: 'Prex',
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

                {/* Turnos que no generaron comisión (realizados en $0 o cobrados pero pendientes): muestra el motivo para poder corregirlo */}
                {(isAdmin || isSecretary) && (overview?.commissionWarnings.length ?? 0) > 0 && (
                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={() => setShowCommissionWarnings(prev => !prev)}
                            className={`w-full bg-white rounded-2xl p-4 shadow-sm border transition-all flex items-center gap-4 text-left ${showCommissionWarnings ? 'border-amber-400 ring-1 ring-amber-400/20' : 'border-amber-200 hover:shadow-md'}`}
                        >
                            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-500">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-gray-400 font-black uppercase tracking-widest text-[9px] mb-0.5">Turnos sin comisión</h3>
                                <p className="text-sm font-black text-amber-600">
                                    {overview!.commissionWarnings.length} turno{overview!.commissionWarnings.length !== 1 ? 's' : ''} para revisar
                                </p>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${showCommissionWarnings ? 'rotate-180' : ''}`} />
                        </button>

                        {showCommissionWarnings && (
                            <div className="mt-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                                    {overview!.commissionWarnings.map(w => (
                                        <div key={w.appointmentId} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-800">{w.clientName} · {w.treatment}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {w.date.split('-').reverse().join('/')} · Profesional: <span className="font-bold text-gray-600">{w.professionalName}</span>
                                                </p>
                                                <p className="text-xs text-amber-700 font-medium mt-1">{w.reason}</p>
                                            </div>
                                            <button
                                                onClick={() => router.push('/turnos?date=' + w.date)}
                                                className="text-[9px] font-bold text-[#34baab] hover:underline uppercase tracking-wide shrink-0 mt-0.5"
                                            >
                                                Ver turno
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-6 mt-8">
                    {/* 1. Top Metrics Bar - Interactive Tiles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3 items-start">
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
                                        <h3 className="text-gray-400 font-black uppercase tracking-widest text-[8px] md:text-[9px] mb-0.5 leading-tight">Saldo Neto</h3>
                                        <p className={`text-base md:text-lg 2xl:text-xl font-black break-words leading-tight ${(overview?.saldo ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                            {formatCurrency(overview?.saldo || 0)}
                                        </p>
                                    </div>
                                    <ArrowUpDown className={`w-3 h-3 text-gray-300 transition-transform flex-shrink-0 ${expandedMetric === 'saldo' ? 'rotate-180' : ''}`} />
                                </button>
                                {expandedMetric === 'saldo' && (() => {
                                    // Movimiento del período por lugar (ingresos - egresos)
                                    const rows = BALANCE_PLACES.map(({ key, label }) => ({
                                        key,
                                        label,
                                        net: Math.round(((overview!.incomeByMethodDetailed[key] || 0) - (overview!.egresosByMethod[key] || 0)) * 100) / 100,
                                        opening: placeBalances?.opening[key] ?? null,
                                        closing: placeBalances?.closing[key] ?? null,
                                    })).filter(r => r.net !== 0 || r.opening !== null || r.closing !== null);
                                    const trackedRows = rows.filter(r => r.closing !== null);
                                    const totalClosing = trackedRows.reduce((sum, r) => sum + (r.closing as number), 0);
                                    const signed = (n: number) => `${n >= 0 ? '+' : '-'}${formatCurrency(Math.abs(n))}`;

                                    // Arqueo más reciente dentro del período: muestra lo que faltó o sobró al contar
                                    const countInPeriod = [...cashCounts].reverse().find(c => c.date >= periodRange.start && c.date <= periodRange.end);
                                    const countDiffs = countInPeriod
                                        ? BALANCE_PLACES.map(({ key, label }) => {
                                            const left = countInPeriod.balances[key]; // lo que quedó después de retirar
                                            if (left === undefined) return null;
                                            const counted = countInPeriod.counted?.[key] ?? left; // arqueos viejos: sin retiro
                                            const expected = countInPeriod.expected?.[key];
                                            const withdrawn = Math.round((counted - left) * 100) / 100;
                                            const diff = expected === undefined ? null : Math.round((counted - expected) * 100) / 100;
                                            return { key, label, left, withdrawn, diff };
                                        }).filter((d): d is { key: string; label: string; left: number; withdrawn: number; diff: number | null } => d !== null)
                                        : [];

                                    return (
                                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 duration-200 space-y-2.5">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pb-1">Saldo por lugar al cierre del período:</p>
                                            {rows.map(r => (
                                                <div key={r.key} className="pb-2 border-b border-gray-50 last:border-0">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-medium text-gray-600">{r.label}</span>
                                                        {r.closing !== null ? (
                                                            <span className={`text-sm font-black ${r.closing >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(r.closing)}</span>
                                                        ) : (
                                                            <span className={`text-sm font-black ${r.net >= 0 ? 'text-gray-500' : 'text-red-400'}`}>{signed(r.net)}</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                        {r.closing !== null
                                                            ? `${r.opening !== null ? `Inicial ${formatCurrency(r.opening)}` : 'Sin saldo al inicio'} · Movimiento ${signed(r.net)}`
                                                            : 'Sin saldo inicial cargado · solo movimiento del período'}
                                                    </p>
                                                </div>
                                            ))}
                                            {rows.length === 0 && (
                                                <p className="text-xs text-gray-400 italic">Sin movimientos en este período</p>
                                            )}
                                            {trackedRows.length > 0 && (
                                                <div className="flex justify-between items-center pt-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total con saldo cargado</span>
                                                    <span className="text-sm font-black text-gray-800">{formatCurrency(totalClosing)}</span>
                                                </div>
                                            )}
                                            {countInPeriod && countDiffs.length > 0 && (
                                                <div className="pt-2 mt-1 border-t border-gray-100 space-y-1">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Arqueo del {countInPeriod.date.split('-').reverse().join('/')}:</p>
                                                    {countDiffs.map(d => (
                                                        <div key={d.key} className="flex justify-between items-start gap-2">
                                                            <div className="min-w-0">
                                                                <span className="text-xs text-gray-600">{d.label}</span>
                                                                {d.withdrawn > 0 && (
                                                                    <p className="text-[10px] text-gray-400 font-medium">
                                                                        Retiro {formatCurrency(d.withdrawn)} · Quedó {formatCurrency(d.left)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {d.diff !== null && (
                                                                <span className={`text-xs font-black shrink-0 ${d.diff === 0 ? 'text-emerald-600' : d.diff < 0 ? 'text-red-500' : 'text-amber-600'}`}>
                                                                    {d.diff === 0 ? 'Cuadra' : `${d.diff < 0 ? 'Faltó' : 'Sobró'} ${formatCurrency(Math.abs(d.diff))}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={openCountModal}
                                                className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#34baab]/10 hover:bg-[#34baab]/20 text-[#1f8f83] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                            >
                                                <ClipboardCheck className="w-3.5 h-3.5" />
                                                Arqueo / Saldo inicial
                                            </button>
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
                                        <h3 className="text-gray-400 font-black uppercase tracking-widest text-[8px] md:text-[9px] mb-0.5 leading-tight">Ingresos</h3>
                                        <p className="text-base md:text-lg 2xl:text-xl font-black text-white break-words leading-tight">{formatCurrency(overview?.totalIncome || 0)}</p>
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
                                        <h3 className="text-gray-400 font-black uppercase tracking-widest text-[8px] md:text-[9px] mb-0.5 leading-tight">Egresos</h3>
                                        <p className="text-base md:text-lg 2xl:text-xl font-black text-gray-900 break-words leading-tight">{formatCurrency(overview?.totalEgresosGeneral || 0)}</p>
                                    </div>
                                    <ArrowUpDown className={`w-3 h-3 text-gray-300 transition-transform flex-shrink-0 ${expandedMetric === 'egresos' ? 'rotate-180' : ''}`} />
                                </button>
                                {expandedMetric === 'egresos' && (
                                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 duration-200 space-y-3">
                                        <div className="space-y-2 pb-3 border-b border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-500 uppercase">Gastos y liquidaciones pagadas</span>
                                                <span className="text-sm font-black text-gray-700">{formatCurrency(overview?.totalEgresos || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-400 uppercase">Comisiones pendientes (no incluidas)</span>
                                                <span className="text-sm font-black text-gray-400">{formatCurrency(overview?.totalProfCommissions || 0)}</span>
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
                                    <h3 className={`font-black uppercase tracking-widest text-[8px] md:text-[9px] mb-0.5 leading-tight ${canSeeAdminMetrics ? 'text-gray-400' : 'text-white/70'}`}>
                                        {canSeeAdminMetrics ? 'Comisiones Profesionales' : (personalData?.type === 'apoyo' ? 'Mi Sueldo' : 'Mi Ganancia')}
                                    </h3>
                                    <p className={`text-base md:text-lg 2xl:text-xl font-black break-words leading-tight ${canSeeAdminMetrics ? 'text-gray-900' : 'text-white'}`}>
                                        {formatCurrency(canSeeAdminMetrics
                                            ? Object.values(overview?.byProfessional || {}).filter(d => d.type !== 'apoyo').reduce((s, d) => s + (d.totalCommission || 0), 0)
                                            : (personalData?.totalCommission || 0))}
                                    </p>
                                </div>
                                {canSeeAdminMetrics && <ArrowUpDown className={`w-3 h-3 text-gray-300 transition-transform flex-shrink-0 ${expandedMetric === 'comisiones' ? 'rotate-180' : ''}`} />}
                            </button>
                            {canSeeAdminMetrics && expandedMetric === 'comisiones' && (
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                    <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                                        {Object.entries(overview?.byProfessional || {}).map(([id, data]) => {
                                            if (data.type === 'apoyo') return null;
                                            if (!data.isProfessionalRecord && data.totalCommission <= 0) return null;
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
                                                            {data.totalCommission <= 0 && <span className="text-xs text-gray-400 italic">Sin actividad en el período</span>}
                                                            {data.liquidatedAmount > 0 && <span className="text-xs text-gray-500">Pagado: <span className="font-bold text-emerald-600">{formatCurrency(data.liquidatedAmount)}</span></span>}
                                                            {!pendingMovement && data.totalCommission > 0 && <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Liquidado</span>}
                                                        </div>
                                                        {pendingMovement && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openLiquidate(pendingMovement)}
                                                                className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm shrink-0"
                                                            >
                                                                <DollarSign className="w-2.5 h-2.5" />
                                                                Liquidar{pendingMovement.amount > 0 ? ` ${formatCurrency(pendingMovement.amount)}` : ''}
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

                        {/* Sueldo Personal de Apoyo (secretaria, limpieza — no hacen tratamientos) */}
                        {canSeeAdminMetrics && (
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => toggleMetric('sueldos-apoyo')}
                                    className={`w-full rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-sm border transition-all flex items-center gap-3 md:gap-4 text-left ${expandedMetric === 'sueldos-apoyo' ? 'bg-white border-violet-500 ring-1 ring-violet-500/20' : 'bg-white border-gray-100 hover:shadow-md'}`}
                                >
                                    <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-violet-50 text-violet-500">
                                        <Users className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black uppercase tracking-widest text-[8px] md:text-[9px] mb-0.5 leading-tight text-gray-400">
                                            Sueldo Personal de Apoyo
                                        </h3>
                                        <p className="text-base md:text-lg 2xl:text-xl font-black break-words leading-tight text-gray-900">
                                            {formatCurrency(Object.values(overview?.byProfessional || {}).filter(d => d.type === 'apoyo').reduce((s, d) => s + (d.totalCommission || 0), 0))}
                                        </p>
                                    </div>
                                    <ArrowUpDown className={`w-3 h-3 text-gray-300 transition-transform flex-shrink-0 ${expandedMetric === 'sueldos-apoyo' ? 'rotate-180' : ''}`} />
                                </button>
                                {expandedMetric === 'sueldos-apoyo' && (
                                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                                            {Object.entries(overview?.byProfessional || {}).map(([id, data]) => {
                                                if (data.type !== 'apoyo') return null;
                                                const commId = `comm_${data.name.replace(/\s+/g, '_')}`;
                                                const pendingMovement = pendingCommissionByName[commId];
                                                return (
                                                    <div key={id} className="pb-3 border-b border-gray-100 last:border-0">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-sm font-bold text-gray-800">{data.name}</span>
                                                            <span className="text-sm font-black text-violet-600">{formatCurrency(data.totalCommission)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                                <span className="text-xs text-gray-500">Asistencia: <span className="font-bold text-gray-700">{formatCurrency(data.attendanceWage)}</span></span>
                                                                {data.liquidatedAmount > 0 && <span className="text-xs text-gray-500">Pagado: <span className="font-bold text-emerald-600">{formatCurrency(data.liquidatedAmount)}</span></span>}
                                                                {!pendingMovement && data.totalCommission > 0 && <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Liquidado</span>}
                                                            </div>
                                                            {pendingMovement && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openLiquidate(pendingMovement)}
                                                                    className="inline-flex items-center gap-1 bg-violet-500 hover:bg-violet-600 text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm shrink-0"
                                                                >
                                                                    <DollarSign className="w-2.5 h-2.5" />
                                                                    Liquidar{pendingMovement.amount > 0 ? ` ${formatCurrency(pendingMovement.amount)}` : ''}
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
                        )}
                    </div>


                    {/* Registrar un gasto sin salir de Finanzas */}
                    {canSeeAdminMetrics && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setEgresoModalOpen(true)}
                                className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                Registrar egreso
                            </button>
                        </div>
                    )}

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
                                            <th className="w-[110px] px-2 py-3 text-right" title="Suma acumulada de los movimientos de este período, sin el saldo inicial de las cuentas">Acum. período</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {ledgerMovements
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
                                                                {formatBankAccount(m.bankAccount)}
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

                            {ledgerMovements.length > visibleMovements && (
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

                            {ledgerMovements.length === 0 && (
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
                            ...(egresoParts.length > 0 ? egresoParts : [selectedMovement]).map(part => ({
                                label: 'Método',
                                value: `${methodLabels[part.method] || part.method}${part.bankAccount && part.method !== 'cash' ? ` (${formatBankAccount(part.bankAccount)})` : ''}${egresoParts.length > 1 ? `: ${formatCurrency(part.amount)}` : ''}`,
                            })),
                            { label: 'Monto', value: formatCurrency(egresoParts.length > 0 ? egresoTotal : selectedMovement.amount) },
                        ].map((row, rowIdx) => (
                            <div key={`${row.label}-${rowIdx}`} className="flex justify-between items-center">
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
                        <h2 className="text-2xl font-black text-gray-900">
                            {liquidatingMovement.description.startsWith('Sueldo (Pendiente): ') ? 'Liquidar Sueldo' : 'Liquidar Comisión'}
                        </h2>
                    </div>

                    <p className="text-sm text-gray-500 font-medium">
                        Registrá el pago para <span className="font-bold text-gray-700">{liquidatingMovement.description.replace(/^(Comisión|Sueldo) \(Pendiente\): /, '')}</span> por el período mostrado ({periodRange.start.split('-').reverse().join('/')}{periodRange.end !== periodRange.start ? ` al ${periodRange.end.split('-').reverse().join('/')}` : ''}). {liquidatingMovement.amount > 0
                            ? <>Pendiente de liquidar: <span className="font-bold text-gray-700">{formatCurrency(liquidatingMovement.amount)}</span> (no incluye fechas ya liquidadas antes). Podés ajustar el monto final para sumar un incentivo o aplicar un descuento.</>
                            : <>No hay comisión calculada automáticamente para este período: ingresá el monto que le corresponde.</>}
                        {' '}Al confirmar, todas las fechas de este período quedan cerradas con el monto que pagues.
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
                                                        // El selector de cuenta muestra Brubank por defecto: el estado debe coincidir.
                                                        bankAccount: method === 'cash' ? null : (pay.bankAccount || 'cuenta1'),
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

        {/* Modal: Registrar egreso (mismo formulario que la pantalla de Egresos) */}
        <EgresoFormModal
            isOpen={egresoModalOpen}
            egreso={null}
            // Si se está mirando un solo día, el gasto arranca con esa fecha (se puede cambiar en el formulario)
            defaultDate={periodRange.start && periodRange.start === periodRange.end ? periodRange.start : getTodayDate()}
            onClose={() => setEgresoModalOpen(false)}
            onSaved={loadData}
        />

        {/* Modal: Arqueo / Saldo inicial */}
        {countModalOpen && (() => {
            const hasReba = cashCounts.some(c => c.balances.cuenta2 !== undefined)
                || (overview?.incomeByMethodDetailed.cuenta2 || 0) > 0
                || (overview?.egresosByMethod.cuenta2 || 0) > 0;
            const modalPlaces = BALANCE_PLACES.filter(p => p.key !== 'cuenta2' || hasReba);
            const isFirstCount = cashCounts.length === 0;
            const recentCounts = [...cashCounts].reverse().slice(0, 5);

            return (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 flex flex-col max-h-[92vh]">
                        <div className="flex items-center gap-3 mb-3 flex-shrink-0">
                            <div className="w-10 h-10 bg-[#34baab]/20 rounded-full flex items-center justify-center">
                                <ClipboardCheck className="w-6 h-6 text-[#34baab]" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900">{isFirstCount ? 'Saldo inicial' : 'Arqueo de caja'}</h2>
                        </div>

                        <div className="overflow-y-auto pr-1 -mr-1 space-y-4">
                            <p className="text-sm text-gray-500 font-medium">
                                Contá lo que hay <span className="font-bold text-gray-700">al cierre</span> de la fecha elegida, con todos los movimientos de ese día ya cargados.
                                {isFirstCount
                                    ? ' Es el punto de partida: desde acá Finanzas acumula el saldo de cada lugar. Si lo cargás durante el día, poné la fecha de ayer para que los movimientos de hoy se sumen.'
                                    : ' Se compara contra lo que calcula el sistema.'}
                                {' '}Si después <span className="font-bold text-gray-700">retirás plata</span> (por ejemplo dejando solo el cambio), anotá el retiro: mañana el sistema arranca con lo que quede.
                                {' '}Los lugares que dejes vacíos no se siguen.
                            </p>

                            <div>
                                <label htmlFor="count-date" className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Fecha del arqueo</label>
                                <input
                                    id="count-date"
                                    type="date"
                                    max={getTodayDate()}
                                    value={countDate}
                                    onChange={e => {
                                        setCountDate(e.target.value);
                                        if (e.target.value) void refreshCountExpected(e.target.value, cashCounts);
                                    }}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-white"
                                />
                            </div>

                            <div className="space-y-3">
                                {modalPlaces.map(({ key, label }) => {
                                    const raw = countValues[key] ?? '';
                                    const counted = raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null;
                                    const expected = countExpected?.[key] ?? null;
                                    const diff = counted !== null && expected !== null ? Math.round((counted - expected) * 100) / 100 : null;
                                    return (
                                        <div key={key} className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <label htmlFor={`count-${key}`} className="text-xs font-black text-gray-700">{label}</label>
                                                <span className="text-[10px] font-bold text-gray-400">
                                                    {countExpectedLoading ? 'Calculando...' : expected !== null ? `Sistema: ${formatCurrency(expected)}` : 'Sin saldo previo'}
                                                </span>
                                            </div>
                                            <input
                                                id={`count-${key}`}
                                                type="text"
                                                inputMode="decimal"
                                                value={raw}
                                                placeholder="Contado (dejar vacío si no se cuenta)"
                                                onChange={e => {
                                                    const value = sanitizeDecimalInput(e.target.value);
                                                    setCountValues(v => ({ ...v, [key]: value }));
                                                }}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-white placeholder:font-medium placeholder:text-gray-300 placeholder:text-xs"
                                            />
                                            {diff !== null && (
                                                <p className={`text-[11px] font-black mt-1.5 ${diff === 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-amber-600'}`}>
                                                    {diff === 0 ? 'Cuadra' : `${diff < 0 ? 'Falta' : 'Sobra'} ${formatCurrency(Math.abs(diff))}`}
                                                </p>
                                            )}
                                            {counted !== null && (
                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <label htmlFor={`withdraw-${key}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">Retiro</label>
                                                        <input
                                                            id={`withdraw-${key}`}
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={withdrawValues[key] ?? ''}
                                                            placeholder="0"
                                                            onChange={e => {
                                                                const value = sanitizeDecimalInput(e.target.value);
                                                                setWithdrawValues(v => ({ ...v, [key]: value }));
                                                            }}
                                                            className="min-w-0 flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-white placeholder:text-gray-300"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setWithdrawValues(v => ({ ...v, [key]: String(counted) }))}
                                                            className="text-[10px] font-black uppercase tracking-widest text-[#1f8f83] hover:underline shrink-0"
                                                        >
                                                            Retirar todo
                                                        </button>
                                                    </div>
                                                    <p className={`text-[11px] font-black mt-1.5 ${(Number(withdrawValues[key]) || 0) > counted ? 'text-red-500' : 'text-gray-500'}`}>
                                                        {(Number(withdrawValues[key]) || 0) > counted
                                                            ? 'El retiro no puede ser mayor a lo contado'
                                                            : `Queda para mañana: ${formatCurrency(Math.round((counted - (Number(withdrawValues[key]) || 0)) * 100) / 100)}`}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div>
                                <label htmlFor="count-note" className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Nota (opcional)</label>
                                <input
                                    id="count-note"
                                    type="text"
                                    value={countNote}
                                    onChange={e => setCountNote(e.target.value)}
                                    placeholder="Ej: faltó registrar un gasto"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-white"
                                />
                            </div>

                            {recentCounts.length > 0 && (
                                <div className="pt-2 border-t border-gray-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Arqueos anteriores</p>
                                    <div className="space-y-1.5">
                                        {recentCounts.map(c => (
                                            <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                                                <span className="font-bold text-gray-700">{c.date.split('-').reverse().join('/')}</span>
                                                <span className="text-gray-400 truncate flex-1">
                                                    {BALANCE_PLACES.filter(p => c.balances[p.key] !== undefined).map(p => p.label).join(', ')}
                                                    {c.note ? ` · ${c.note}` : ''}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteCount(c)}
                                                    className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 shrink-0"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4 mt-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setCountModalOpen(false)}
                                className="flex-1 py-3 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCount}
                                disabled={savingCount}
                                className="flex-1 py-3 rounded-2xl bg-[#34baab] hover:bg-[#2da598] text-white font-bold transition-colors disabled:opacity-60"
                            >
                                {savingCount ? 'Guardando...' : 'Guardar arqueo'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        })()}
        </>
    );
}
