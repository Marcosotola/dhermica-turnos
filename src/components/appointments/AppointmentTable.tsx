'use client';

import { useState } from 'react';
import { Pencil, Trash2, Plus, MoreVertical, X, DollarSign, CheckCircle2 } from 'lucide-react';
import { Appointment } from '@/lib/types/appointment';
import { Professional } from '@/lib/types/professional';
import { generateTimeSlots, timeToDecimal } from '@/lib/utils/time';
import { isTimeSlotOccupied } from '@/lib/utils/validation';
import { Button } from '../ui/Button';

interface AppointmentTableProps {
    appointments: Appointment[];
    professionals: Professional[];
    onCreateClick: (time: string, professionalId?: string) => void;
    onEditClick: (appointment: Appointment) => void;
    onDeleteClick: (appointment: Appointment) => void;
}

export function AppointmentTable({
    appointments,
    professionals,
    onCreateClick,
    onEditClick,
    onDeleteClick,
}: AppointmentTableProps) {
    const timeSlots = generateTimeSlots();

    // Agrupar turnos por profesional y horario
    const getAppointmentForSlot = (time: string, professionalId?: string) => {
        return appointments.find(
            (apt) =>
                apt.professionalId === professionalId &&
                isTimeSlotOccupied(time, apt)
        );
    };

    // Turnos sin profesional asignado (legacy)
    const getLegacyAppointmentForSlot = (time: string) => {
        return appointments.find(
            (apt) => !apt.professionalId && isTimeSlotOccupied(time, apt)
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
        <div className="w-full overflow-x-auto relative rounded-lg border border-gray-400">
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
                                    className={`px-2 py-3 text-left font-semibold border-b border-r border-gray-400 text-white shadow-sm transition-all duration-300 ${hasData ? 'w-[220px] min-w-[220px]' : 'w-[85px] min-w-[85px]'
                                        }`}
                                    style={{ backgroundColor: prof.color }}
                                >
                                    <span className="text-lg font-bold truncate block">{prof.name}</span>
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

                                {/* Profesionales */}
                                {professionals.map((prof) => {
                                    const apt = getAppointmentForSlot(time, prof.id);
                                    const showCell = !apt || isFirstSlot(time, apt);
                                    const hasData = professionalsWithData.has(prof.id);

                                    if (!showCell) return null;

                                    return (
                                        <td
                                            key={prof.id}
                                            className={`px-2 py-2 border-r border-b border-gray-400 transition-all duration-300 ${hasData ? 'w-[220px] min-w-[220px]' : 'w-[85px] min-w-[85px]'
                                                }`}
                                            rowSpan={apt ? getRowSpan(apt) : 1}
                                        >
                                            {apt ? (
                                                <AppointmentCell
                                                    appointment={apt}
                                                    professionalColor={prof.color}
                                                    onEdit={() => onEditClick(apt)}
                                                    onDelete={() => onDeleteClick(apt)}
                                                    isLastRows={index >= timeSlots.length - 3}
                                                />
                                            ) : (
                                                <div className="flex justify-center py-1">
                                                    <button
                                                        onClick={() => onCreateClick(time, prof.id)}
                                                        className="w-10 h-10 bg-[#45a049] hover:bg-[#3d8b40] text-white rounded-md shadow-md transition-all flex items-center justify-center transform active:scale-95"
                                                        title={`Nuevo Turno con ${prof.name}`}
                                                    >
                                                        <Plus className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            )}
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
    professionalColor?: string;
    onEdit: () => void;
    onDelete: () => void;
    isLastRows?: boolean;
}

function AppointmentCell({
    appointment,
    professionalColor,
    onEdit,
    onDelete,
    isLastRows,
}: AppointmentCellProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleAction = (action: () => void) => {
        setMenuOpen(false);
        action();
    };

    return (
        <div
            className="p-2 pb-2.5 px-1.5 rounded-lg border-l-4 bg-gradient-to-r from-white to-gray-50/30 relative group transition-all hover:shadow-md border border-gray-100/50"
            style={{ borderLeftColor: professionalColor || '#6B7280' }}
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
                        <div className="flex items-center gap-1.5 mt-1">
                            <p className="text-[10px] font-bold text-violet-600">
                                ${appointment.price.toFixed(2)}
                            </p>
                            {appointment.isPaid && (
                                <div className="flex items-center gap-0.5 bg-green-50 text-green-600 px-1 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border border-green-100">
                                    <CheckCircle2 className="w-2 h-2" />
                                    <span>Pagado</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="relative flex-shrink-0">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`p-2 rounded-full transition-colors ${menuOpen ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-400 hover:bg-white hover:shadow-md'
                            }`}
                        title="Opciones"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {menuOpen && (
                        <>
                            {/* Backdrop to close menu */}
                            <div
                                className="fixed inset-0 z-20"
                                onClick={() => setMenuOpen(false)}
                            />

                            {/* Dropdown Menu */}
                            <div className={`absolute right-0 ${isLastRows ? 'bottom-full mb-1' : 'top-full mt-1'} w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-30 py-2 overflow-hidden animate-in fade-in zoom-in duration-150`}>
                                <div className="px-3 py-1 mb-1 border-b border-gray-50 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acciones</span>
                                    <button onClick={() => setMenuOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                        <X className="w-3 h-3 text-gray-400" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleAction(onEdit)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <Pencil className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span className="font-semibold">Editar Turno</span>
                                </button>
                                <button
                                    onClick={() => handleAction(onDelete)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </div>
                                    <span className="font-semibold">Eliminar</span>
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
