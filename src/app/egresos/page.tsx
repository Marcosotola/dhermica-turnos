'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
    getEgresosByDateRange, 
    getAllEgresos, 
    createEgreso, 
    deleteEgreso 
} from '@/lib/firebase/egresos';
import { getFinanceOverview, FinanceOverview, FinanceMovement } from '@/lib/firebase/finance';
import {
    Egreso,
    EGRESO_CATEGORY_LABEL,
    EGRESO_CATEGORY_COLOR,
} from '@/lib/types/egreso';
import { BANK_ACCOUNTS, formatBankAccount } from '@/lib/types/bankAccount';
import {
    TrendingDown,
    Plus,
    Pencil,
    Trash2,
    X,
    DollarSign,
    ChevronLeft,
    ChevronRight,
    Calendar,
    FileText,
    CheckCircle2,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { TopNavbar } from '@/components/navigation/TopNavbar';
import { formatDate, getTodayDate, getDayWeekMonthRange } from '@/lib/utils/time';
import { formatCurrencyWithSymbol as formatCurrency, sanitizeDecimalInput } from '@/lib/utils/currency';
import { formatPaymentMethod } from '@/lib/utils/clientLedger';
import { EgresoFormModal, EgresoFormPayment, PAYMENT_LABELS } from '@/components/egresos/EgresoFormModal';

function formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
}

function todayStr() {
    return getTodayDate();
}

