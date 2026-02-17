'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Appointment } from '@/lib/types/appointment';
import { Calendar, Search, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { toast, Toaster } from 'sonner';
import { updateAppointment } from '@/lib/firebase/appointments';
import { Button } from '@/components/ui/Button';

export default function ProfesionalTurnosPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState({ notes: '', price: 0 });

    useEffect(() => {
        if (!authLoading && (!user || profile?.role !== 'professional')) {
            router.push('/dashboard');
        }
    }, [user, profile, authLoading, router]);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!user) return;

            setLoading(true);
            try {
                const { getProfessionalByUserId } = await import('@/lib/firebase/professionals');
                const { getAppointmentsByProfessionalId } = await import('@/lib/firebase/appointments');
                const professionalDoc = await getProfessionalByUserId(user.uid);

                if (professionalDoc) {
                    const data = await getAppointmentsByProfessionalId(professionalDoc.id);
                    setAppointments(data);
                    setFilteredAppointments(data);
                } else {
                    setAppointments([]);
                    setFilteredAppointments([]);
                }
            } catch (error) {
                console.error('Error fetching appointments:', error);
                toast.error('Error al cargar los turnos');
            } finally {
                setLoading(false);
            }
        };

        if (user && profile?.role === 'professional') {
            fetchAppointments();
        }
    }, [user, profile]);

    useEffect(() => {
        let filtered = appointments;

        if (selectedDate) {
            filtered = filtered.filter(apt => apt.date === selectedDate);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(apt =>
                apt.clientName.toLowerCase().includes(query) ||
                apt.treatment.toLowerCase().includes(query)
            );
        }

        setFilteredAppointments(filtered);
    }, [appointments, selectedDate, searchQuery]);

    const handleEdit = (appointment: Appointment) => {
        setEditingId(appointment.id);
        setEditData({
            notes: appointment.notes || '',
            price: appointment.price || 0
        });
    };

    const handleSave = async (id: string) => {
        try {
            const finalData = {
                ...editData,
                price: Math.round(Number(editData.price) * 100) / 100
            };
            await updateAppointment(id, finalData);
            setAppointments(appointments.map(apt =>
                apt.id === id ? { ...apt, ...finalData } : apt
            ));
            setEditingId(null);
            toast.success('Turno actualizado');
        } catch (error) {
            console.error('Error updating appointment:', error);
            toast.error('Error al actualizar el turno');
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditData({ notes: '', price: 0 });
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!user || profile?.role !== 'professional') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />

            <div className="bg-[#484450] text-white">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Mis Turnos</h1>
                            <p className="text-gray-300 font-medium opacity-80">Gestión de citas y pacientes.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar paciente o servicio..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>

                    <p className="text-sm text-gray-500 mt-4 px-2">
                        {filteredAppointments.length} turno{filteredAppointments.length !== 1 ? 's' : ''} encontrado{filteredAppointments.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {filteredAppointments.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium">No hay turnos para mostrar</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredAppointments.map((appointment) => (
                            <div key={appointment.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-black text-xl text-gray-900 mb-1">
                                            {appointment.clientName}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-black uppercase tracking-widest">
                                                {appointment.treatment}
                                            </span>
                                            <span className="text-sm text-gray-400 font-medium">
                                                {appointment.date.split('-').reverse().join('/')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-violet-600 leading-none mb-1">{appointment.time}</p>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                                            {appointment.duration} min
                                        </p>
                                    </div>
                                </div>

                                {editingId === appointment.id ? (
                                    <div className="space-y-4 border-t border-gray-100 pt-6 animate-in slide-in-from-top-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                                label="Precio del Servicio ($)"
                                                type="number"
                                                value={editData.price === 0 ? '' : editData.price}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setEditData({ ...editData, price: val === '' ? 0 : parseFloat(val) });
                                                }}
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                            />
                                            <div>
                                                <label className="block text-sm font-bold text-gray-900 mb-2 ml-1">
                                                    Observaciones internas
                                                </label>
                                                <textarea
                                                    value={editData.notes}
                                                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                                    rows={3}
                                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none resize-none transition-all text-gray-900 font-medium"
                                                    placeholder="Notas sobre el tratamiento, alergias detectadas, etc..."
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button
                                                onClick={() => handleSave(appointment.id)}
                                                className="flex-1 bg-violet-600 hover:bg-violet-700 rounded-2xl py-4 shadow-lg shadow-violet-200"
                                            >
                                                Guardar Cambios
                                            </Button>
                                            <Button
                                                onClick={handleCancel}
                                                variant="ghost"
                                                className="flex-1 rounded-2xl py-4"
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-t border-gray-100 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">Precio</span>
                                                <span className="font-bold text-gray-900">
                                                    ${appointment.price?.toFixed(2) || '0.00'}
                                                </span>
                                            </div>
                                            {appointment.notes && (
                                                <div className="flex flex-col max-w-md">
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">Notas</span>
                                                    <p className="text-sm text-gray-800 font-bold italic line-clamp-1">{appointment.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleEdit(appointment)}
                                            className="bg-gray-50 text-gray-600 px-6 py-3 rounded-2xl hover:bg-violet-50 hover:text-violet-600 transition-all font-bold text-sm"
                                        >
                                            Editar Turno
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
