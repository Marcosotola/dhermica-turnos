'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Appointment, DURATION_OPTIONS } from '@/lib/types/appointment';
import { Professional } from '@/lib/types/professional';
import { UserProfile } from '@/lib/types/user';
import { getUsersByRole } from '@/lib/firebase/users';
import { capitalizeName } from '@/lib/utils/time';
import { Search, UserPlus, User } from 'lucide-react';
import { validateAppointment, checkOverlap } from '@/lib/utils/validation';
import { createAppointment, updateAppointment } from '@/lib/firebase/appointments';
import { toast } from 'sonner';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment?: Appointment;
    professionals: Professional[];
    existingAppointments: Appointment[];
    defaultTime?: string;
    defaultProfessionalId?: string;
    date: string;
}

export function AppointmentModal({
    isOpen,
    onClose,
    appointment,
    professionals,
    existingAppointments,
    defaultTime,
    defaultProfessionalId,
    date,
}: AppointmentModalProps) {
    const [formData, setFormData] = useState({
        clientName: '',
        clientId: '',
        treatment: '',
        time: defaultTime || '',
        duration: 1,
        professionalId: defaultProfessionalId || '',
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<UserProfile[]>([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [clientMode, setClientMode] = useState<'registered' | 'manual'>('registered');
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        const fetchClients = async () => {
            setClientsLoading(true);
            try {
                const data = await getUsersByRole('client');
                setClients(data);
            } catch (error) {
                console.error('Error fetching clients:', error);
            } finally {
                setClientsLoading(false);
            }
        };

        if (isOpen) {
            fetchClients();
        }
    }, [isOpen]);


    useEffect(() => {
        if (appointment) {
            setFormData({
                clientName: appointment.clientName,
                clientId: appointment.clientId || '',
                treatment: appointment.treatment,
                time: appointment.time,
                duration: appointment.duration,
                professionalId: appointment.professionalId || '',
                notes: appointment.notes || '',
            });
            if (appointment.clientId) {
                setClientMode('registered');
            } else {
                setClientMode('manual');
            }
        } else {
            setFormData({
                clientName: '',
                clientId: '',
                treatment: '',
                time: defaultTime || '',
                duration: 1,
                professionalId: defaultProfessionalId || '',
                notes: '',
            });
            setClientMode('registered');
        }
        setErrors([]);
    }, [appointment, defaultTime, defaultProfessionalId, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors([]);

        const appointmentData = {
            ...formData,
            clientId: clientMode === 'registered' ? formData.clientId : undefined,
            clientName: capitalizeName(formData.clientName),
            date,
            professionalId: formData.professionalId || undefined,
        };

        // Validar datos
        const validationErrors = validateAppointment(appointmentData);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        // Verificar superposición con otros turnos
        const otherAppointments = existingAppointments.filter(
            (apt) =>
                apt.id !== appointment?.id &&
                apt.professionalId === appointmentData.professionalId
        );

        const hasOverlap = otherAppointments.some((apt) =>
            checkOverlap(appointmentData, apt)
        );

        if (hasOverlap) {
            setErrors(['Este horario se superpone con otro turno del mismo profesional']);
            return;
        }

        // Verificar si el cliente ya tiene turno en esta fecha
        if (!appointment) {
            const clientHasAppointment = existingAppointments.some(
                (apt) =>
                    apt.clientName.toLowerCase() === appointmentData.clientName.toLowerCase()
            );

            if (clientHasAppointment) {
                const confirmed = window.confirm(
                    `${appointmentData.clientName} ya tiene un turno en esta fecha. ¿Desea continuar?`
                );
                if (!confirmed) return;
            }
        }

        setLoading(true);

        try {
            if (appointment) {
                await updateAppointment(appointment.id, appointmentData);
                toast.success('Turno actualizado exitosamente');
            } else {
                await createAppointment(appointmentData as Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>);
                toast.success('Turno creado exitosamente');
            }
            onClose();
        } catch (error) {
            console.error('Error saving appointment:', error);
            toast.error('Error al guardar el turno');
            setErrors(['Error al guardar el turno. Por favor intente nuevamente.']);
        } finally {
            setLoading(false);
        }
    };

    const professionalOptions = [
        { value: '', label: 'General (sin profesional)' },
        ...professionals.map((p) => ({ value: p.id, label: p.name })),
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={appointment ? 'Editar Turno' : 'Nuevo Turno'}
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        {errors.map((error, index) => (
                            <p key={index} className="text-sm text-red-600">
                                • {error}
                            </p>
                        ))}
                    </div>
                )}

                <div className="bg-gray-50 p-1 rounded-xl flex mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            setClientMode('registered');
                            setFormData(prev => ({ ...prev, clientName: '', clientId: '' }));
                        }}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${clientMode === 'registered'
                                ? 'bg-white text-[#34baab] shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <User className="w-4 h-4" /> Cliente Registrado
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setClientMode('manual');
                            setFormData(prev => ({ ...prev, clientId: '' }));
                        }}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${clientMode === 'manual'
                                ? 'bg-white text-[#34baab] shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <UserPlus className="w-4 h-4" /> Nuevo / Manual
                    </button>
                </div>

                {clientMode === 'registered' ? (
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Buscar Cliente
                        </label>
                        <Select
                            value={formData.clientId}
                            onChange={(e) => {
                                const selectedId = e.target.value;
                                const selectedClient = clients.find(c => c.uid === selectedId);
                                if (selectedClient) {
                                    setFormData(prev => ({
                                        ...prev,
                                        clientId: selectedId,
                                        clientName: selectedClient.fullName
                                    }));
                                }
                            }}
                            options={[
                                { value: '', label: clientsLoading ? 'Cargando clientes...' : 'Selecciona un cliente...' },
                                ...clients.map(c => ({ value: c.uid, label: `${c.fullName} (${c.email})` }))
                            ]}
                            required={clientMode === 'registered'}
                        />
                    </div>
                ) : (
                    <Input
                        label="Nombre del Cliente"
                        value={formData.clientName}
                        onChange={(e) =>
                            setFormData({ ...formData, clientName: capitalizeName(e.target.value) })
                        }
                        placeholder="Ej: María González"
                        required
                    />
                )}


                <Input
                    label="Tratamiento"
                    value={formData.treatment}
                    onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                    placeholder="Ej: Limpieza facial"
                    required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Hora"
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        min="07:30"
                        max="19:30"
                        step="1800"
                        required
                    />

                    <Select
                        label="Duración"
                        value={formData.duration}
                        onChange={(e) =>
                            setFormData({ ...formData, duration: parseFloat(e.target.value) })
                        }
                        options={DURATION_OPTIONS}
                        required
                    />
                </div>

                <Select
                    label="Profesional"
                    value={formData.professionalId}
                    onChange={(e) => setFormData({ ...formData, professionalId: e.target.value })}
                    options={professionalOptions}
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notas (opcional)
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Notas adicionales..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? 'Guardando...' : appointment ? 'Actualizar' : 'Crear Turno'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
