'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ChevronRight, X, Calendar } from 'lucide-react';
import { Appointment } from '@/lib/types/appointment';
import { Professional } from '@/lib/types/professional';
import { getAppointmentsByDateRange } from '@/lib/firebase/appointments';
import { getActiveProfessionals } from '@/lib/firebase/professionals';
import { checkAppointmentConflict } from '@/lib/utils/validation';
import { getTodayDate } from '@/lib/utils/time';
import Link from 'next/link';
import { MessageCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

export function OrphanAlertBanner() {
    const [conflicts, setConflicts] = useState<{ appointment: Appointment; professional: Professional; reason: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const { profile } = useAuth();

    useEffect(() => {
        async function checkConflicts() {
            try {
                const today = getTodayDate();
                const thirtyDaysLater = new Date();
                thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
                const endDate = thirtyDaysLater.toISOString().split('T')[0];

                const [appointments, professionals] = await Promise.all([
                    getAppointmentsByDateRange(today, endDate),
                    getActiveProfessionals()
                ]);

                const foundConflicts: { appointment: Appointment; professional: Professional; reason: string }[] = [];

                appointments.forEach(apt => {
                    if ((apt.status as any) === 'cancelled' || (apt.status as any) === 'cancelado') return;
                    
                    // Si es un profesional, solo ver sus propios conflictos
                    if (profile?.role === 'professional' && apt.professionalId !== profile?.uid) return;

                    const professional = professionals.find(p => p.id === apt.professionalId);
                    if (professional) {
                        const { isOrphan, reason } = checkAppointmentConflict(apt, professional);
                        if (isOrphan) {
                            foundConflicts.push({
                                appointment: apt,
                                professional,
                                reason: reason || 'Conflicto de horario'
                            });
                        }
                    }
                });

                setConflicts(foundConflicts);
            } catch (error) {
                console.error('[OrphanAlert] Error checking conflicts:', error);
            } finally {
                setLoading(false);
            }
        }

        checkConflicts();
    }, []);

    if (loading || conflicts.length === 0 || !isVisible) return null;

    return (
        <div className="mb-6 animate-in fade-in slide-in-from-top duration-500">
            <div className="bg-red-50 border border-red-200 rounded-3xl p-5 md:p-6 shadow-sm relative overflow-hidden group">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                    <AlertCircle className="w-32 h-32 text-red-600 rotate-12" />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-red-900 leading-tight uppercase tracking-tight">
                                Hay {conflicts.length} turnos con conflictos de horario
                            </h3>
                            <p className="text-sm text-red-700 mt-1 font-medium opacity-80">
                                Se detectaron turnos programados fuera de la disponibilidad de los profesionales.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-red-200 transition-all active:scale-95 whitespace-nowrap"
                        >
                            {isExpanded ? 'Ocultar Detalles' : 'Ver Detalles'}
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button 
                            onClick={() => setIsVisible(false)}
                            className="p-3 text-red-300 hover:text-red-500 hover:bg-red-100/50 rounded-xl transition-colors"
                            aria-label="Cerrar aviso"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Detailed List Table */}
                {isExpanded && (
                    <div className="mt-6 border-t border-red-200 pt-6 animate-in slide-in-from-top duration-300">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-red-400">
                                        <th className="pb-3 pl-2">Fecha / Hora</th>
                                        <th className="pb-3">Cliente</th>
                                        <th className="pb-3">Profesional</th>
                                        <th className="pb-3">Conflicto</th>
                                        <th className="pb-3 text-right pr-2">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-red-100">
                                    {conflicts.map(({ appointment, professional, reason }, index) => (
                                        <tr key={index} className="group hover:bg-red-100/30 transition-colors">
                                            <td className="py-4 pl-2">
                                                <p className="text-sm font-black text-red-900">{appointment.date.split('-').reverse().join('/')}</p>
                                                <p className="text-xs text-red-600 font-bold">{appointment.time} hs</p>
                                            </td>
                                            <td className="py-4">
                                                <p className="text-sm font-bold text-gray-900 leading-tight">{appointment.clientName}</p>
                                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">{appointment.treatment}</p>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: professional.color }} />
                                                    <p className="text-xs font-bold text-gray-700">{professional.name}</p>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-1 rounded-lg uppercase tracking-tight border border-red-200">
                                                    {reason}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right pr-2">
                                                <div className="flex items-center justify-end gap-2">
                                                    <a 
                                                        href={`https://wa.me/${appointment.clientPhone?.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-sm shadow-green-200"
                                                        title="WhatsApp para reprogramar"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </a>
                                                    <Link 
                                                        href={`/turnos?date=${appointment.date}`}
                                                        className="p-2 bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors shadow-sm"
                                                        title="Ver en Agenda"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
