'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    CalendarCheck,
    Clock,
    DollarSign,
    ClipboardList,
    ChevronLeft,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Appointment } from '@/lib/types/appointment';
import { getAppointmentsByClientId } from '@/lib/firebase/appointments';
import { Toaster } from 'sonner';

export default function MisTurnosPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        if (!loading && (!user || profile?.role !== 'client')) {
            router.push('/dashboard');
        }
    }, [user, profile, loading, router]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user || !profile) return;
            setHistoryLoading(true);
            try {
                const data = await getAppointmentsByClientId(user.uid, profile.fullName);
                setAppointments(data);
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

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />
            <div className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="bg-[#484450] rounded-3xl p-8 mb-8 shadow-lg text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-lg">
                                <ClipboardList className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight">Mis Turnos</h1>
                                <p className="text-gray-300 font-medium">Historial completo de tus sesiones.</p>
                            </div>
                        </div>
                        <Link href="/dashboard" className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-xl text-sm font-bold">
                            <ChevronLeft className="w-4 h-4" /> Volver
                        </Link>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto">
                    {historyLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="w-10 h-10 text-[#34baab] animate-spin" />
                        </div>
                    ) : appointments.length > 0 ? (
                        <div className="space-y-4">
                            {appointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((apt) => (
                                <div key={apt.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-[#34baab]/30 transition-all group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-[#34baab]/10 transition-colors">
                                                <CalendarCheck className="w-6 h-6 text-[#34baab]" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-gray-900 mb-1">{apt.treatment}</h3>
                                                <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-500">
                                                    <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-lg">
                                                        <Clock className="w-4 h-4 text-[#34baab]" /> {(() => {
                                                            const [year, month, day] = apt.date.split('-');
                                                            return `${day}/${month}/${year}`;
                                                        })()} - {apt.time}hs
                                                    </span>
                                                    <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-lg">
                                                        <ClipboardList className="w-4 h-4 text-[#34baab]" /> {apt.duration} {apt.duration === 1 ? 'hora' : 'horas'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                                            <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-2xl">
                                                <DollarSign className="w-5 h-5 text-green-600" />
                                                <span className="text-xl font-black text-green-700">${apt.price?.toLocaleString('es-AR') || '0'}</span>
                                            </div>
                                            <span className="px-3 py-1 bg-green-100 text-green-600 rounded-lg text-[10px] uppercase font-black tracking-widest h-fit">
                                                Confirmado
                                            </span>
                                        </div>
                                    </div>

                                    {apt.notes && (
                                        <div className="mt-6 pt-6 border-t border-gray-50">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Observaciones</p>
                                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 italic text-gray-600 text-sm">
                                                "{apt.notes}"
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[40px] p-16 text-center border-2 border-dashed border-gray-200">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Clock className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">No hay turnos registrados</h3>
                            <p className="text-gray-500 max-w-xs mx-auto">
                                Todavía no tienes sesiones en tu historial. ¡Te esperamos pronto!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