export default function EgresosPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [egresos, setEgresos] = useState<Egreso[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEgreso, setEditingEgreso] = useState<Egreso | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [financeOverview, setFinanceOverview] = useState<FinanceOverview | null>(null);

    // Liquidación de comisiones
    const [liquidateModalOpen, setLiquidateModalOpen] = useState(false);
    const [liquidatingMovement, setLiquidatingMovement] = useState<FinanceMovement | null>(null);
    const [liquidatePayments, setLiquidatePayments] = useState<EgresoFormPayment[]>([]);
    const [liquidating, setLiquidating] = useState(false);

    // Filtros
    const [filterRange, setFilterRange] = useState<'day' | 'week' | 'month' | 'all'>('day');
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (!authLoading && !(profile?.role === 'admin' || profile?.role === 'secretary')) {
            router.push('/dashboard');
        }
    }, [authLoading, profile, router]);

    function getDateRange(): { start: string; end: string } {
        if (filterRange === 'all') {
            // all: last 2 years
            const end = getTodayDate();
            const start = formatDate(new Date(new Date().getFullYear() - 2, new Date().getMonth(), new Date().getDate()));
            return { start, end };
        }
        return getDayWeekMonthRange(filterRange, currentDate);
    }

    function getDateLabel(): string {
        const d = currentDate;
        if (filterRange === 'day') return formatDateDisplay(formatDate(d));
        if (filterRange === 'week') {
            const { start, end } = getDateRange();
            return `${formatDateDisplay(start)} — ${formatDateDisplay(end)}`;
        }
        if (filterRange === 'month') {
            return d.toLocaleString('es-AR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
        }
        return 'Todos los registros';
    }

    function navigateDate(dir: number) {
        const d = new Date(currentDate);
        if (filterRange === 'day') d.setDate(d.getDate() + dir);
        if (filterRange === 'week') d.setDate(d.getDate() + dir * 7);
        if (filterRange === 'month') d.setMonth(d.getMonth() + dir);
        setCurrentDate(d);
    }

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { start, end } = getDateRange();
            const [data, overview] = await Promise.all([
                filterRange === 'all' ? getAllEgresos() : getEgresosByDateRange(start, end),
                getFinanceOverview(start, end)
            ]);
            setEgresos(data);
            setFinanceOverview(overview);
        } catch (error) {
            console.error('Error loading egresos:', error);
            toast.error('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    }, [filterRange, currentDate]);

    useEffect(() => { loadData(); }, [loadData]);

    function openNew() {
        setEditingEgreso(null);
        setShowModal(true);
    }

    function openEdit(e: Egreso) {
        setEditingEgreso(e);
        setShowModal(true);
    }

    async function handleDelete(id: string) {
        try {
            await deleteEgreso(id);
            toast.success('Egreso eliminado');
            setDeletingId(null);
            loadData();
        } catch (error) {
            console.error('Error deleting egreso:', error);
            toast.error('Error al eliminar');
        }
    }

    function openLiquidate(comm: FinanceMovement) {
        setLiquidatingMovement(comm);
        setLiquidatePayments([{ id: Date.now().toString(), method: 'cash', amount: String(comm.amount), bankAccount: null }]);
        setLiquidateModalOpen(true);
    }

    async function handleLiquidate() {
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
            const { start, end } = getDateRange();
            const isStaffWage = liquidatingMovement.description.startsWith('Sueldo (Pendiente): ');
            const professionalName = liquidatingMovement.description.replace(/^(Comisión|Sueldo) \(Pendiente\): /, '');
            const payments = liquidatePayments.map(p => ({
                id: p.id,
                method: p.method,
                amount: Number(p.amount),
                bankAccount: p.method !== 'cash' ? (p.bankAccount || 'cuenta1') : null,
            }));

            await createEgreso({
                date: todayStr(),
                category: 'sueldos',
                amount,
                description: `Liquidación ${isStaffWage ? 'sueldo' : 'comisión'}: ${professionalName}`,
                payments,
                paymentMethod: payments[0].method,
                bankAccount: payments[0].bankAccount,
                professionalId: liquidatingMovement.referenceId,
                isCommissionPayment: true,
                commissionPeriodStart: start,
                commissionPeriodEnd: end,
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
    }

    const totalAmount = egresos.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    if (authLoading || !(profile?.role === 'admin' || profile?.role === 'secretary')) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#34baab]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <TopNavbar />
            <Toaster richColors position="top-center" />

            {/* Header */}
            <div className="bg-gradient-to-br from-[#484450] to-[#2d2a33] text-white pt-20 pb-16 px-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full -mr-48 -mt-48 blur-3xl" />
                <div className="max-w-4xl mx-auto relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight mb-1 flex items-center gap-4 text-white">
                            <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                                <TrendingDown className="w-8 h-8 text-red-400" />
                            </div>
                            Egresos
                        </h1>
                        <p className="text-gray-300 font-medium">Registro de gastos del local</p>
                    </div>
                    <button
                        onClick={openNew}
                        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5 text-white" /> Nuevo Egreso
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-20 pb-28">
                {/* Filters */}
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto">
                        {(['day', 'week', 'month', 'all'] as const).map(r => (
                            <button
                                key={r}
                                onClick={() => setFilterRange(r)}
                                className={`flex-1 md:px-5 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all text-gray-500 ${filterRange === r ? 'bg-[#34baab] text-white shadow-md' : 'hover:text-gray-700'}`}
                            >
                                {r === 'day' ? 'Hoy' : r === 'week' ? 'Semana' : r === 'month' ? 'Mes' : 'Todo'}
                            </button>
                        ))}
                    </div>

                    {filterRange !== 'all' && (
                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200">
                            <button aria-label="Período anterior" onClick={() => navigateDate(-1)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <span className="text-base font-black text-gray-800 min-w-[180px] text-center capitalize">
                                {getDateLabel()}
                            </span>
                            <button aria-label="Período siguiente" onClick={() => navigateDate(1)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
                                <ChevronRight className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Summary badge */}
                <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-3xl p-6 mb-8 flex items-center justify-between shadow-xl shadow-red-200">
                    <div>
                        <p className="text-red-100 text-xs font-black uppercase tracking-widest mb-1">Total Egresos</p>
                        <p className="text-4xl font-black text-white">{formatCurrency(totalAmount)}</p>
                    </div>
                    <TrendingDown className="w-16 h-16 text-red-200 opacity-60" />
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#34baab]" />
                    </div>
                ) : (egresos.length === 0 && (!financeOverview || (financeOverview.totalProfCommissions || 0) === 0)) ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm text-center py-16">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-400 font-bold text-lg">No hay egresos en este período</p>
                        <p className="text-gray-300 text-sm mt-1">Hacé clic en "Nuevo Egreso" para registrar un gasto</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Comisiones Automáticas (Virtuales) */}
                        {financeOverview?.movements
                            .filter(m => m.type === 'egreso' && m.id.startsWith('comm_'))
                            .map(comm => (
                                <div key={comm.id} className="bg-white rounded-3xl p-5 shadow-sm border border-amber-100 flex items-center gap-5 group hover:shadow-md transition-all">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                        <span className="text-[10px] font-black text-amber-600 uppercase">Sueldos</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3 text-gray-400" />
                                                Automático
                                            </span>
                                        </div>
                                        <h3 className="text-gray-800 font-black text-sm mb-1 truncate">{comm.description}</h3>
                                        <p className="text-gray-400 text-[10px] font-medium flex items-center gap-1.5">
                                            {comm.description.startsWith('Sueldo') ? 'Sueldo por asistencia' : 'Comisión por servicios'}
                                        </p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <span className="text-red-500 font-black text-lg">$ {formatCurrency(comm.amount).replace('$', '').trim()}</span>
                                        {comm.referenceId ? (
                                            <button
                                                onClick={() => openLiquidate(comm)}
                                                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm border border-amber-600/20"
                                            >
                                                <DollarSign className="w-3 h-3" />
                                                Liquidar
                                            </button>
                                        ) : (
                                            <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">Automático</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        }

                        {/* Egresos Manuales */}
                        {egresos.map(e => (
                            <div key={e.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all">
                                <div className={`p-3 rounded-2xl border text-sm font-black uppercase ${EGRESO_CATEGORY_COLOR[e.category]}`}>
                                    <span className="text-current">{EGRESO_CATEGORY_LABEL[e.category].split(' ')[0]}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${EGRESO_CATEGORY_COLOR[e.category]}`}>
                                            {EGRESO_CATEGORY_LABEL[e.category]}
                                        </span>
                                        <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-gray-400" />
                                            {formatDateDisplay(e.date)}
                                        </span>
                                    </div>
                                    {e.description && (
                                        <p className="text-gray-600 text-sm mt-1 truncate">{e.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                                        {e.payments && e.payments.length > 0 ? (
                                            e.payments.map((p, idx) => (
                                                <p key={idx} className="text-xs text-gray-400 font-medium">
                                                    {formatPaymentMethod(p.method)} {p.bankAccount && `(${formatBankAccount(p.bankAccount)})`}: {formatCurrency(p.amount)}
                                                </p>
                                            ))
                                        ) : (
                                            <p className="text-xs text-gray-400 font-medium">
                                                {formatPaymentMethod(e.paymentMethod)} {e.bankAccount && `(${formatBankAccount(e.bankAccount)})`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xl font-black text-red-600">{formatCurrency(e.amount)}</p>
                                    <div className="flex items-center gap-2 mt-2 justify-end">
                                        <button aria-label="Editar egreso" onClick={() => openEdit(e)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
                                            <Pencil className="w-4 h-4 text-gray-500" />
                                        </button>
                                        <button aria-label="Eliminar egreso" onClick={() => setDeletingId(e.id)} className="p-2 hover:bg-red-50 rounded-xl transition-colors text-red-400">
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <EgresoFormModal
                isOpen={showModal}
                egreso={editingEgreso}
                onClose={() => setShowModal(false)}
                onSaved={loadData}
            />

            {/* Modal Liquidar Comisión */}
            {liquidateModalOpen && liquidatingMovement && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-[#34baab]/20 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-[#34baab]" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900">{liquidatingMovement.description.startsWith('Sueldo') ? 'Liquidar Sueldo' : 'Liquidar Comisión'}</h2>
                        </div>

                        <p className="text-sm text-gray-500 font-medium">
                            Registrá el pago para <span className="font-bold text-gray-700">{liquidatingMovement.description.replace(/^(Comisión|Sueldo) \(Pendiente\): /, '')}</span> por el período mostrado. {liquidatingMovement.amount > 0
                                ? <>Pendiente de liquidar: <span className="font-bold text-gray-700">{formatCurrency(liquidatingMovement.amount)}</span> (no incluye fechas ya liquidadas antes). Podés ajustar el monto final para sumar un incentivo o aplicar un descuento.</>
                                : <>No hay comisión calculada automáticamente para este período: ingresá el monto que le corresponde.</>}
                            {' '}Al confirmar, todas las fechas de este período quedan cerradas con el monto que pagues.
                        </p>

                        <div className="pt-2 max-h-[50vh] overflow-y-auto pr-1 -mr-1">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-500">Desglose de Pagos *</label>
                                <button
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
                                                aria-label="Eliminar pago"
                                                onClick={() => setLiquidatePayments(ps => ps.filter(pay => pay.id !== p.id))}
                                                className="absolute -top-2 -right-2 bg-white border border-gray-200 text-red-500 p-1.5 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label htmlFor={`liq-method-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Medio</label>
                                                <select
                                                    id={`liq-method-${idx}`}
                                                    value={p.method}
                                                    onChange={e => {
                                                        const method = e.target.value as EgresoFormPayment['method'];
                                                        setLiquidatePayments(ps => ps.map((pay, i) => i !== idx ? pay : {
                                                            ...pay,
                                                            method,
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
                                                <label htmlFor={`liq-amount-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Monto</label>
                                                <input
                                                    id={`liq-amount-${idx}`}
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
                                                <label htmlFor={`liq-account-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Cuenta</label>
                                                <select
                                                    id={`liq-account-${idx}`}
                                                    value={p.bankAccount || 'cuenta1'}
                                                    onChange={e => {
                                                        const bankAccount = e.target.value as NonNullable<EgresoFormPayment['bankAccount']>;
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
                                onClick={() => setLiquidateModalOpen(false)}
                                className="flex-1 py-3 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
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

            {/* Modal Confirmar Eliminar */}
            {deletingId && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">¿Eliminar egreso?</h3>
                        <p className="text-gray-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingId(null)} className="flex-1 border border-gray-200 text-gray-700 font-black py-3 rounded-2xl hover:bg-gray-50 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={() => handleDelete(deletingId)} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-2xl transition-all active:scale-95">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
