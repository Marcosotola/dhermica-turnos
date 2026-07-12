'use client';

import { useState, useEffect } from 'react';
import { getFinanceOverview, FinanceOverview } from '@/lib/firebase/finance';
import { Professional } from '@/lib/types/professional';
import {
    DollarSign,
    TrendingUp,
    Calendar as CalendarIcon,
    Loader2,
    ShoppingBag,
    Briefcase,
    Zap,
    Home
} from 'lucide-react';
import { formatDate, getDayWeekMonthRange } from '@/lib/utils/time';
import { formatCurrencyWithSymbol } from '@/lib/utils/currency';

interface ProfessionalFinanceProps {
    professional: Professional;
    isAdmin?: boolean;
}

export function ProfessionalFinance({ professional, isAdmin }: ProfessionalFinanceProps) {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<FinanceOverview | null>(null);
    const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'custom'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [customRange, setCustomRange] = useState({
        start: formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
        end: formatDate(new Date())
    });

    const navigateDate = (direction: number) => {
        if (dateRange === 'custom') return;
        const d = new Date(currentDate);
        if (dateRange === 'day') d.setDate(d.getDate() + direction);
        else if (dateRange === 'week') d.setDate(d.getDate() + (direction * 7));
        else d.setMonth(d.getMonth() + direction);
        setCurrentDate(d);
    };

    useEffect(() => {
        const loadData = async () => {
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

                const data = await getFinanceOverview(start, end, professional.id);
                setOverview(data);
            } catch (error) {
                console.error('Error loading professional finance:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [dateRange, currentDate, customRange, professional.id, professional.userId]);

    const formatCurrency = formatCurrencyWithSymbol;

    const cleanName = professional.name.trim().toLowerCase();
    const profData = overview?.byProfessional[professional.name.trim()] || 
                    (overview?.byProfessional ? Object.values(overview.byProfessional).find(p => 
                        (p.userId && professional.userId && p.userId === professional.userId) || 
                        p.name.trim().toLowerCase() === cleanName
                    ) : null);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 text-[#34baab] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Análisis de Ingresos</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Consulta de rendimiento y comisiones</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Selectores Predefinidos */}
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                        {(['day', 'week', 'month', 'custom'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === range ? 'bg-[#484450] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {range === 'day' ? 'Hoy' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Rango'}
                            </button>
                        ))}
                    </div>

                    {/* Navegador o Custom Range */}
                    {dateRange !== 'custom' ? (
                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                            <button onClick={() => navigateDate(-1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-400 hover:text-[#34baab]">
                                <CalendarIcon className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 min-w-[120px] text-center">
                                {dateRange === 'month'
                                    ? currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                                    : currentDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                            </span>
                            <button onClick={() => navigateDate(1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-400 hover:text-[#34baab]">
                                <CalendarIcon className="w-4 h-4 rotate-180" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customRange.start}
                                onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                                className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            />
                            <span className="text-gray-300">/</span>
                            <input
                                type="date"
                                value={customRange.end}
                                onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                                className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Total Commission Card */}
            <div className="bg-[#484450] text-white p-6 rounded-[32px] shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <DollarSign className="w-16 h-16" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Comisión</p>
                <h4 className="text-3xl font-black mt-1">{formatCurrency(profData?.totalCommission || 0)}</h4>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/10 w-fit px-2 py-1 rounded-lg">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span>Resumen del Periodo</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Service Income */}
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
                        <Briefcase className="w-5 h-5 text-violet-500" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Servicios</p>
                    <h4 className="text-2xl font-black text-gray-900">
                        {formatCurrency(isAdmin
                            ? (profData?.serviceIncome || 0)
                            : ((profData?.serviceIncome || 0) - (profData?.aparatoDayServiceIncome || 0))
                        )}
                    </h4>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Comisión</p>
                        <p className="text-base font-black text-violet-500">{formatCurrency(profData?.serviceCommission || 0)}</p>
                    </div>
                </div>

                {/* Product Income */}
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                        <ShoppingBag className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Productos</p>
                    <h4 className="text-2xl font-black text-gray-900">{formatCurrency(profData?.productIncome || 0)}</h4>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Comisión</p>
                        <p className="text-base font-black text-blue-500">{formatCurrency(profData?.productCommission || 0)}</p>
                    </div>
                </div>

                {/* Rental Income */}
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                        <Home className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Alquileres</p>
                    <h4 className="text-2xl font-black text-gray-900">{formatCurrency(profData?.rentalIncome || 0)}</h4>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Comisión</p>
                        <p className="text-base font-black text-emerald-500">{formatCurrency(profData?.rentalCommission || 0)}</p>
                    </div>
                </div>

                {/* Aparatos / Fix Fee */}
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                        <Zap className="w-5 h-5 text-amber-500" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Aparatos / Fijos</p>
                    <h4 className="text-2xl font-black text-gray-900">{formatCurrency(profData?.aparatoIncome || 0)}</h4>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Monto Fijo</p>
                        <p className="text-base font-black text-amber-500">{formatCurrency(profData?.aparatoFee || 0)}</p>
                    </div>
                </div>
            </div>

            {!profData && (
                <div className="bg-white p-12 rounded-[40px] border border-dashed border-gray-200 text-center">
                    <p className="text-gray-400 font-medium italic">No se encontraron registros financieros para este profesional en el periodo seleccionado.</p>
                </div>
            )}
        </div>
    );
}
