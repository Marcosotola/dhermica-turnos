'use client';

import { useState } from 'react';
import { Pencil, Trash2, Plus, MoreVertical, X, DollarSign, CheckCircle2, Clock, XCircle, Ban, AlertCircle, Coffee, ShieldAlert, User } from 'lucide-react';
import Link from 'next/link';
import { Appointment } from '@/lib/types/appointment';
import { Professional } from '@/lib/types/professional';
import { generateTimeSlots, timeToDecimal } from '@/lib/utils/time';
import { isTimeSlotOccupied, checkAppointmentConflict } from '@/lib/utils/validation';
import { Button } from '../ui/Button';
import { formatCurrencyWithSymbol } from '@/lib/utils/currency';

interface AppointmentTableProps {
    appointments: Appointment[];
    professionals: Professional[];
    onCreateClick: (time: string, professionalId?: string) => void;
    onEditClick: (appointment: Appointment) => void;
    onCancelClick: (appointment: Appointment) => void;
    onDetailClick: (appointment: Appointment) => void;
    onQuickPaymentClick: (appointment: Appointment) => void;
    onExceptionEdit?: (professionalId: string, date: string) => void;
    onExceptionDelete?: (professionalId: string, date: string) => void;
    selectedDate: string;
}

export function AppointmentTable({
    appointments,
    professionals,
    onCreateClick,
    onEditClick,
    onCancelClick,
    onDetailClick,
    onQuickPaymentClick,
    onExceptionEdit,
    onExceptionDelete,
    selectedDate,
}: AppointmentTableProps) {
    const [activeExceptionMenu, setActiveExceptionMenu] = useState<string | null>(null);
    const timeSlots = generateTimeSlots();

    // Agrupar turnos por profesional y horario
    const getAppointmentForSlot = (time: string, professionalId?: string) => {
        return appointments.find(
            (apt) =>
                apt.professionalId === professionalId &&
                isTimeSlotOccupied(time, apt) &&
                apt.status !== 'cancelled' &&
                apt.status !== 'cancelado'
        );
    };

    // Turnos sin profesional asignado (legacy)
    const getLegacyAppointmentForSlot = (time: string) => {
        return appointments.find(
            (apt) =>
                !apt.professionalId &&
                isTimeSlotOccupied(time, apt) &&
                apt.status !== 'cancelled' &&
                apt.status !== 'cancelado'
        );
    };

    // Verificar si es el primer slot de un turno
    const isFirstSlot = (time: string, appointment: Appointment) => {
        return time === appointment.time;
    };

    // Calcular rowspan según duración
    const getRowSpan = (appointment: Appointment) => {
        return Math.ceil(appointment.duration / 0.5);
    };

    // Calcular qué profesionales tienen turnos para ajustar el ancho de las columnas
    const professionalsWithData = new Set(appointments.map(apt => apt.professionalId).filter(Boolean));

    return (
        <div 
            className="w-full overflow-x-auto overflow-y-visible relative rounded-lg border border-gray-400"
            onClick={() => setActiveExceptionMenu(null)}
        >
            <table className="border-separate border-spacing-0 bg-white">
                <thead>
                    <tr className="bg-[#f2f2f2] text-[#484450]">
                        <th className="sticky left-0 z-30 bg-[#f2f2f2] px-4 py-3 text-left font-bold border-r border-b border-gray-400 shadow-[2px_0_5px_rgba(0,0,0,0.05)] w-[80px] min-w-[80px]">
                            Hora
                        </th>
                        {professionals.map((prof) => {
                            const hasData = professionalsWithData.has(prof.id);
                            return (
                                <th
                                    key={prof.id}
                                    className={`px-0 py-0 text-left font-semibold border-b border-r border-gray-400 text-white shadow-sm transition-all duration-300 ${hasData ? 'w-[220px] min-w-[220px]' : 'w-[85px] min-w-[85px]'
                                        }`}
                                    style={{ backgroundColor: prof.color }}
                                >
                                    <Link 
                                        href={`/profesionales/${prof.id}`}
                                        className="group/prof flex items-center justify-between px-3 py-3 w-full h-full hover:bg-black/10 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <span className="text-lg font-bold truncate block">{prof.name}</span>
                                        <User className="w-4 h-4 opacity-0 group-hover/prof:opacity-100 transition-opacity" />
                                    </Link>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {timeSlots.map((time, index) => {
                        const isEven = index % 2 === 0;
                        const rowBgClass = isEven ? 'bg-white' : 'bg-gray-50/80';

                        return (
                            <tr key={time} className={`${rowBgClass} hover:bg-blue-50/30 transition-colors`}>
                                {/* Hora */}
                                <td className={`sticky left-0 z-20 ${isEven ? 'bg-white' : 'bg-[#fcfcfc]'} border-r border-b border-gray-400 px-4 py-4 font-black text-gray-700 text-sm shadow-[2px_0_5px_rgba(0,0,0,0.05)] w-[80px] min-w-[80px]`}>
                                    {time}
                                </td>

                                {professionals.map((prof) => {
                                    const apt = getAppointmentForSlot(time, prof.id);

                                    // Lógica para detectar si hay una excepción/ausencia que deba ocupar este slot
                                    const { isOrphan, type, note, reason } = checkAppointmentConflict({
                                        date: selectedDate,
                                        time: time,
                                        duration: 0.5
                                    }, prof);

                                    const isAbsence = isOrphan && type === 'absence';

                                    // Determinar si debemos mostrar la celda o si está ocupada por un rowSpan previo
                                    // Para turnos:
                                    const isAptFirstSlot = !apt || isFirstSlot(time, apt);
                                    
                                    // Para ausencias:
                                    // Si es el primer slot de la ausencia (o si es todo el día y es el primer slot de la tabla)
                                    let isAbsenceFirstSlot = false;
                                    let absenceRowSpan = 1;

                                    if (isAbsence) {
                                        const exception = prof.exceptions?.find(ex => ex.date === selectedDate);
                                        if (exception) {
                                            const startStr = exception.start || timeSlots[0];
                                            const endStr = exception.end || timeSlots[timeSlots.length - 1];
                                            
                                            isAbsenceFirstSlot = time === startStr;
                                            
                                            if (isAbsenceFirstSlot) {
                                                const startIdx = timeSlots.indexOf(startStr);
                                                const endIdx = timeSlots.indexOf(endStr);
                                                
                                                // Si es por rango (ej: 09:00 a 11:00), el rowSpan es la diferencia de índices
                                                // Si es todo el día (start y end son los extremos), sumamos 1 para cubrir la última fila
                                                const isFullDay = !exception.start && !exception.end;
                                                absenceRowSpan = Math.max(1, endIdx - startIdx + (isFullDay ? 1 : 0));
                                            }
                                        }
                                    }

                                    const showCell = (apt ? isAptFirstSlot : (isAbsence ? isAbsenceFirstSlot : true));
                                    const hasData = professionalsWithData.has(prof.id);

                                    if (!showCell) return null;

                                    return (
                                        <td
                                            key={prof.id}
                                            className={`px-2 py-2 border-r border-b border-gray-400 transition-all duration-300 ${hasData ? 'w-[220px] min-w-[220px]' : 'w-[85px] min-w-[85px]'
                                                }`}
                                            rowSpan={apt ? getRowSpan(apt) : (isAbsence ? absenceRowSpan : 1)}
                                        >
                                            {apt ? (
                                                <AppointmentCell
                                                    appointment={apt}
                                                    professional={prof}
                                                    onEdit={() => onEditClick(apt)}
                                                    onDelete={() => onCancelClick(apt)}
                                                    onDetail={() => onDetailClick(apt)}
                                                    onQuickPayment={() => onQuickPaymentClick(apt)}
                                                    isLastRows={index >= timeSlots.length - 3}
                                                />
                                            ) : isAbsence ? (
                                                <div className="group/absence relative flex flex-col items-center justify-center h-full bg-slate-100 rounded-2xl border-2 border-slate-200 border-dashed p-4 shadow-inner min-h-[60px] animate-in zoom-in duration-500" title={reason}>
                                                    {/* Menú de acción para excepciones */}
                                                    <div className="absolute top-2 right-2 z-30">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const key = `${prof.id}-${time}`;
                                                                setActiveExceptionMenu(activeExceptionMenu === key ? null : key);
                                                            }}
                                                            className="p-1.5 bg-white/90 hover:bg-white text-slate-600 rounded-lg shadow-sm border border-slate-200 transition-all hover:scale-110 active:scale-95"
                                                            title="Acciones"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>

                                                        {activeExceptionMenu === `${prof.id}-${time}` && (
                                                            <>
                                                                <div 
                                                                    className="fixed inset-0 z-30" 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveExceptionMenu(null);
                                                                    }} 
                                                                />
                                                                <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-2xl ring-1 ring-black/5 border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in duration-200 origin-top-right">
                                                                <div className="px-3 py-1 mb-1 border-b border-gray-50 flex items-center justify-between">
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acciones</span>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveExceptionMenu(null);
                                                                        onExceptionEdit?.(prof.id, selectedDate);
                                                                    }}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                                                >
                                                                    <div className="w-7 h-7 rounded-lg bg-[#34baab]/10 flex items-center justify-center">
                                                                        <Pencil className="w-3.5 h-3.5 text-[#34baab]" />
                                                                    </div>
                                                                    Editar
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveExceptionMenu(null);
                                                                        onExceptionDelete?.(prof.id, selectedDate);
                                                                    }}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                                                                >
                                                                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                                                                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                                                    </div>
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    <ShieldAlert className="w-6 h-6 text-slate-400 mb-2 opacity-50" />
                                                    <span className="text-xs font-black uppercase tracking-tight text-slate-600 text-center leading-tight break-words max-w-[180px]">
                                                        {note || 'Ausencia / No Disponible'}
                                                    </span>
                                                </div>
                                            ) : (() => {
                                                // Si llegamos aquí es un slot vacío sin conflicto de ausencia (podría ser almuerzo o libre)
                                                const isLunch = isOrphan && type === 'lunch';

                                                if (isOrphan) {
                                                    if (isLunch) {
                                                        return (
                                                            <div className="flex flex-col items-center justify-center py-1 opacity-50 group-hover:opacity-80 transition-opacity" title={reason}>
                                                                <Coffee className="w-5 h-5 text-amber-700/80" />
                                                                <span className="text-[7px] font-black uppercase tracking-tighter text-amber-800/80 mt-0.5">Descanso</span>
                                                            </div>
                                                        );
                                                    }
                                                    return <div className="h-10 bg-gray-50/30 rounded-lg border border-dashed border-gray-100/50" title={reason} />;
                                                }

                                                return (
                                                    <div className="flex justify-center py-1">
                                                        <button
                                                            onClick={() => onCreateClick(time, prof.id)}
                                                            className="w-10 h-10 text-white rounded-md shadow-md transition-all flex items-center justify-center transform active:scale-95 hover:brightness-110"
                                                            style={{ backgroundColor: prof.color || '#45a049' }}
                                                            title={`Nuevo Turno con ${prof.name}`}
                                                        >
                                                            <Plus className="w-6 h-6" />
                                                        </button>
                                                    </div>
                                                );
                                            })() }
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

interface AppointmentCellProps {
    appointment: Appointment;
    professional: Professional;
    onEdit: () => void;
    onDelete: () => void;
    onDetail: () => void;
    onQuickPayment: () => void;
    isLastRows?: boolean;
}

function AppointmentCell({
    appointment,
    professional,
    onEdit,
    onDelete,
    onDetail,
    onQuickPayment,
    isLastRows,
}: AppointmentCellProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const { isOrphan, reason } = checkAppointmentConflict(appointment, professional);

    const handleAction = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        setMenuOpen(false);
        action();
    };

    return (
        <div
            className={`p-2 pb-2.5 px-1.5 rounded-lg border-l-4 bg-gradient-to-r from-white to-gray-50/30 relative group transition-all hover:shadow-md border cursor-pointer active:scale-[0.98] ${menuOpen ? 'z-40 shadow-lg ring-2 ring-[#34baab]/20' : 'z-10'
                } ${isOrphan ? 'border-red-500 ring-2 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-gray-100/50'}
            `}
            style={{ borderLeftColor: isOrphan ? '#ef4444' : (professional.color || '#6B7280') }}
            title={isOrphan ? `CONFLICTO: ${reason}` : undefined}
            onClick={(e) => {
                if (!menuOpen) onDetail();
            }}
        >
            <div className="flex items-center justify-start gap-1">
                <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-gray-900 break-words text-sm leading-tight">
                        {appointment.clientName}
                    </p>
                    <p className="text-xs text-gray-700 font-semibold mt-0.5 uppercase tracking-wide break-words leading-tight">
                        {appointment.treatment}
                    </p>
                    {appointment.price !== undefined && (
                        <div className="flex flex-col gap-1 mt-1">
                            <div className="flex items-center gap-1.5">
                                <p className="text-[10px] font-bold text-violet-600">
                                    {formatCurrencyWithSymbol(appointment.price)}
                                </p>
                                {(() => {
                                    const totalPaid = (appointment.payments || []).reduce((sum, p) => sum + p.amount, 0);
                                    const balance = (appointment.price || 0) - totalPaid;
                                    const status = appointment.status || 'pending';

                                    return (
                                        <div className="flex flex-col gap-1 mt-1">
                                            {/* Balance / Paid Badge */}
                                            {balance > 0 ? (
                                                <div className="flex items-center gap-0.5 bg-red-50 text-red-500 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border border-red-100 animate-pulse w-fit">
                                                    <span>Saldo: {formatCurrencyWithSymbol(balance)}</span>
                                                </div>
                                            ) : (appointment.price || 0) > 0 && (
                                                <div className="flex items-center gap-0.5 bg-green-50 text-green-600 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border border-green-100 w-fit">
                                                    <span>Saldado</span>
                                                </div>
                                            )}

                                            {/* Status Badge - Smalls and at the bottom */}
                                            <div className="flex flex-wrap gap-1">
                                                {status === 'completed' && (
                                                    <div className="bg-green-50 text-green-600 px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter border border-green-100 flex items-center gap-0.5">
                                                        <div className="w-1 h-1 rounded-full bg-green-500" />
                                                        <span>Realizado</span>
                                                    </div>
                                                )}
                                                {status === 'pending' && (
                                                    <div className="bg-amber-50 text-amber-600 px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter border border-amber-100 flex items-center gap-0.5">
                                                        <div className="w-1 h-1 rounded-full bg-amber-500" />
                                                        <span>Pendiente</span>
                                                    </div>
                                                )}
                                                {status === 'cancelled' && (
                                                    <div className="bg-gray-50 text-gray-500 px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter border border-gray-100 flex items-center gap-0.5">
                                                        <div className="w-1 h-1 rounded-full bg-gray-400" />
                                                        <span>Cancelado</span>
                                                    </div>
                                                )}
                                                {isOrphan && (
                                                    <div className="bg-red-50 text-red-600 px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter border border-red-200 flex items-center gap-0.5 animate-pulse">
                                                        <AlertCircle className="w-2.5 h-2.5 text-red-600" />
                                                        <span>Conflicto</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative flex-shrink-0">
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Evitar abrir el modal de detalle
                            setMenuOpen(!menuOpen);
                        }}
                        className={`p-2 rounded-full transition-colors ${menuOpen ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-400 hover:bg-white hover:shadow-md'
                            }`}
                        title="Opciones"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {menuOpen && (
                        <>
                            {/* Backdrop to close menu - Using a higher z than other table elements */}
                            <div
                                className="fixed inset-0 z-30 bg-black/5"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpen(false);
                                }}
                            />

                            {/* Dropdown Menu - z-40 to be above backdrop */}
                            <div className={`absolute right-0 ${isLastRows ? 'bottom-full mb-1' : 'top-full mt-1'} w-44 bg-white rounded-xl shadow-2xl border border-gray-100 z-40 py-2 overflow-hidden animate-in fade-in zoom-in duration-150`}>
                                <div className="px-3 py-1 mb-1 border-b border-gray-50 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acciones</span>
                                    <button aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                        <X className="w-3 h-3 text-gray-400" />
                                    </button>
                                </div>
                                <button
                                    onClick={(e) => handleAction(e, onEdit)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <Pencil className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span className="font-semibold">Editar Turno</span>
                                </button>
                                <button
                                    onClick={(e) => handleAction(e, onQuickPayment)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#34baab] hover:bg-[#34baab]/5 transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#34baab]/10 flex items-center justify-center">
                                        <DollarSign className="w-4 h-4 text-[#34baab]" />
                                    </div>
                                    <span className="font-semibold">Cobrar / Cerrar</span>
                                </button>
                                <button
                                    onClick={(e) => handleAction(e, onDelete)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-amber-600 hover:bg-amber-50 transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                        <Ban className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <span className="font-semibold">Cancelar</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {appointment.notes && (
                <div className="mt-2 pt-2 border-t border-gray-50">
                    <p className="text-[11px] text-gray-500 italic line-clamp-2 leading-relaxed">
                        {appointment.notes}
                    </p>
                </div>
            )}
        </div>
    );
}
