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
import { toast } from 'sonner';
import { deleteAppointment } from '@/lib/firebase/appointments';
import { useRouter } from 'next/navigation';

interface ProfessionalAppointmentsProps {
    professional: Professional;
}

export function ProfessionalAppointments({ professional }: ProfessionalAppointmentsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

    // Modal state
    const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

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

    useEffect(() => {
        loadAppointments();
    }, [professional.id]);

    const handleEdit = (apt: Appointment) => {
        // Redirigir a la agenda con el cliente seleccionado para editar
        // O simplemente avisar que debe hacerlo desde la agenda principal
        toast.info('Redirigiendo a Agenda para editar...');
        router.push(`/agenda?search=${encodeURIComponent(apt.clientName)}`);
    };

    const handleDelete = async (apt: Appointment) => {
        if (window.confirm('¿Estás seguro de eliminar este turno definitivamente?')) {
            try {
                await deleteAppointment(apt.id);
                toast.success('Turno eliminado');
                loadAppointments();
            } catch (error) {
                console.error('Error deleting appointment:', error);
                toast.error('Error al eliminar el turno');
            }
        }
    };

    const filteredAppointments = appointments.filter(apt => {
        const matchesSearch = apt.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            apt.treatment.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
        return matchesSearch && matchesStatus;
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
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                        placeholder="Buscar por cliente o tratamiento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-12 bg-gray-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-[#34baab]/20"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
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

                                <div className="flex items-center gap-8 text-right flex-shrink-0">
                                    <div className="hidden sm:block">
                                        <div className="flex items-center justify-end gap-1.5 text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            <span className="text-[10px] font-black">{apt.time} hs</span>
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5 text-[#34baab] mt-1">
                                            <DollarSign className="w-3 h-3" />
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
                onDelete={handleDelete}
            />
        </div>
    );
}
