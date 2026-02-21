'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getClientsPaginated, searchClients } from '@/lib/firebase/users';
import { UserProfile } from '@/lib/types/user';
import { Toaster } from 'sonner';
import { BookOpen, Search, User as UserIcon, Mail, Phone, Calendar, Heart, AlertCircle, Info, CalendarCheck, ChevronDown, Loader2, ArrowLeft } from 'lucide-react';
import { Appointment } from '@/lib/types/appointment';
import { getAppointmentsByClientId } from '@/lib/firebase/appointments';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { getActiveProfessionals } from '@/lib/firebase/professionals';
import { Professional } from '@/lib/types/professional';
import { CreateClientModal } from '@/components/dashboard/CreateClientModal';
import { searchAppointmentsByClient } from '@/lib/firebase/appointments';
import { ChevronUp, DollarSign, UserPlus, History } from 'lucide-react';

export default function AgendaPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Pagination state
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
        if (!authLoading && profile?.role !== 'admin' && profile?.role !== 'professional' && profile?.role !== 'secretary') {
            router.push('/dashboard');
        }
    }, [user, profile, authLoading, router]);

    useEffect(() => {
        const fetchProfessionals = async () => {
            try {
                const data = await getActiveProfessionals();
                setProfessionals(data);
            } catch (error) {
                console.error('Error fetching professionals:', error);
            }
        };
        fetchProfessionals();
    }, []);

    const loadInitialUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { users: newUsers, lastDoc: newLastDoc } = await getClientsPaginated(null);
            setUsers(newUsers);
            setLastDoc(newLastDoc);
            setHasMore(newUsers.length === 20); // Assuming page size is 20
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMoreUsers = async () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        try {
            const { users: newUsers, lastDoc: newLastDoc } = await getClientsPaginated(lastDoc);
            setUsers(prev => [...prev, ...newUsers]);
            setLastDoc(newLastDoc);
            setHasMore(newUsers.length === 20);
        } catch (error) {
            console.error('Error loading more users:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        setLoading(true);
        try {
            if (term.trim() === '') {
                // Reset to pagination mode
                loadInitialUsers();
            } else {
                // Perform search in both users and appointments
                const [registeredUsers, appointmentsResults] = await Promise.all([
                    searchClients(term),
                    searchAppointmentsByClient(term)
                ]);

                // Create a map to find registered users by name (normalized)
                const registeredNames = new Set(registeredUsers.map(u =>
                    u.fullName.toLowerCase().replace(/\s+/g, ' ')
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                ));

                // Extract unique client names from appointments that are not in registered results
                const virtualProfiles: UserProfile[] = [];
                const seenNamesNormalized = new Set(); // Use normalized name for absolute uniqueness

                appointmentsResults.forEach(apt => {
                    const trimmedName = apt.clientName.trim();
                    if (!trimmedName) return;

                    // Normalize name for comparison (remove accents and extra spaces)
                    const normalizedName = trimmedName.toLowerCase().replace(/\s+/g, ' ')
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                    if (!registeredNames.has(normalizedName) && !seenNamesNormalized.has(normalizedName)) {
                        seenNamesNormalized.add(normalizedName);
                        // Create a virtual profile structure
                        const vUid = `legacy-${trimmedName.replace(/\s+/g, '-').toLowerCase()}`;
                        virtualProfiles.push({
                            uid: vUid,
                            fullName: trimmedName,
                            email: 'Sin correo electrónico',
                            phone: 'Sin teléfono',
                            role: 'client',
                            birthDate: 'No registrada',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            sex: 'female',
                            hasTattoos: false,
                            isPregnant: false,
                            notificationsEnabled: false,
                        } as UserProfile);
                    }
                });

                setUsers([...registeredUsers, ...virtualProfiles]);
                setHasMore(false); // Disable pagination during search
            }
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (profile?.role === 'admin' || profile?.role === 'professional' || profile?.role === 'secretary') {
            loadInitialUsers();
        }
    }, [profile, loadInitialUsers]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!selectedUser) return;

            setHistoryLoading(true);
            try {
                const data = await getAppointmentsByClientId(selectedUser.uid, selectedUser.fullName);
                setAppointments(data);
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchHistory();
    }, [selectedUser]);

    if (authLoading || (loading && users.length === 0)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34baab]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />
            <div className="container mx-auto px-4 py-8">
                <div className="bg-[#484450] rounded-3xl p-8 mb-8 shadow-lg text-white">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-lg">
                            <BookOpen className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Fichas de Clientes</h1>
                            <p className="text-gray-300 font-medium">Consulta fichas y datos relevantes.</p>
                        </div>

                        <div className="ml-auto">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-[#34baab] hover:bg-[#2da698] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[#34baab]/20 transition-all active:scale-95 group"
                            >
                                <UserPlus className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                <span className="hidden md:inline">Nuevo Cliente</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* List Column */}
                    <div className={`lg:col-span-1 space-y-4 ${selectedUser ? 'hidden lg:block' : 'block'}`}>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                className="w-full pl-12 pr-4 py-3 bg-white shadow-sm border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#34baab] outline-none"
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[600px]">
                            <div className="divide-y divide-gray-50 overflow-y-auto flex-1">
                                {users.map((user) => (
                                    <button
                                        key={user.uid}
                                        onClick={() => setSelectedUser(user)}
                                        className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${selectedUser?.uid === user.uid ? 'bg-gray-50 border-r-4 border-[#34baab]' : ''}`}
                                    >
                                        <div className={`w-10 h-10 ${user.uid.startsWith('legacy-') ? 'bg-amber-100' : 'bg-[#484450]/10'} rounded-xl flex items-center justify-center shrink-0`}>
                                            {user.uid.startsWith('legacy-') ? (
                                                <History className="w-6 h-6 text-amber-600" />
                                            ) : (
                                                <UserIcon className="w-6 h-6 text-[#484450]" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{user.fullName}</p>
                                            <p className="text-xs text-gray-400 truncate">
                                                {user.uid.startsWith('legacy-') ? 'Cita Manual / Anterior' : user.email}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                                {users.length === 0 && !loading && (
                                    <div className="p-8 text-center text-gray-400">
                                        No se encontraron clientes.
                                    </div>
                                )}
                            </div>

                            {hasMore && searchTerm === '' && (
                                <div className="p-4 border-t border-gray-50 bg-gray-50/50">
                                    <Button
                                        onClick={loadMoreUsers}
                                        className="w-full bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                                        disabled={loadingMore}
                                    >
                                        {loadingMore ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando...
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="w-4 h-4 mr-2" /> Cargar más clientes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Column */}
                    <div className={`lg:col-span-2 ${selectedUser ? 'block' : 'hidden lg:block'}`}>
                        {selectedUser ? (
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6 animate-in slide-in-from-right-4 duration-300">
                                {/* Back Button Mobile */}
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="lg:hidden flex items-center gap-2 text-[#34baab] font-bold mb-4 active:scale-95 transition-transform"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                    <span>Volver a la lista</span>
                                </button>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 bg-[#484450] rounded-2xl flex items-center justify-center shadow-lg">
                                            <UserIcon className="w-12 h-12 text-[#34baab]" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900">{selectedUser.fullName}</h2>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] uppercase font-black tracking-widest">
                                                    {selectedUser.uid.startsWith('legacy-') ? 'LEGACY' : `ID: ${selectedUser.uid.substring(0, 8)}...`}
                                                </span>
                                                <span className={`px-2 py-1 ${selectedUser.uid.startsWith('legacy-') ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'} rounded-lg text-[10px] uppercase font-black tracking-widest`}>
                                                    {selectedUser.uid.startsWith('legacy-') ? 'Historial Manual' : 'Cliente Registrado'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <div className="flex items-center justify-end gap-2 text-gray-600 font-bold">
                                            <Phone className="w-4 h-4 text-[#34baab]" /> {selectedUser.phone}
                                        </div>
                                        <div className="text-sm text-gray-400 lowercase">{selectedUser.email}</div>
                                    </div>
                                </div>

                                {selectedUser.uid.startsWith('legacy-') ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-center">
                                        <History className="w-10 h-10 text-amber-600 mx-auto mb-3" />
                                        <h3 className="text-lg font-bold text-amber-900 mb-1">Perfil sin registrar</h3>
                                        <p className="text-amber-700 text-sm max-w-md mx-auto">
                                            Este cliente proviene del historial de turnos manuales o de la versión anterior.
                                            No tiene una ficha de salud completa porque aún no se ha registrado en la aplicación.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="border border-gray-100 rounded-3xl overflow-hidden">
                                        <button
                                            onClick={() => setIsInfoOpen(!isInfoOpen)}
                                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Info className="w-5 h-5 text-[#34baab]" />
                                                <span className="font-bold text-gray-900">Información Personal</span>
                                            </div>
                                            {isInfoOpen ? (
                                                <ChevronUp className="w-5 h-5 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-gray-400" />
                                            )}
                                        </button>

                                        {isInfoOpen && (
                                            <div className="p-6 space-y-8 animate-in slide-in-from-top-2 duration-200">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-4">
                                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
                                                            <CalendarCheck className="w-4 h-4 text-[#34baab]" /> Información Básica
                                                        </h3>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="bg-gray-50 p-4 rounded-2xl">
                                                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">F. Nacimiento</p>
                                                                <p className="font-bold text-gray-900">
                                                                    {(() => {
                                                                        const parts = selectedUser.birthDate.split('-');
                                                                        if (parts.length === 3) {
                                                                            const [year, month, day] = parts;
                                                                            return `${day}/${month}/${year}`;
                                                                        }
                                                                        return selectedUser.birthDate;
                                                                    })()}
                                                                </p>
                                                            </div>
                                                            <div className="bg-gray-50 p-4 rounded-2xl">
                                                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Desde</p>
                                                                <p className="font-bold text-gray-900">
                                                                    {(() => {
                                                                        const d = new Date(selectedUser.createdAt);
                                                                        const day = d.getDate().toString().padStart(2, '0');
                                                                        const month = (d.getMonth() + 1).toString().padStart(2, '0');
                                                                        const year = d.getFullYear();
                                                                        return `${day}/${month}/${year}`;
                                                                    })()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
                                                            <Heart className="w-4 h-4 text-pink-500" /> Salud & Advertencias
                                                        </h3>
                                                        <div className="flex gap-4">
                                                            <div className="flex-1 p-4 rounded-2xl bg-gray-50">
                                                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Sexo</p>
                                                                <p className="font-bold text-gray-900">{selectedUser.sex === 'male' ? 'Masculino' : 'Femenino'}</p>
                                                            </div>
                                                            <div className={`flex-1 p-4 rounded-2xl ${selectedUser.hasTattoos ? 'bg-orange-50' : 'bg-gray-50'}`}>
                                                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Tatuajes</p>
                                                                <p className={`font-black ${selectedUser.hasTattoos ? 'text-orange-600' : 'text-gray-900'}`}>{selectedUser.hasTattoos ? 'SÍ' : 'NO'}</p>
                                                            </div>
                                                            {selectedUser.sex === 'female' && (
                                                                <div className={`flex-1 p-4 rounded-2xl ${selectedUser.isPregnant ? 'bg-pink-50' : 'bg-gray-50'}`}>
                                                                    <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Embarazo</p>
                                                                    <p className={`font-black ${selectedUser.isPregnant ? 'text-pink-600' : 'text-gray-900'}`}>{selectedUser.isPregnant ? 'SÍ' : 'NO'}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
                                                        <AlertCircle className="w-4 h-4 text-red-500" /> Información Relevante
                                                    </h3>
                                                    <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100">
                                                        <p className="text-gray-700 italic">
                                                            {selectedUser.relevantMedicalInfo || 'No hay información médica relevante registrada.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="pt-6 border-t border-gray-100">
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-[#34baab]" /> Historial de Turnos
                                    </h3>

                                    {historyLoading ? (
                                        <div className="flex justify-center p-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34baab]"></div>
                                        </div>
                                    ) : appointments.length > 0 ? (
                                        <div className="space-y-3">
                                            {appointments.map((apt) => (
                                                <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                            <CalendarCheck className="w-5 h-5 text-[#34baab]" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 text-sm">{apt.treatment}</h4>
                                                            <p className="text-xs text-gray-500">
                                                                {(() => {
                                                                    const [year, month, day] = apt.date.split('-');
                                                                    return `${day}/${month}/${year}`;
                                                                })()} - {apt.time}
                                                            </p>
                                                            {apt.professionalId && (
                                                                <p className="text-[10px] text-violet-600 font-bold uppercase mt-1">
                                                                    Prof: {professionals.find(p => p.id === apt.professionalId)?.name || 'General'}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 text-right flex flex-col items-end gap-1">
                                                        <div className="flex items-center gap-1 text-[#34baab] font-black shrink-0">
                                                            <DollarSign className="w-3 h-3" />
                                                            <span>{apt.price?.toLocaleString('es-AR') || '0'}</span>
                                                        </div>
                                                        {apt.notes && (
                                                            <span className="text-[11px] text-gray-400 italic block max-w-[200px] leading-tight">
                                                                {apt.notes}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                                            <p className="text-gray-400 font-medium">No hay turnos registrados.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-gray-200 p-12">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                    <UserIcon className="w-10 h-10 text-gray-300" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Selecciona un cliente</h3>
                                <p className="text-gray-500 max-w-xs">
                                    Elige un cliente de la lista para ver su ficha completa, historial y detalles de salud.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Client Creation Modal */}
            <CreateClientModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={() => {
                    setSearchTerm(''); // Clear search
                    loadInitialUsers(); // Refresh list
                }}
            />
        </div>
    );
}
