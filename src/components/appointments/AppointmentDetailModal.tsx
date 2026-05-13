'use client';

import { Appointment } from '@/lib/types/appointment';
import { Professional } from '@/lib/types/professional';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrencyWithSymbol } from '@/lib/utils/currency';
import {
    Calendar,
    Clock,
    User,
    CreditCard,
    FileText,
    Pencil,
    Trash2,
    CheckCircle2,
    XCircle,
    BadgeDollarSign,
    UserCircle2,
    Phone,
    Mail,
    DollarSign,
    Ban,
} from 'lucide-react';

interface AppointmentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: Appointment | null;
    professionals: Professional[];
    onEdit: (appointment: Appointment) => void;
    onCancel: (appointment: Appointment) => void;
    onDelete: (appointment: Appointment) => void;
    onQuickPayment?: (appointment: Appointment) => void;
}

export function AppointmentDetailModal({
    isOpen,
    onClose,
    appointment,
    professionals,
    onEdit,
    onCancel,
    onDelete,
    onQuickPayment,
}: AppointmentDetailModalProps) {
    if (!appointment) return null;

    const professional = professionals.find(p => p.id === appointment.professionalId);
    const totalPaid = (appointment.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const balance = (appointment.price || 0) - totalPaid;

    const [year, month, day] = appointment.date.split('-');
    const formattedDate = `${day}/${month}/${year}`;

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'completed':
            case 'realizado':
                return { label: 'Realizado', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' };
            case 'cancelled':
            case 'cancelado':
                return { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' };
            default:
                return { label: 'Pendiente', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
        }
    };

    const statusInfo = getStatusInfo(appointment.status as any || 'pending');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Detalles del Turno"
            size="md"
            footer={
                <div className="flex flex-col gap-2 w-full">
                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                onClose();
                                onEdit(appointment);
                            }}
                            variant="secondary"
                            className="flex-1 py-3 font-bold flex items-center justify-center gap-2 border-gray-200"
                        >
                            <Pencil className="w-4 h-4" /> Editar
                        </Button>
                        <Button
                            onClick={() => {
                                onClose();
                                onCancel(appointment);
                            }}
                            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 font-bold flex items-center justify-center gap-2 text-white shadow-lg shadow-amber-500/10"
                        >
                            <Ban className="w-4 h-4" /> Cancelar
                        </Button>
                        <Button
                            onClick={() => {
                                onClose();
                                onDelete(appointment);
                            }}
                            className="py-3 px-4 bg-red-500 hover:bg-red-600 font-bold flex items-center justify-center gap-2 text-white shadow-lg shadow-red-500/10"
                            title="Eliminar permanentemente"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                    {onQuickPayment && (
                        <Button
                            onClick={() => {
                                onQuickPayment(appointment);
                            }}
                            className="w-full py-4 bg-[#34baab] hover:bg-[#2da699] font-bold flex items-center justify-center gap-2 text-white shadow-lg shadow-[#34baab]/10"
                        >
                            <DollarSign className="w-5 h-5" /> Cobrar / Cerrar
                        </Button>
                    )}
                </div>
            }
        >
            <div className="space-y-6">
                {/* Header Status */}
                <div className={`flex items-center justify-between p-4 rounded-2xl border-2 ${statusInfo.bg} ${statusInfo.border}`}>
                    <div className="flex items-center gap-3">
                        <statusInfo.icon className={`w-6 h-6 ${statusInfo.color}`} />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Estado</p>
                            <p className={`font-black uppercase text-sm ${statusInfo.color}`}>{statusInfo.label}</p>
                        </div>
                    </div>
                    {balance > 0 ? (
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Saldo Pendiente</p>
                            <p className="font-black text-red-600 text-lg">{formatCurrencyWithSymbol(balance)}</p>
                        </div>
                    ) : (
                        <div className="bg-green-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> SALDADO
                        </div>
                    )}
                </div>

                {/* Main Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <UserCircle2 className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Cliente</span>
                        </div>
                        <p className="font-bold text-gray-900 text-lg leading-tight">{appointment.clientName}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <BadgeDollarSign className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Servicio</span>
                        </div>
                        <p className="font-bold text-gray-900 text-lg leading-tight">{appointment.treatment}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Phone className="w-4 h-4 text-[#34baab]" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Teléfono / WhatsApp</span>
                        </div>
                        {appointment.clientPhone ? (
                            <a 
                                href={`https://wa.me/${appointment.clientPhone.replace(/\+/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-bold text-[#34baab] hover:underline flex items-center gap-2"
                            >
                                {appointment.clientPhone}
                            </a>
                        ) : (
                            <p className="text-gray-400 italic">No registrado</p>
                        )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Mail className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Email</span>
                        </div>
                        <p className="font-bold text-gray-900 truncate">{appointment.clientEmail || 'No registrado'}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Calendar className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Fecha y Hora</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900">{formattedDate}</p>
                            <span className="text-gray-300">|</span>
                            <p className="font-black text-[#34baab]">{appointment.time}</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative overflow-hidden">
                        <div
                            className="absolute right-0 top-0 bottom-0 w-1.5"
                            style={{ backgroundColor: professional?.color || '#eee' }}
                        />
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <User className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Profesional</span>
                        </div>
                        <p className="font-bold text-gray-900">{professional?.name || 'No asignado'}</p>
                    </div>

                    {((appointment.commissionPercentageOverride !== undefined && appointment.commissionPercentageOverride !== null) ||
                      (appointment.commissionFixedOverride !== undefined && appointment.commissionFixedOverride !== null)) && (
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 md:col-span-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <BadgeDollarSign className="w-6 h-6 text-blue-500" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 leading-none mb-1">Comisión Especial</p>
                                    {appointment.commissionFixedOverride !== undefined && appointment.commissionFixedOverride !== null ? (
                                        <p className="font-black text-blue-600">Monto fijo para este turno</p>
                                    ) : (
                                        <p className="font-black text-blue-600">Este turno paga el {appointment.commissionPercentageOverride}%</p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 leading-none mb-1">Monto para el Prof.</p>
                                <p className="font-black text-blue-700 text-lg">
                                    {appointment.commissionFixedOverride !== undefined && appointment.commissionFixedOverride !== null
                                        ? formatCurrencyWithSymbol(appointment.commissionFixedOverride)
                                        : formatCurrencyWithSymbol((appointment.price || 0) * ((appointment.commissionPercentageOverride || 0) / 100))
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Financial Details */}
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                        <div className="flex items-center gap-2 text-gray-500">
                            <CreditCard className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Pagos y Precio</span>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Precio Total</p>
                            <p className="font-black text-gray-900">{formatCurrencyWithSymbol(appointment.price || 0)}</p>
                        </div>
                    </div>

                    <div className="p-4 space-y-2">
                        {(appointment.payments || []).length > 0 ? (
                            appointment.payments!.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">{p.label}</span>
                                        <span className="text-[10px] text-gray-400 uppercase">{p.method} • {p.date.split('-').reverse().join('/')}</span>
                                    </div>
                                    <span className="font-bold text-gray-900">{formatCurrencyWithSymbol(p.amount)}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-4 text-gray-400 text-sm italic">No hay pagos registrados</p>
                        )}

                        <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-100 flex justify-between items-center px-2">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Abonado</span>
                            <span className="text-xl font-black text-[#34baab]">{formatCurrencyWithSymbol(totalPaid)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {appointment.notes && (
                    <div className="bg-violet-50/30 border border-violet-100 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 text-violet-400 mb-2">
                            <FileText className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Observaciones</span>
                        </div>
                        <p className="text-sm text-gray-700 italic leading-relaxed">
                            "{appointment.notes}"
                        </p>
                    </div>
                )}

            </div>
        </Modal>
    );
}
