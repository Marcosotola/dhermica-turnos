'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getFinanceOverview, FinanceOverview } from '@/lib/firebase/finance';
import { getTodayDate } from '@/lib/utils/time';
import {
    DollarSign,
    TrendingUp,
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
    ShoppingBag
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function FinanzasPage() {
    const { profile } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<FinanceOverview | null>(null);
    const [dateRange, setDateRange] = useState<'day' | 'week' | 'month'>('day');
    const [currentDate, setCurrentDate] = useState(new Date());

    const isAdmin = profile?.role === 'admin';

    useEffect(() => {
        loadData();
    }, [dateRange, currentDate, profile]);

    const loadData = async () => {
        if (!profile) return;
        setLoading(true);
        try {
            let start = '';
            let end = '';

            const d = new Date(currentDate);
            if (dateRange === 'day') {
                const dateStr = d.toISOString().split('T')[0];
                start = dateStr;
                end = dateStr;
            } else if (dateRange === 'week') {
                const first = d.getDate() - d.getDay();
                const last = first + 6;
                start = new Date(d.setDate(first)).toISOString().split('T')[0];
                end = new Date(d.setDate(last)).toISOString().split('T')[0];
            } else {
                start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
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

    if (loading && !overview) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-[#34baab]" />
            </div>
        );
    }

    // Role-specific filtering for UI - find the entry that matches the current user's UID
    const personalData = profile?.uid && overview?.byProfessional ? (
        Object.values(overview.byProfessional).find(p => p.userId === profile.uid) || null
    ) : null;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />

            {/* Header */}
            <div className="bg-[#484450] text-white pt-12 pb-20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#34baab]/10 rounded-full -mr-48 -mt-48 blur-3xl" />
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                            <DollarSign className="w-8 h-8 text-[#34baab]" />
                        </div>
                        {isAdmin ? 'Balance Financiero' : 'Mis Ganancias'}
                    </h1>
                    <p className="text-gray-300 font-medium">
                        {isAdmin ? 'Resumen general de ingresos y comisiones.' : 'Seguimiento de tus servicios y comisiones.'}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-20">
                {/* Filters & Controls */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-gray-100">
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto">
                        {(['day', 'week', 'month'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`flex-1 md:px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${dateRange === range ? 'bg-[#34baab] text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {range === 'day' ? 'Hoy' : range === 'week' ? 'Semana' : 'Mes'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 bg-gray-50 px-6 py-2 rounded-2xl border border-gray-200">
                        <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <ChevronLeft className="w-6 h-6 text-gray-600" />
                        </button>
                        <span className="text-lg font-black text-gray-800 min-w-[200px] text-center capitalize">
                            {getDateLabel()}
                        </span>
                        <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <ChevronRight className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Summary Cards */}
                    <div className="lg:col-span-1 space-y-6">
                        {isAdmin ? (
                            <div className="bg-gradient-to-br from-[#484450] to-[#2d2a33] text-white p-8 rounded-[2.5rem] shadow-2xl shadow-[#34baab]/20 border border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 transform group-hover:scale-110 transition-transform duration-500 opacity-20">
                                    <PieChart className="w-32 h-32" />
                                </div>
                                <h3 className="text-gray-400 font-black uppercase tracking-[0.2em] text-xs mb-4">Ingresos Totales</h3>
                                <p className="text-5xl font-black tracking-tighter mb-4">{formatCurrency(overview?.totalIncome || 0)}</p>

                                <div className="space-y-2 mb-6 opacity-80 border-t border-white/10 pt-4">
                                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                                        <span className="flex items-center gap-2 underline decoration-violet-400 decoration-2 underline-offset-4">Servicios:</span>
                                        <span>{formatCurrency(overview?.totalServiceIncome || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                                        <span className="flex items-center gap-2 underline decoration-emerald-400 decoration-2 underline-offset-4">Productos:</span>
                                        <span>{formatCurrency(overview?.totalProductIncome || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                                        <span className="flex items-center gap-2 underline decoration-blue-400 decoration-2 underline-offset-4">Alquileres:</span>
                                        <span>{formatCurrency(overview?.totalRentalIncome || 0)}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-[#34baab] bg-[#34baab]/10 w-fit px-3 py-1.5 rounded-full border border-[#34baab]/20">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-xs font-black uppercase">Balance Positivo</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-[#34baab] to-[#2a968a] text-white p-8 rounded-[2.5rem] shadow-2xl shadow-[#34baab]/20 border border-white/5 relative overflow-hidden group">
                                <h3 className="text-white/70 font-black uppercase tracking-[0.2em] text-xs mb-4">Mi Comisión Total</h3>
                                <p className="text-5xl font-black tracking-tighter mb-4">{formatCurrency(personalData?.totalCommission || 0)}</p>
                                <div className="flex flex-col gap-2 opacity-80 mt-6">
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Por Servicios:</span>
                                        <span className="font-bold">{formatCurrency(personalData?.serviceCommission || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Por Ventas:</span>
                                        <span className="font-bold">{formatCurrency(personalData?.productCommission || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100">
                            <h3 className="text-gray-400 font-black uppercase tracking-[0.2em] text-xs mb-6 flex items-center gap-2">
                                <CreditCard className="w-4 h-4" /> Métodos de Pago
                            </h3>
                            <div className="space-y-4">
                                {Object.entries(overview?.byMethod || {}).map(([method, amount]) => {
                                    const labels: Record<string, string> = {
                                        cash: 'Efectivo',
                                        transfer: 'Transferencia',
                                        debit: 'T. Débito',
                                        credit: 'T. Crédito',
                                        qr: 'QR / Digital'
                                    };
                                    if (amount === 0) return null;
                                    return (
                                        <div key={method} className="flex items-center justify-between group">
                                            <span className="text-gray-600 font-bold group-hover:text-[#34baab] transition-colors">{labels[method]}</span>
                                            <span className="text-gray-900 font-black">{formatCurrency(amount)}</span>
                                        </div>
                                    );
                                })}
                                {Object.values(overview?.byMethod || {}).every(v => v === 0) && (
                                    <p className="text-center text-gray-400 text-sm italic py-4">No se registran pagos.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Breakdown */}
                    <div className="lg:col-span-2 space-y-8">
                        {isAdmin ? (
                            <>
                                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100">
                                    <h3 className="text-gray-800 font-black text-2xl mb-8 flex items-center gap-3">
                                        <Users className="w-6 h-6 text-[#34baab]" /> Desglose por Profesional
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {Object.entries(overview?.byProfessional || {}).map(([id, data]) => {
                                            if (data.serviceCommission === 0 && data.productCommission === 0 && data.rentalCommission === 0) return null;
                                            return (
                                                <div key={id} className="bg-gray-50 rounded-3xl p-6 border border-gray-100 hover:border-[#34baab]/30 transition-all hover:bg-white hover:shadow-lg group">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <h4 className="font-black text-gray-900 text-lg group-hover:text-[#34baab] transition-colors">{data.name}</h4>
                                                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Actividad del período</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500 font-medium">Servicios (comisión):</span>
                                                            <span className="font-bold text-gray-800">{formatCurrency(data.serviceCommission)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500 font-medium">Productos (comisión):</span>
                                                            <span className="font-bold text-gray-800">{formatCurrency(data.productCommission)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500 font-medium">Alquileres (comisión):</span>
                                                            <span className="font-bold text-gray-800">{formatCurrency(data.rentalCommission)}</span>
                                                        </div>
                                                        <div className="pt-3 border-t border-gray-200 mt-3 flex justify-between items-baseline">
                                                            <span className="text-xs font-black uppercase text-[#34baab] tracking-widest">Total a Pagar:</span>
                                                            <span className="font-black text-[#34baab] text-xl">{formatCurrency(data.totalCommission)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {Object.values(overview?.byProfessional || {}).every(d => d.serviceCommission === 0 && d.productCommission === 0 && d.rentalCommission === 0) && (
                                            <div className="col-span-full py-12 text-center text-gray-400">
                                                No hay actividad registrada para profesionales en este período.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Product Sales Ranking */}
                                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 mt-8">
                                    <h3 className="text-gray-800 font-black text-2xl mb-8 flex items-center gap-3">
                                        <ShoppingBag className="w-6 h-6 text-emerald-500" /> Historial de Productos
                                    </h3>
                                    <div className="space-y-4">
                                        {Object.entries(overview?.byProduct || {}).sort((a, b) => b[1].quantity - a[1].quantity).map(([id, product]) => (
                                            <div key={id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100 group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm font-black text-sm">
                                                        {product.quantity}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-gray-800 group-hover:text-emerald-600 transition-colors">{product.name}</h4>
                                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Cantidad vendida</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-gray-900">{formatCurrency(product.income)}</p>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total recaudado</p>
                                                </div>
                                            </div>
                                        ))}
                                        {Object.keys(overview?.byProduct || {}).length === 0 && (
                                            <p className="text-center text-gray-400 py-8 italic">No se registran ventas de productos en este período.</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100">
                                <h3 className="text-gray-800 font-black text-2xl mb-8 flex items-center gap-3">
                                    <TrendingUp className="w-6 h-6 text-[#34baab]" /> Detalle de lo Generado
                                </h3>

                                <div className="space-y-6">
                                    <div className="bg-[#34baab]/5 rounded-3xl p-8 border border-[#34baab]/10 border-dashed">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#34baab]">
                                                <ArrowUpRight className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-[#34baab]">Producción Total</h4>
                                                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Base para el cálculo de comisiones</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Total Servicios</p>
                                                <p className="text-3xl font-black text-gray-900">{formatCurrency(personalData?.serviceIncome || 0)}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Total Productos</p>
                                                <p className="text-3xl font-black text-gray-900">{formatCurrency(personalData?.productIncome || 0)}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Total Alquileres</p>
                                                <p className="text-3xl font-black text-gray-900">{formatCurrency(personalData?.rentalIncome || 0)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                        <h4 className="font-black text-gray-800 mb-6 uppercase tracking-widest text-sm underline decoration-[#34baab] decoration-4 underline-offset-8">Resumen de Comisiones</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                                <span className="text-gray-600 font-bold uppercase tracking-tight text-xs">Comisión por Tratamientos</span>
                                                <span className="text-gray-900 font-black text-lg">{formatCurrency(personalData?.serviceCommission || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                                <span className="text-gray-600 font-bold uppercase tracking-tight text-xs">Comisión por Productos</span>
                                                <span className="text-gray-900 font-black text-lg">{formatCurrency(personalData?.productCommission || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                                <span className="text-gray-600 font-bold uppercase tracking-tight text-xs">Comisión por Alquileres</span>
                                                <span className="text-gray-900 font-black text-lg">{formatCurrency(personalData?.rentalCommission || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-[#34baab] text-white p-6 rounded-[2rem] shadow-lg shadow-[#34baab]/20 mt-8">
                                                <span className="font-black uppercase tracking-[0.2em] text-xs">Total Neto a Cobrar</span>
                                                <span className="text-3xl font-black">{formatCurrency(personalData?.totalCommission || 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
