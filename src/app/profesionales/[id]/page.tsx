'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getProfessionalById } from '@/lib/firebase/professionals';
import { Professional } from '@/lib/types/professional';
import {
    ChevronLeft,
    Settings,
    DollarSign,
    Calendar,
    Clock,
    User,
    Briefcase,
    Loader2,
    Save,
    Plus,
    X,
    TrendingUp,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast, Toaster } from 'sonner';
import { ProfessionalFinance } from '@/components/professionals/ProfessionalFinance';
import { ProfessionalAppointments } from '@/components/professionals/ProfessionalAppointments';
import { ProfessionalSchedule } from '@/components/professionals/ProfessionalSchedule';
import { getFinanceOverview } from '@/lib/firebase/finance';
import { formatCurrencyWithSymbol } from '@/lib/utils/currency';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function ProfessionalDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { profile } = useAuth();
    const [professional, setProfessional] = useState<Professional | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'appointments' | 'schedule'>('overview');

    // UI Expandable States
    const [isTreatmentsExpanded, setIsTreatmentsExpanded] = useState(false);
    const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
    const [monthlyPerformance, setMonthlyPerformance] = useState(0);

    const fetchProfessional = async () => {
        if (!id) return;
        try {
            const data = await getProfessionalById(id as string);
            if (data) {
                setProfessional(data);
            } else {
                toast.error('Profesional no encontrado');
                router.push('/profesionales');
            }
        } catch (error) {
            console.error('Error fetching professional:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfessional();
    }, [id]);

    useEffect(() => {
        // Calculate monthly performance
        const calculateMonthlyPerformance = async () => {
            if (!id || !professional) return;
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

            try {
                const finance = await getFinanceOverview(firstDay, lastDay);
                const profKey = professional.userId || (id as string);
                const profData = finance.byProfessional[profKey];
                if (profData) {
                    setMonthlyPerformance(profData.totalCommission);
                } else {
                    setMonthlyPerformance(0);
                }
            } catch (error) {
                console.error('Error calculating monthly performance:', error);
            }
        };

        if (professional) {
            calculateMonthlyPerformance();
        }
    }, [id, professional?.id, professional?.userId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-[#34baab] animate-spin" />
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Cargando Ficha Profesional...</p>
                </div>
            </div>
        );
    }

    if (!professional) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />

            {/* Header */}
            <div className="bg-[#484450] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full -mr-48 -mt-48 blur-3xl" />
                <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
                    <button
                        onClick={() => router.push('/profesionales')}
                        className="flex items-center gap-2 mb-8 text-gray-400 hover:text-white transition-colors group px-4 py-2 bg-white/5 rounded-xl border border-white/10 w-fit"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-black uppercase tracking-widest text-[10px]">Staff de Profesionales</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex items-center gap-8">
                            <div
                                className="w-24 h-24 rounded-[32px] flex items-center justify-center text-4xl font-black shadow-2xl transform hover:rotate-3 transition-transform cursor-default"
                                style={{ backgroundColor: professional.color }}
                            >
                                {professional.name.charAt(0)}
                            </div>
                            <div>
                                <h1 className="text-5xl font-black tracking-tighter mb-3">{professional.name}</h1>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${professional.active ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/10' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                        {professional.active ? 'Estado: Activo' : 'Estado: Inactivo'}
                                    </span>
                                    <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                        Tablero: #{professional.order}
                                    </div>
                                    {professional.legacyCollectionName && (
                                        <div className="px-4 py-1.5 bg-violet-500/20 rounded-full border border-violet-500/30 text-violet-300 text-[10px] font-black uppercase tracking-widest">
                                            Legacy: {professional.legacyCollectionName}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
                <div className="bg-white rounded-3xl shadow-2xl p-2.5 flex flex-wrap gap-2 border border-gray-100/50 backdrop-blur-sm">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 min-w-[140px] flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-[#484450] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <User className="w-4 h-4" /> Resumen
                    </button>
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`flex-1 min-w-[140px] flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'schedule' ? 'bg-[#484450] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <Clock className="w-4 h-4" /> Agenda & Horarios
                    </button>
                    <button
                        onClick={() => setActiveTab('finance')}
                        className={`flex-1 min-w-[140px] flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'finance' ? 'bg-[#484450] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <DollarSign className="w-4 h-4" /> Finanzas
                    </button>
                    <button
                        onClick={() => setActiveTab('appointments')}
                        className={`flex-1 min-w-[140px] flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'appointments' ? 'bg-[#484450] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <Calendar className="w-4 h-4" /> Historial Turnos
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 mt-6 md:mt-10">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
                        <div className="lg:col-span-2 space-y-6 md:space-y-8 h-fit">
                            {/* Treatments Card */}
                            <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden h-fit flex flex-col">
                                <button
                                    className="w-full text-left p-6 md:p-10 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                                    onClick={() => setIsTreatmentsExpanded(!isTreatmentsExpanded)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#34baab]/10 rounded-xl flex items-center justify-center">
                                            <Check className="w-6 h-6 text-[#34baab]" />
                                        </div>
                                        <h3 className="text-lg md:text-2xl font-black text-gray-900 uppercase">Tratamientos</h3>
                                    </div>
                                    <div className="bg-gray-100 p-2 rounded-xl">
                                        {isTreatmentsExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                    </div>
                                </button>

                                {isTreatmentsExpanded ? (
                                    <div className="px-6 pb-6 md:px-10 md:pb-10 pt-0">
                                        <div className="flex flex-wrap gap-2">
                                            {(professional.services || []).length > 0 ? (
                                                professional.services?.map(s => (
                                                    <span key={s} className="px-3 py-1.5 md:px-5 md:py-2 bg-violet-50 text-violet-600 rounded-xl font-bold text-[10px] md:text-xs border border-violet-100 uppercase tracking-widest shadow-sm">
                                                        {s}
                                                    </span>
                                                ))
                                            ) : (
                                                <p className="text-gray-400 italic font-medium">No hay tratamientos configurados</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="px-6 pb-6 md:px-10 md:pb-8 pt-0">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic ml-14 bg-gray-50/50 w-fit px-3 py-1 rounded-full border border-gray-100/50">
                                            {(professional.services || []).length} servicios asociados
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Schedule Summary Card */}
                            <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden h-fit flex flex-col">
                                <button
                                    className="w-full text-left p-6 md:p-10 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                                    onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center">
                                            <Clock className="w-6 h-6 text-violet-500" />
                                        </div>
                                        <h3 className="text-lg md:text-2xl font-black text-gray-900 uppercase">Horarios</h3>
                                    </div>
                                    <div className="bg-gray-100 p-2 rounded-xl">
                                        {isScheduleExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                    </div>
                                </button>

                                {isScheduleExpanded ? (
                                    <div className="px-6 pb-6 md:px-10 md:pb-10 pt-0">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {['1', '2', '3', '4', '5', '6', '0'].map(day => {
                                                const config = professional.workingHours?.[day];
                                                const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                                                return (
                                                    <div key={day} className={`p-3 md:p-4 rounded-xl border ${config?.enabled ? 'bg-gray-50 border-gray-100' : 'bg-gray-50/30 border-dashed border-gray-100 opacity-50'}`}>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">{dayNames[parseInt(day)]}</span>
                                                            {config?.enabled ? (
                                                                <span className="text-[10px] font-black text-[#34baab] uppercase tracking-widest">{config.start} - {config.end} hs</span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cerrado</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="px-6 pb-6 md:px-10 md:pb-8 pt-0">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic ml-14 bg-gray-50/50 w-fit px-3 py-1 rounded-full border border-gray-100/50">
                                            Ver disponibilidad semanal
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 md:space-y-8 h-fit">
                            {/* Commission Pulse Card */}
                            <div
                                className="p-8 md:p-10 rounded-[32px] md:rounded-[48px] shadow-2xl text-white relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all h-fit"
                                style={{ backgroundColor: professional.color }}
                                onClick={() => setActiveTab('finance')}
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-125 transition-transform pointer-events-none">
                                    <TrendingUp className="w-20 md:w-24 h-20 md:h-24" />
                                </div>
                                <DollarSign className="w-10 md:w-12 h-10 md:h-12 mb-4 md:mb-6 opacity-50" />
                                <p className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-80">Rendimiento Mensual</p>
                                <h4 className="text-3xl md:text-5xl font-black mt-2 tracking-tighter">
                                    {formatCurrencyWithSymbol(monthlyPerformance)}
                                </h4>
                                <div className="mt-8 flex items-center justify-between text-[10px] font-black uppercase tracking-widest pt-6 border-t border-white/10">
                                    <span>Ver Finanzas Detalladas</span>
                                    <ChevronLeft className="w-4 h-4 rotate-180" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <ProfessionalSchedule
                        professional={professional}
                        onUpdate={fetchProfessional}
                    />
                )}

                {activeTab === 'finance' && (
                    <ProfessionalFinance professional={professional} />
                )}

                {activeTab === 'appointments' && (
                    <ProfessionalAppointments professional={professional} />
                )}
            </div>
        </div>
    );
}
