'use client';

import { useState, useEffect } from 'react';
import { getAppointmentsByProfessionalId } from '@/lib/firebase/appointments';
import { Appointment } from '@/lib/types/appointment';
import { Professional } from '@/lib/types/professional';
import {
    Calendar,
    Search,
    Filter,
    Loader2,
    ChevronRight,
    User,
    Clock,
    DollarSign
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { formatArgentineCurrency } from '@/lib/utils/time';
import { AppointmentDetailModal } from '../appointments/AppointmentDetailModal';
import { DeleteAppointmentDialog } from '../appointments/DeleteAppointmentDialog';
import { toast } from 'sonner';
import { deleteAppointment, updateAppointment } from '@/lib/firebase/appointments';
import { useRouter } from 'next/navigation';
import { QuickPaymentModal } from '../appointments/QuickPaymentModal';

interface ProfessionalAppointmentsProps {
    professional: Professional;
}

export function ProfessionalAppointments({ professional }: ProfessionalAppointmentsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [customRange, setCustomRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Modal state
    const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isQuickPaymentOpen, setIsQuickPaymentOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadAppointments = async () => {
        setLoading(true);
        try {
            const data = await getAppointmentsByProfessionalId(professional.id);
            setAppointments(data);
        } catch (error) {
            console.error('Error loading professional appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const navigateDate = (direction: number) => {
        if (dateFilter === 'custom' || dateFilter === 'all') return;
        const d = new Date(currentDate);
        if (dateFilter === 'today') d.setDate(d.getDate() + direction);
        else if (dateFilter === 'week') d.setDate(d.getDate() + (direction * 7));
        else d.setMonth(d.getMonth() + direction);
        setCurrentDate(d);
    };

    useEffect(() => {
        loadAppointments();
    }, [professional.id]);

    const handleEdit = (apt: Appointment) => {
        // Redirigir a la agenda con el cliente seleccionado para editar
        // O simplemente avisar que debe hacerlo desde la agenda principal
        toast.info('Redirigiendo a Agenda para editar...');
        router.push(`/agenda?search=${encodeURIComponent(apt.clientName)}`);
    };

    const handleDelete = (apt: Appointment) => {
        setSelectedApt(apt);
        setIsDetailOpen(false);
        setIsDeleteOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedApt) return;
        setIsDeleting(true);
        try {
            await deleteAppointment(selectedApt.id);
            toast.success('Turno eliminado permanentemente');
            setIsDeleteOpen(false);
            loadAppointments();
        } catch (error) {
            console.error('Error deleting appointment:', error);
            toast.error('Error al eliminar el turno');
        } finally {
            setIsDeleting(false);
        }
    };
    const handleQuickPayment = (apt: Appointment) => {
        setSelectedApt(apt);
        setIsDetailOpen(false);
        setIsQuickPaymentOpen(true);
    };

    const filteredAppointments = appointments.filter(apt => {
        const matchesSearch = apt.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            apt.treatment.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;

        // Date filter logic
        let matchesDate = true;
        if (dateFilter !== 'all') {
            if (dateFilter === 'custom') {
                matchesDate = apt.date >= customRange.start && apt.date <= customRange.end;
            } else {
                const d = new Date(currentDate);
                if (dateFilter === 'today') {
                    const todayStr = d.toISOString().split('T')[0];
                    matchesDate = apt.date === todayStr;
                } else if (dateFilter === 'week') {
                    const first = new Date(d);
                    first.setDate(d.getDate() - d.getDay());
                    const last = new Date(first);
                    last.setDate(first.getDate() + 6);
                    const firstStr = first.toISOString().split('T')[0];
                    const lastStr = last.toISOString().split('T')[0];
                    matchesDate = apt.date >= firstStr && apt.date <= lastStr;
                } else if (dateFilter === 'month') {
                    const first = new Date(d.getFullYear(), d.getMonth(), 1);
                    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    const firstStr = first.toISOString().split('T')[0];
                    const lastStr = last.toISOString().split('T')[0];
                    matchesDate = apt.date >= firstStr && apt.date <= lastStr;
                }
            }
        }

        return matchesSearch && matchesStatus && matchesDate;
    });

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 text-[#34baab] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 md:items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                        placeholder="Buscar por cliente o tratamiento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-12 bg-gray-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-[#34baab]/20"
                    />
                </div>
                <div className="flex gap-2 w-full min-w-0 md:w-auto overflow-x-auto pb-1 md:pb-0">
                    {(['all', 'pending', 'completed', 'cancelled'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${statusFilter === status
                                ? 'bg-[#484450] text-white border-[#484450] shadow-md'
                                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                                }`}
                        >
                            {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendientes' : status === 'completed' ? 'Realizados' : 'Cancelados'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Date Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm -mt-2">
                <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 w-full min-w-0">
                    {(['all', 'today', 'week', 'month', 'custom'] as const).map(filter => (
                        <button
                            key={filter}
                            onClick={() => setDateFilter(filter)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${dateFilter === filter
                                ? 'bg-[#34baab] text-white border-[#34baab] shadow-sm'
                                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                                }`}
                        >
                            {filter === 'all' ? 'Historial Completo' :
                                filter === 'today' ? 'Hoy' :
                                    filter === 'week' ? 'Semana' :
                                        filter === 'month' ? 'Mes' : 'Rango'}
                        </button>
                    ))}
                </div>

                {/* Navigator or Custom Range */}
                {dateFilter !== 'all' && (
                    <div className="flex items-center gap-3">
                        {dateFilter !== 'custom' ? (
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                <button onClick={() => navigateDate(-1)} className="p-1 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-[#34baab]">
                                    <Calendar className="w-4 h-4" />
                                </button>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 min-w-[100px] text-center">
                                    {dateFilter === 'month'
                                        ? currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                                        : currentDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                </span>
                                <button onClick={() => navigateDate(1)} className="p-1 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-[#34baab]">
                                    <Calendar className="w-4 h-4 rotate-180" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={customRange.start}
                                    onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                                    className="bg-gray-50 border border-gray-100 rounded-xl px-2 py-1.5 text-[10px] font-bold text-gray-600 focus:outline-none"
                                />
                                <span className="text-gray-300">/</span>
                                <input
                                    type="date"
                                    value={customRange.end}
                                    onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                                    className="bg-gray-50 border border-gray-100 rounded-xl px-2 py-1.5 text-[10px] font-bold text-gray-600 focus:outline-none"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="space-y-3">
                {filteredAppointments.length > 0 ? (
                    filteredAppointments.map(apt => {
                        const [year, month, day] = apt.date.split('-');
                        return (
                            <div
                                key={apt.id}
                                onClick={() => {
                                    setSelectedApt(apt);
                                    setIsDetailOpen(true);
                                }}
                                className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm hover:shadow-md transition-all group flex items-center justify-between gap-4 cursor-pointer active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 bg-[#484450]/5 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 text-[#484450]">
                                        <span className="text-[10px] font-black leading-none">{day}</span>
                                        <span className="text-[8px] font-bold uppercase opacity-50">{month}/{year.slice(2)}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-gray-900 truncate flex items-center gap-2">
                                            {apt.clientName}
                                            <span className={`w-2 h-2 rounded-full ${apt.status === 'completed' ? 'bg-green-500' :
                                                apt.status === 'cancelled' ? 'bg-red-500' : 'bg-amber-500'
                                                }`} />
                                        </h4>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wide truncate">{apt.treatment}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 sm:gap-8 text-right flex-shrink-0">
                                    <div className="flex flex-col justify-center">
                                        <div className="flex items-center justify-end gap-1.5 text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            <span className="text-[10px] font-black">{apt.time} hs</span>
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5 text-[#34baab] mt-1">
                                            <DollarSign className="w-3" style={{ height: '12px' }} />
                                            <span className="text-xs font-black">{formatArgentineCurrency(apt.price || 0)}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#484450] group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="bg-white p-20 rounded-[40px] border border-dashed border-gray-100 text-center">
                        <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No se encontraron turnos</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <AppointmentDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                appointment={selectedApt}
                professionals={[professional]}
                onEdit={handleEdit}
                onCancel={handleDelete}
                onDelete={handleDelete}
                onQuickPayment={handleQuickPayment}
            />

            <QuickPaymentModal
                isOpen={isQuickPaymentOpen}
                onClose={() => setIsQuickPaymentOpen(false)}
                appointment={selectedApt}
                onSuccess={loadAppointments}
            />

            <DeleteAppointmentDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                appointment={selectedApt}
                loading={isDeleting}
            />
        </div>
    );
}
