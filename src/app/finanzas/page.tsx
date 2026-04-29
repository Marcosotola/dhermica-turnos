'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getFinanceOverview, FinanceOverview } from '@/lib/firebase/finance';
import { getTodayDate, formatDate } from '@/lib/utils/time';
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
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Users,
    ShoppingBag,
    Zap,
    BookText,
    Filter,
    ArrowUpDown
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { EGRESO_CATEGORY_LABEL, EgresoCategory } from '@/lib/types/egreso';

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

    const isAdmin = profile?.role === 'admin';
    const isSecretary = profile?.role === 'secretary';
    const isContador = profile?.role === 'contador';
    const canSeeIncome = isAdmin || isSecretary || isContador;

    useEffect(() => {
        loadData();
        setVisibleMovements(20);
        setTypeFilter('all');
    }, [dateRange, currentDate, customRange, profile]);

    const loadData = async () => {
        if (!profile) return;
        setLoading(true);
        try {
            let start = '';
            let end = '';

            const d = new Date(currentDate);
            if (dateRange === 'day') {
                const dateStr = formatDate(d);
                start = dateStr;
                end = dateStr;
            } else if (dateRange === 'week') {
                const first = d.getDate() - d.getDay();
                const last = first + 6;
                start = formatDate(new Date(d.getFullYear(), d.getMonth(), first));
                end = formatDate(new Date(d.getFullYear(), d.getMonth(), last));
            } else if (dateRange === 'month') {
                start = formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
                end = formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
            } else {
                start = customRange.start;
                end = customRange.end;
            }

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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    const getDateLabel = () => {
        if (dateRange === 'day') return currentDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
        if (dateRange === 'week') return `Semana del ${currentDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`;
        return currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    };

    const toggleMetric = (metric: string) => {
        setExpandedMetric(expandedMetric === metric ? null : metric);
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

    return (
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
                                    <span className="text-[10px] font-black uppercase text-gray-400">Desde:</span>
                                    <input
                                        type="date"
                                        value={customRange.start}
                                        onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="bg-transparent border-none text-gray-800 font-bold text-sm focus:ring-0 outline-none p-0"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200">
                                    <span className="text-[10px] font-black uppercase text-gray-400">Hasta:</span>
                                    <input
                                        type="date"
                                        value={customRange.end}
                                        onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="bg-transparent border-none text-gray-800 font-bold text-sm focus:ring-0 outline-none p-0"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200">
                                <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                
                                {dateRange === 'day' ? (
                                    <input 
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
                                
                                <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                    <ChevronRight className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6 mt-8">
                    {/* 1. Top Metrics Bar - Interactive Tiles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                        {/* Saldo Neto */}
                        {isAdmin && (
                            <div className="space-y-2">
                                <button 
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
                                {expandedMetric === 'saldo' && (
                                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-gray-400 font-bold uppercase">Total Ingresos:</span>
                                                <span className="text-emerald-600 font-black">{formatCurrency(overview?.totalIncome || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-gray-400 font-bold uppercase">Total Egresos:</span>
                                                <span className="text-red-500 font-black">{formatCurrency(overview?.totalEgresosGeneral || 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Ingresos Totales */}
                        {canSeeIncome && (
                            <div className="space-y-2">
                                <button 
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
                                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 duration-200 space-y-4">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-4 border-b border-gray-50">
                                            {[
                                                { label: 'Servicios', val: overview?.totalServiceIncome },
                                                { label: 'Parciales', val: overview?.totalPartialIncome },
                                                { label: 'Productos', val: overview?.totalProductIncome },
                                                { label: 'Alquileres', val: overview?.totalRentalIncome }
                                            ].map(i => (
                                                <div key={i.label} className="flex flex-col">
                                                    <span className="text-[8px] font-black text-gray-400 uppercase">{i.label}</span>
                                                    <span className="text-[10px] font-black text-gray-700">{formatCurrency(i.val || 0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <h4 className="text-[9px] font-black text-gray-400 uppercase mb-2">Por Método:</h4>
                                            <div className="space-y-1">
                                                {Object.entries(overview?.byMethod || {}).map(([m, val]) => val > 0 && (
                                                    <div key={m} className="flex justify-between text-[10px]">
                                                        <span className="text-gray-500 capitalize">{m === 'cash' ? 'Efectivo' : m}</span>
                                                        <span className="font-bold text-gray-700">{formatCurrency(val)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Egresos Totales */}
                        {isAdmin && (
                            <div className="space-y-2">
                                <button 
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
                                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 duration-200 space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-gray-400 font-bold uppercase">Manuales:</span>
                                                <span className="text-gray-700 font-black">{formatCurrency(overview?.totalEgresos || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-gray-400 font-bold uppercase">Comisiones:</span>
                                                <span className="text-gray-700 font-black">{formatCurrency(overview?.totalProfCommissions || 0)}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-[9px] font-black text-gray-400 uppercase mb-2">Categorías:</h4>
                                            <div className="max-h-[120px] overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                                {Object.entries(overview?.egresosByCategory || {}).map(([cat, val]) => (
                                                    <div key={cat} className="flex justify-between text-[10px]">
                                                        <span className="text-gray-500 truncate pr-2">{EGRESO_CATEGORY_LABEL[cat as EgresoCategory] || cat}</span>
                                                        <span className="font-bold text-gray-700">{formatCurrency(val)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Comisiones/Ganancias */}
                        <div className="space-y-2">
                            <button 
                                onClick={() => toggleMetric('comisiones')}
                                className={`w-full rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-sm border transition-all flex items-center gap-3 md:gap-4 text-left ${isAdmin ? (expandedMetric === 'comisiones' ? 'bg-white border-amber-500 ring-1 ring-amber-500/20' : 'bg-white border-gray-100 hover:shadow-md') : 'bg-[#34baab] border-none shadow-md text-white'}`}
                            >
                                <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl ${isAdmin ? 'bg-amber-50 text-amber-500' : 'bg-white/20 text-white'}`}>
                                    {isAdmin ? <Users className="w-5 h-5 md:w-6 md:h-6" /> : <DollarSign className="w-5 h-5 md:w-6 md:h-6" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-black uppercase tracking-widest text-[8px] md:text-[9px] mb-0.5 truncate ${isAdmin ? 'text-gray-400' : 'text-white/70'}`}>
                                        {isAdmin ? 'Comisiones' : 'Mi Ganancia'}
                                    </h3>
                                    <p className={`text-base md:text-xl font-black truncate ${isAdmin ? 'text-gray-900' : 'text-white'}`}>
                                        {formatCurrency(isAdmin ? (overview?.totalProfCommissions || 0) : (personalData?.totalCommission || 0))}
                                    </p>
                                </div>
                                {isAdmin && <ArrowUpDown className={`w-3 h-3 text-gray-300 transition-transform flex-shrink-0 ${expandedMetric === 'comisiones' ? 'rotate-180' : ''}`} />}
                            </button>
                            {isAdmin && expandedMetric === 'comisiones' && (
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                    <div className="max-h-[250px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                                        {Object.entries(overview?.byProfessional || {}).map(([id, data]) => data.totalCommission > 0 && (
                                            <div key={id} className="flex justify-between items-start pb-2 border-b border-gray-50 last:border-0">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-800">{data.name}</span>
                                                    <span className="text-[8px] text-gray-400 uppercase">Serv: {formatCurrency(data.serviceCommission)} | Prod: {formatCurrency(data.productCommission)}</span>
                                                </div>
                                                <span className="text-xs font-black text-amber-600">{formatCurrency(data.totalCommission)}</span>
                                            </div>
                                        ))}
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
                                <table className="w-full text-left table-fixed min-w-[1000px]">
                                    <thead>
                                        <tr className="text-gray-400 text-[8px] font-black uppercase tracking-[0.2em] border-b border-gray-50">
                                            <th className="w-[100px] px-2 py-3">Fecha</th>
                                            <th className="w-[60px] px-2 py-3">ID</th>
                                            <th className="w-[80px] px-2 py-3">Tipo</th>
                                            <th className="w-[100px] px-2 py-3">Categoría</th>
                                            <th className="w-auto px-2 py-3">Descripción</th>
                                            <th className="w-[100px] px-2 py-3">Cuenta</th>
                                            <th className="w-[120px] px-2 py-3 text-right">Monto</th>
                                            <th className="w-[120px] px-2 py-3 text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {overview?.movements
                                            .filter(m => typeFilter === 'all' || m.type === typeFilter)
                                            .slice(0, visibleMovements)
                                            .map((m, idx) => (
                                            <tr key={m.id + idx} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-2 py-2">
                                                    <span className="text-[11px] font-bold text-gray-600">{m.date.split('-').reverse().join('/')}</span>
                                                </td>
                                                <td className="px-2 py-2">
                                                    <span className="text-[9px] font-mono text-gray-400">#{m.id.slice(-4)}</span>
                                                </td>
                                                <td className="px-2 py-2">
                                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                                        m.type === 'ingreso' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                        {m.type}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-2">
                                                    <span className="text-[10px] font-bold text-gray-700 capitalize truncate block">{m.category}</span>
                                                </td>
                                                <td className="px-2 py-2">
                                                    <span className="text-[10px] text-gray-500 font-medium truncate block pr-4 group-hover:whitespace-normal group-hover:overflow-visible group-hover:relative group-hover:z-10 group-hover:bg-gray-50 group-hover:shadow-sm" title={m.description}>
                                                        {m.description}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-2">
                                                    <div className="flex flex-col leading-[1.1]">
                                                        <span className="text-[9px] font-bold text-gray-600 uppercase">
                                                            {m.method === 'cash' ? 'Efectivo' : m.method === 'transfer' ? 'Transf.' : m.method === 'qr' ? 'Digital' : m.method}
                                                        </span>
                                                        {m.bankAccount && (
                                                            <span className="text-[8px] font-black text-[#34baab] uppercase">
                                                                {m.bankAccount === 'cuenta1' ? 'Cta 1' : 'Cta 2'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-right">
                                                    <span className={`text-[11px] font-black ${m.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {m.type === 'ingreso' ? '+' : '-'} {formatCurrency(m.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-2 text-right">
                                                    <span className="text-[11px] font-black text-gray-900">{formatCurrency(m.balance || 0)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {overview && overview.movements.length > visibleMovements && (
                                <div className="mt-8 flex justify-center">
                                    <button 
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
    );
}
