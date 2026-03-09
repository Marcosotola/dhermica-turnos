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
    Zap
} from 'lucide-react';
import { formatDate } from '@/lib/utils/time';

interface ProfessionalFinanceProps {
    professional: Professional;
}

export function ProfessionalFinance({ professional }: ProfessionalFinanceProps) {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<FinanceOverview | null>(null);
    const [dateRange, setDateRange] = useState<'day' | 'week' | 'month'>('month');
    const [currentDate] = useState(new Date());

    useEffect(() => {
        const loadData = async () => {
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
                }

                const data = await getFinanceOverview(start, end);
                setOverview(data);
            } catch (error) {
                console.error('Error loading professional finance:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [dateRange, currentDate, professional.id, professional.userId]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    const profKey = professional.userId || professional.id;
    const profData = overview?.byProfessional[profKey];

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 text-[#34baab] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Análisis de Ingresos</h3>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    {(['day', 'week', 'month'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${dateRange === range ? 'bg-[#484450] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {range === 'day' ? 'Hoy' : range === 'week' ? 'Semana' : 'Mes'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                {/* Service Income */}
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
                        <Briefcase className="w-5 h-5 text-violet-500" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Servicios</p>
                    <h4 className="text-2xl font-black text-gray-900">{formatCurrency(profData?.serviceIncome || 0)}</h4>
                    <p className="text-[10px] font-bold text-violet-500 mt-1">Comisión: {formatCurrency(profData?.serviceCommission || 0)}</p>
                </div>

                {/* Product Income */}
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                        <ShoppingBag className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Productos</p>
                    <h4 className="text-2xl font-black text-gray-900">{formatCurrency(profData?.productIncome || 0)}</h4>
                    <p className="text-[10px] font-bold text-blue-500 mt-1">Comisión: {formatCurrency(profData?.productCommission || 0)}</p>
                </div>

                {/* Aparatos / Fix Fee */}
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                        <Zap className="w-5 h-5 text-amber-500" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Aparatos / Fijos</p>
                    <h4 className="text-2xl font-black text-gray-900">{formatCurrency(profData?.aparatoIncome || 0)}</h4>
                    <p className="text-[10px] font-bold text-amber-500 mt-1">Monto Fijo Acumulado</p>
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
