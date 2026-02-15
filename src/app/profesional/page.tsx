'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAppointmentsByProfessional } from '@/lib/firebase/appointments';
import { Appointment } from '@/lib/types/appointment';
import { Calendar, TrendingUp, Sparkles, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { toast, Toaster } from 'sonner';
import { updateAppointment } from '@/lib/firebase/appointments';

export default function ProfesionalPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState(''); // Mostrar todos por defecto para evitar confusiones
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
                // Primero obtener el documento de profesional asociado a este usuario
                const { getProfessionalByUserId } = await import('@/lib/firebase/professionals');
                const { getAppointmentsByProfessionalId } = await import('@/lib/firebase/appointments');
                const professionalDoc = await getProfessionalByUserId(user.uid);

                console.log('[DEBUG] User UID:', user.uid);
                console.log('[DEBUG] Professional Doc:', professionalDoc);

                if (professionalDoc) {
                    // Usar getAppointmentsByProfessionalId que también busca en legacy
                    const data = await getAppointmentsByProfessionalId(professionalDoc.id);
                    console.log('[DEBUG] Appointments data length:', data.length);
                    setAppointments(data);
                    setFilteredAppointments(data);
                } else {
                    console.warn('No professional document found for user:', user.uid);
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

        // Filtrar por fecha
        if (selectedDate) {
            filtered = filtered.filter(apt => apt.date === selectedDate);
        }

        // Filtrar por búsqueda
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
            await updateAppointment(id, editData);
            setAppointments(appointments.map(apt =>
                apt.id === id ? { ...apt, ...editData } : apt
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
        <div className="min-h-screen bg-gray-50 pb-20">
            <Toaster position="top-center" />

            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold mb-2">Panel Profesional</h1>
                    <p className="text-violet-100">Bienvenido, {profile?.fullName}</p>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {/* Mis Turnos */}
                    <button
                        onClick={() => {
                            const element = document.getElementById('list-section');
                            element?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <Calendar className="w-10 h-10 text-violet-600 group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Mis Turnos</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Ver tus citas asignadas</p>
                    </button>

                    {/* Agenda */}
                    <button
                        onClick={() => router.push('/turnos')}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <BookOpen className="w-10 h-10 text-teal-600 group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Agenda</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Consultar calendario general</p>
                    </button>

                    {/* Tratamientos */}
                    <button
                        onClick={() => router.push('/tratamientos')}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <Sparkles className="w-10 h-10 text-purple-600 group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Servicios</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Lista de precios y servicios</p>
                    </button>

                    {/* Promociones */}
                    <button
                        onClick={() => router.push('/promociones')}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <TrendingUp className="w-10 h-10 text-pink-600 group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Promos</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Ofertas y beneficios activos</p>
                    </button>
                </div>
            </div>

            {/* List Section */}
            <div id="list-section" className="max-w-7xl mx-auto px-4 py-6 space-y-4 border-t border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Gestión de Turnos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        placeholder="Buscar por cliente o tratamiento..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>

                <p className="text-sm text-gray-600">
                    {filteredAppointments.length} turno{filteredAppointments.length !== 1 ? 's' : ''} encontrado{filteredAppointments.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Appointments List */}
            <div className="max-w-7xl mx-auto px-4 pb-6">
                {filteredAppointments.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No hay turnos para mostrar</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredAppointments.map((appointment) => (
                            <div key={appointment.id} className="bg-white rounded-lg shadow p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900">
                                            {appointment.clientName}
                                        </h3>
                                        <p className="text-sm text-gray-600">{appointment.treatment}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-violet-600">{appointment.time}</p>
                                        <p className="text-sm text-gray-500">
                                            {appointment.duration}h
                                        </p>
                                    </div>
                                </div>

                                {editingId === appointment.id ? (
                                    <div className="space-y-3 border-t pt-3">
                                        <Input
                                            label="Precio"
                                            type="number"
                                            value={editData.price}
                                            onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })}
                                            min="0"
                                            step="0.01"
                                        />
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Observaciones
                                            </label>
                                            <textarea
                                                value={editData.notes}
                                                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                                rows={3}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                                                placeholder="Observaciones..."
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSave(appointment.id)}
                                                className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
                                            >
                                                Guardar
                                            </button>
                                            <button
                                                onClick={handleCancel}
                                                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-t pt-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-gray-600">Precio:</span>
                                            <span className="font-medium">
                                                ${appointment.price?.toFixed(2) || '0.00'}
                                            </span>
                                        </div>
                                        {appointment.notes && (
                                            <div className="mb-3">
                                                <span className="text-sm text-gray-600">Observaciones:</span>
                                                <p className="text-sm text-gray-800 mt-1">{appointment.notes}</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleEdit(appointment)}
                                            className="w-full bg-violet-100 text-violet-700 px-4 py-2 rounded-lg hover:bg-violet-200 transition-colors text-sm font-medium"
                                        >
                                            Editar
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
