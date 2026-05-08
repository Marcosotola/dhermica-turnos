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
    Loader2,
    CheckCircle2,
    XCircle,
    Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { Appointment } from '@/lib/types/appointment';
import { getAppointmentsByClientId } from '@/lib/firebase/appointments';
import { formatArgentineCurrency } from '@/lib/utils/currency';
import { Toaster } from 'sonner';
import { ClientCredit } from '@/lib/types/clientCredit';
import { getClientCredits } from '@/lib/firebase/clientCredits';
import { ClientLedger } from '@/components/clients/ClientLedger';

export default function MisTurnosPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [credits, setCredits] = useState<ClientCredit[]>([]);
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
                const [apts, creds] = await Promise.all([
                    getAppointmentsByClientId(user.uid, profile.fullName),
                    getClientCredits(user.uid, profile.fullName),
                ]);
                setAppointments(apts);
                setCredits(creds);
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

                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Estado de Cuenta */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-[#34baab]" /> Mi Estado de Cuenta
                        </h2>
                        <ClientLedger
                            appointments={appointments}
                            credits={credits}
                            loading={historyLoading}
                        />
                    </div>

                    {/* Historial de Turnos */}
                    <div>
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 px-1">
                            <CalendarCheck className="w-4 h-4 text-[#34baab]" /> Historial de Turnos
                        </h2>
                    {historyLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="w-10 h-10 text-[#34baab] animate-spin" />
                        </div>
                    ) : appointments.length > 0 ? (
                        <div className="space-y-4">
                            {appointments
                                .sort((a, b) => {
                                    const dateA = a.date || '';
                                    const dateB = b.date || '';
                                    return dateB.localeCompare(dateA); // Lexicographical sort for YYYY-MM-DD
                                })
                                .map((apt) => (
                                    <div key={apt.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-[#34baab]/30 transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#34baab]/5 rounded-full -mr-12 -mt-12" />
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
                                                                const parts = apt.date.split('-');
                                                                if (parts.length === 3) {
                                                                    const [year, month, day] = parts;
                                                                    return `${day}-${month}-${year}`;
                                                                }
                                                                return apt.date;
                                                            })()} - {apt.time}hs
                                                        </span>
                                                        <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-lg">
                                                            <ClipboardList className="w-4 h-4 text-[#34baab]" /> {apt.duration} {apt.duration === 1 ? 'hora' : 'horas'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                                                <div className="flex items-center gap-2 bg-[#34baab]/10 px-4 py-2 rounded-2xl border border-[#34baab]/20">
                                                    <DollarSign className="w-5 h-5 text-[#34baab]" />
                                                    <span className="text-xl font-black text-[#34baab]">$ {formatArgentineCurrency(apt.price || 0)}</span>
                                                </div>
                                                {(() => {
                                                    const totalPaid = (apt.payments || []).reduce((sum, p) => sum + p.amount, 0);
                                                    const balance = (apt.price || 0) - totalPaid;
                                                    const status = apt.status || 'pending';

                                                    return (
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            {/* Status Badge */}
                                                            {((status as any) === 'completed' || (status as any) === 'realizado') ? (
                                                                <span className="px-2.5 py-1 bg-green-100 text-green-600 rounded-full text-[9px] uppercase font-black tracking-widest flex items-center gap-1 border border-green-200">
                                                                    <CheckCircle2 className="w-3 h-3" /> Realizado
                                                                </span>
                                                            ) : ((status as any) === 'cancelled' || (status as any) === 'cancelado') ? (
                                                                <span className="px-2.5 py-1 bg-red-100 text-red-600 rounded-full text-[9px] uppercase font-black tracking-widest flex items-center gap-1 border border-red-200">
                                                                    <XCircle className="w-3 h-3" /> Cancelado
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 bg-amber-100 text-amber-600 rounded-full text-[9px] uppercase font-black tracking-widest flex items-center gap-1 border border-amber-200">
                                                                    <Clock className="w-3 h-3" /> Pendiente
                                                                </span>
                                                            )}

                                                            {/* Balance / Fully Paid Info */}
                                                            {(apt.payments || []).length > 0 && (
                                                                <div className="mt-1 flex flex-col items-end w-full">
                                                                    {balance > 0 ? (
                                                                        <div className="flex flex-col items-end w-full">
                                                                            <span className="text-[12px] font-black text-red-500 uppercase tracking-tighter">
                                                                                Saldo Pendiente: $ {formatArgentineCurrency(balance)}
                                                                            </span>
                                                                            {apt.payments && apt.payments.length > 0 && (
                                                                                <div className="flex flex-col gap-1 mt-2 w-full">
                                                                                    {apt.payments.map((p, i) => (
                                                                                        <div key={i} className="text-[10px] bg-gray-50 text-gray-600 p-3 rounded-2xl border border-gray-100 flex flex-col shadow-sm">
                                                                                            <span className="text-gray-400 uppercase text-[8px] mb-1">
                                                                                                {(() => {
                                                                                                    const parts = (p.date || '').split('-');
                                                                                                    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : p.date;
                                                                                                })()} • {p.method === 'cash' ? 'Efectivo' : p.method === 'transfer' ? 'Transferencia' : p.method === 'debit' ? 'Débito' : p.method === 'credit' ? 'Crédito' : p.method}
                                                                                            </span>
                                                                                            <span className="font-bold text-gray-900">{p.label}: $ {formatArgentineCurrency(p.amount)}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col items-end w-full">
                                                                            <span className="px-2.5 py-1 bg-[#34baab]/10 text-[#34baab] rounded-full text-[9px] uppercase font-black tracking-widest flex items-center gap-1 border border-[#34baab]/20">
                                                                                Totalmente Saldado
                                                                            </span>
                                                                            {apt.payments && apt.payments.length > 0 && (
                                                                                <div className="flex flex-col gap-1 mt-2 w-full">
                                                                                    {apt.payments.map((p, i) => (
                                                                                        <div key={i} className="text-[10px] bg-gray-50 text-gray-600 p-3 rounded-2xl border border-gray-100 flex flex-col shadow-sm">
                                                                                            <span className="text-gray-400 uppercase text-[8px] mb-1">
                                                                                                {(() => {
                                                                                                    const parts = (p.date || '').split('-');
                                                                                                    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : p.date;
                                                                                                })()} • {p.method === 'cash' ? 'Efectivo' : p.method === 'transfer' ? 'Transferencia' : p.method === 'debit' ? 'Débito' : p.method === 'credit' ? 'Crédito' : p.method}
                                                                                            </span>
                                                                                            <span className="font-bold text-gray-900">{p.label}: $ {formatArgentineCurrency(p.amount)}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
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
        </div>
    );
}
