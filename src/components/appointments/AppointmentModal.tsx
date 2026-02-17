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
        price: 0,
    });
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<UserProfile[]>([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [clientMode, setClientMode] = useState<'registered' | 'manual'>('registered');
    const [errors, setErrors] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredClients, setFilteredClients] = useState<UserProfile[]>([]);

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

    // Filter clients based on search query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredClients([]);
            return;
        }
        const query = searchQuery.toLowerCase();
        const filtered = clients.filter(client =>
            client.fullName.toLowerCase().includes(query) ||
            client.email.toLowerCase().includes(query)
        );
        setFilteredClients(filtered);
    }, [searchQuery, clients]);


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
                price: appointment.price || 0,
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
                professionalId: defaultProfessionalId || (professionals.length > 0 ? professionals[0].id : ''),
                notes: '',
                price: 0,
            });
            setClientMode('registered');
        }
        setErrors([]);
        setSearchQuery('');
        setShowSuggestions(false);
    }, [appointment, defaultTime, defaultProfessionalId, isOpen]);

    const handleClientSearch = (value: string) => {
        setSearchQuery(value);
        setShowSuggestions(true);
    };

    const selectClient = (client: UserProfile) => {
        setFormData(prev => ({
            ...prev,
            clientId: client.uid,
            clientName: client.fullName
        }));
        setSearchQuery(client.fullName);
        setShowSuggestions(false);
    };

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
        // Solo verificar si ambos turnos tienen el mismo professionalId válido (no vacío/undefined)
        const otherAppointments = existingAppointments.filter(
            (apt) =>
                apt.id !== appointment?.id &&
                appointmentData.professionalId && // Tiene professionalId
                appointmentData.professionalId !== '' && // No es string vacío
                apt.professionalId === appointmentData.professionalId // Y coincide con otro turno
        );

        const overlappingAppointments = otherAppointments.filter((apt) =>
            checkOverlap(appointmentData, apt)
        );

        if (overlappingAppointments.length > 0) {
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
            // Filtrar campos undefined para Firebase
            const cleanData = Object.fromEntries(
                Object.entries(appointmentData).filter(([_, v]) => v !== undefined)
            );

            if (appointment) {
                // Round price to 2 decimal places to avoid floating point issues
                if (cleanData.price !== undefined) {
                    cleanData.price = Math.round(Number(cleanData.price) * 100) / 100;
                }
                await updateAppointment(appointment.id, cleanData);
                toast.success('Turno actualizado exitosamente');
            } else {
                const finalData = { ...cleanData };
                if (finalData.price !== undefined) {
                    finalData.price = Math.round(Number(finalData.price) * 100) / 100;
                }
                await createAppointment(finalData as Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>);
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

    const professionalOptions = professionals.map((p) => ({ value: p.id, label: p.name }));

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
                            setSearchQuery('');
                            setShowSuggestions(false);
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
                    <div className="space-y-1 relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Buscar Cliente
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleClientSearch(e.target.value)}
                                onFocus={() => setShowSuggestions(true)}
                                placeholder={clientsLoading ? 'Cargando clientes...' : 'Buscar por nombre o email...'}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34baab] focus:border-transparent"
                                required={clientMode === 'registered'}
                                disabled={clientsLoading}
                            />
                            {formData.clientId && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                            )}
                        </div>

                        {/* Suggestions Dropdown */}
                        {showSuggestions && searchQuery && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredClients.length > 0 ? (
                                    <>
                                        {filteredClients.slice(0, 10).map((client) => (
                                            <button
                                                key={client.uid}
                                                type="button"
                                                onClick={() => selectClient(client)}
                                                className={`w-full text-left px-4 py-3 hover:bg-[#34baab]/10 transition-colors border-b border-gray-100 last:border-b-0 ${formData.clientId === client.uid ? 'bg-[#34baab]/5' : ''
                                                    }`}
                                            >
                                                <div className="font-medium text-gray-900">{client.fullName}</div>
                                                <div className="text-sm text-gray-500">{client.email}</div>
                                            </button>
                                        ))}
                                        {filteredClients.length > 10 && (
                                            <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 text-center">
                                                +{filteredClients.length - 10} más resultados. Refina tu búsqueda.
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="px-4 py-8 text-center text-gray-500">
                                        <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm">No se encontraron clientes</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Client Health Info Alert */}
                        {clientMode === 'registered' && formData.clientId && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl space-y-1 animate-in fade-in duration-300">
                                <div className="flex items-center gap-2 text-red-600">
                                    <User className="w-4 h-4" />
                                    <span className="text-xs font-black uppercase tracking-wider">Perfil de Salud</span>
                                </div>
                                {(() => {
                                    const selectedClient = clients.find(c => c.uid === formData.clientId);
                                    if (!selectedClient) return null;
                                    return (
                                        <div className="text-[11px] text-gray-600">
                                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                {selectedClient.hasTattoos && <span className="text-orange-600 font-bold">• TIENE TATUAJES</span>}
                                                {selectedClient.isPregnant && <span className="text-pink-600 font-bold">• EMBARAZADA</span>}
                                                {selectedClient.relevantMedicalInfo && (
                                                    <p className="w-full italic mt-1 line-clamp-2">" {selectedClient.relevantMedicalInfo} "</p>
                                                )}
                                                {!selectedClient.hasTattoos && !selectedClient.isPregnant && !selectedClient.relevantMedicalInfo && (
                                                    <span className="text-gray-400">Sin observaciones especiales registradas.</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
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

                <Input
                    label="Precio (opcional)"
                    type="number"
                    value={formData.price === 0 ? '' : formData.price}
                    onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, price: val === '' ? 0 : parseFloat(val) });
                    }}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
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
