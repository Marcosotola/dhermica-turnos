'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getUsersByRole, getAllUsers } from '@/lib/firebase/users';
import { UserProfile } from '@/lib/types/user';
import { Toaster } from 'sonner';
import { BookOpen, Search, User as UserIcon, Phone, Calendar, Heart, AlertCircle, Info, CalendarCheck, ChevronDown, Loader2, ArrowLeft, CheckCircle2, Clock, XCircle, Eye, Smartphone, ClipboardList, Users } from 'lucide-react';
import { Appointment } from '@/lib/types/appointment';
import { getAppointmentsByClientId, searchAppointmentsByClient } from '@/lib/firebase/appointments';
import { Button } from '@/components/ui/Button';
import { getActiveProfessionals } from '@/lib/firebase/professionals';
import { Professional } from '@/lib/types/professional';
import { formatArgentineCurrency } from '@/lib/utils/currency';
import { CreateClientModal } from '@/components/dashboard/CreateClientModal';
import { AppointmentModal } from '@/components/appointments/AppointmentModal';
import { CancelAppointmentDialog, CreditAction } from '@/components/appointments/CancelAppointmentDialog';
import { DeleteAppointmentDialog } from '@/components/appointments/DeleteAppointmentDialog';
import { cancelAppointment, deleteAppointment } from '@/lib/firebase/appointments';
import { createClientCredit } from '@/lib/firebase/clientCredits';
import { ChevronUp, DollarSign, UserPlus, History, Pencil, Trash2, Gift, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { ClientCredit } from '@/lib/types/clientCredit';
import { getClientCredits } from '@/lib/firebase/clientCredits';
import { ClientLedger } from '@/components/clients/ClientLedger';
import { getClientLedgerSummary } from '@/lib/utils/clientLedger';
import { GiftCard } from '@/lib/types/giftCard';
import { getGiftCardsByClient } from '@/lib/firebase/giftCards';
import { GiftCardSection } from '@/components/clients/GiftCardSection';

export default function AgendaPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();

    // Registered clients — loaded once at init
    const [registeredClients, setRegisteredClients] = useState<UserProfile[]>([]);
    // Displayed list (filtered registered + legacy from search)
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [clientCredits, setClientCredits] = useState<ClientCredit[]>([]);
    const [creditsLoading, setCreditsLoading] = useState(false);
    const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
    const [giftCardsLoading, setGiftCardsLoading] = useState(false);
    const [aptSearch, setAptSearch] = useState('');
    const [aptStatusFilter, setAptStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
    const [aptDateFrom, setAptDateFrom] = useState('');
    const [aptDateTo, setAptDateTo] = useState('');
    const [showHistorial, setShowHistorial] = useState(false);
    const [showClientView, setShowClientView] = useState(false);
    const [clientViewTurnosOpen, setClientViewTurnosOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const normalize = (s: string) =>
        s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

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

    const USERS_CACHE_KEY = 'dhermica_users_cache';

    // Load all registered users — show cached list immediately, refresh in background
    const loadRegisteredClients = useCallback(async (background = false) => {
        // Show cached data instantly if available
        const cached = sessionStorage.getItem(USERS_CACHE_KEY);
        if (cached) {
            try {
                const parsed: UserProfile[] = JSON.parse(cached);
                setRegisteredClients(parsed);
                setUsers(parsed);
                if (!background) setLoading(false);
            } catch {
                // corrupt cache — ignore, fetch fresh
            }
        }

        if (!background) setLoading(!cached);
        try {
            const all = await getAllUsers();
            const sorted = all
                .filter(u => !!u.fullName)
                .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
            sessionStorage.setItem(USERS_CACHE_KEY, JSON.stringify(sorted));
            setRegisteredClients(sorted);
            setUsers(prev => {
                // Only update visible list if not mid-search
                return searchTerm.trim() ? prev : sorted;
            });
        } catch (error) {
            console.error('Error loading clients:', error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm]);

    useEffect(() => {
        if (profile?.role === 'admin' || profile?.role === 'professional' || profile?.role === 'secretary') {
            loadRegisteredClients();
        }
    }, [profile, loadRegisteredClients]);

    // Hybrid search: local filter on registered + Firebase query for legacy
    const handleSearch = useCallback((term: string) => {
        setSearchTerm(term);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!term.trim()) {
            setUsers(registeredClients);
            setSearchLoading(false);
            return;
        }

        setSearchLoading(true);
        debounceRef.current = setTimeout(async () => {
            const t = normalize(term);

            // 1. Filter registered clients locally (instant)
            const localMatches = registeredClients.filter(u => normalize(u.fullName).includes(t));
            const localNames = new Set(localMatches.map(u => normalize(u.fullName)));

            // 2. Search legacy in Firebase with the term
            try {
                const legacyApts = await searchAppointmentsByClient(term);
                const seenNames = new Set<string>();
                const legacyProfiles: UserProfile[] = [];

                legacyApts.forEach(apt => {
                    const trimmedName = apt.clientName.trim();
                    if (!trimmedName) return;
                    const norm = normalize(trimmedName);
                    if (!localNames.has(norm) && !seenNames.has(norm)) {
                        seenNames.add(norm);
                        legacyProfiles.push({
                            uid: `legacy-${trimmedName.replace(/\s+/g, '-').toLowerCase()}`,
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

                setUsers([...localMatches, ...legacyProfiles]);
            } catch (err) {
                console.error('Error searching legacy:', err);
                setUsers(localMatches);
            } finally {
                setSearchLoading(false);
            }
        }, 500);
    }, [registeredClients]);



    const fetchHistory = useCallback(async () => {
        if (!selectedUser) return;

        setHistoryLoading(true);
        setCreditsLoading(true);
        setGiftCardsLoading(true);
        try {
            const [apts, credits, gCards] = await Promise.all([
                getAppointmentsByClientId(selectedUser.uid, selectedUser.fullName),
                getClientCredits(selectedUser.uid, selectedUser.fullName),
                getGiftCardsByClient(selectedUser.uid, selectedUser.fullName),
            ]);
            setAppointments(apts);
            setClientCredits(credits);
            setGiftCards(gCards);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setHistoryLoading(false);
            setCreditsLoading(false);
            setGiftCardsLoading(false);
        }
    }, [selectedUser]);

    useEffect(() => {
        fetchHistory();
        setAptSearch('');
        setAptStatusFilter('all');
        setAptDateFrom('');
        setAptDateTo('');
    }, [selectedUser, fetchHistory]);

    const handleEditClick = (apt: Appointment) => {
        setSelectedAppointment(apt);
        setIsEditModalOpen(true);
    };

    const handleCancelClick = (apt: Appointment) => {
        setSelectedAppointment(apt);
        setIsCancelDialogOpen(true);
    };

    const handleDeleteClick = (apt: Appointment) => {
        setSelectedAppointment(apt);
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmHardDelete = async () => {
        if (!selectedAppointment) return;
        setIsDeleting(true);
        try {
            await deleteAppointment(selectedAppointment.id);
            toast.success('Turno eliminado permanentemente.');
            setIsDeleteConfirmOpen(false);
            fetchHistory();
        } catch (error) {
            console.error('Error eliminando turno:', error);
            toast.error('Error al eliminar el turno');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleConfirmCancel = async (creditAction: CreditAction, notes?: string) => {
        if (!selectedAppointment) return;
        setIsDeleting(true);
        try {
            const totalPaid = (selectedAppointment.payments || []).reduce((sum, p) => sum + p.amount, 0);

            if (creditAction !== 'none' && totalPaid > 0) {
                await createClientCredit({
                    clientId: selectedAppointment.clientId || `legacy-${selectedAppointment.clientName?.replace(/\s+/g, '-').toLowerCase()}`,
                    clientName: selectedAppointment.clientName,
                    amount: totalPaid,
                    reason: 'cancelled_appointment',
                    status: creditAction === 'retain' ? 'available' : 'forfeited',
                    sourceAppointmentId: selectedAppointment.id,
                    sourceAppointmentDate: selectedAppointment.date,
                    sourceTreatmentName: selectedAppointment.treatment,
                    notes: notes,
                    createdBy: user?.uid,
                });
            }

            await cancelAppointment(selectedAppointment.id);

            if (creditAction === 'retain' && totalPaid > 0) {
                toast.success(`Turno cancelado. Crédito de $${totalPaid.toLocaleString('es-AR')} retenido a favor del cliente.`);
            } else if (creditAction === 'forfeit' && totalPaid > 0) {
                toast.success('Turno cancelado. Seña registrada como perdida.');
            } else {
                toast.success('Turno cancelado.');
            }

            setIsCancelDialogOpen(false);
            fetchHistory();
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            toast.error('Error al cancelar el turno');
        } finally {
            setIsDeleting(false);
        }
    };

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

                        <div className="ml-auto flex items-center gap-3">
                            <button
                                onClick={() => router.push('/registro')}
                                className="bg-[#34baab] hover:bg-[#2da698] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[#34baab]/20 transition-all active:scale-95 group"
                            >
                                <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="hidden md:inline">Registrar Cliente</span>
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
                                className="w-full pl-12 pr-10 py-3 bg-white shadow-sm border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#34baab] outline-none"
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            {searchLoading && (
                                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#34baab] w-4 h-4 animate-spin" />
                            )}
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

                            {/* No load-more button needed — all clients are loaded at once */}
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
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2 text-gray-600 font-bold">
                                            <Phone className="w-4 h-4 text-[#34baab]" /> {selectedUser.phone}
                                        </div>
                                        <div className="text-sm text-gray-400 lowercase">{selectedUser.email}</div>
                                        {!selectedUser.uid.startsWith('legacy-') && (
                                            <button
                                                type="button"
                                                onClick={() => setShowClientView(true)}
                                                className="flex items-center gap-1.5 mt-1 px-3 py-1.5 bg-[#34baab]/10 hover:bg-[#34baab]/20 text-[#34baab] text-xs font-bold rounded-xl transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" /> Ver como cliente
                                            </button>
                                        )}
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
                                                                        if (!selectedUser.birthDate) return 'No registrada';
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

                                {/* Estado de Cuenta */}
                                <div className="pt-6 border-t border-gray-100">
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-[#34baab]" /> Estado de Cuenta
                                    </h3>
                                    <ClientLedger
                                        appointments={appointments}
                                        credits={clientCredits}
                                        isAdmin={true}
                                        loading={historyLoading || creditsLoading}
                                    />
                                </div>

                                {/* Gift Cards */}
                                <div className="pt-6 border-t border-gray-100">
                                    {giftCardsLoading ? (
                                        <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando gift cards...
                                        </div>
                                    ) : (
                                        <GiftCardSection
                                            clientId={selectedUser.uid}
                                            clientName={selectedUser.fullName}
                                            giftCards={giftCards}
                                            onRefresh={fetchHistory}
                                            createdBy={user?.uid}
                                        />
                                    )}
                                </div>

                                {/* Historial de Turnos */}
                                <div className="pt-6 border-t border-gray-100">
                                    <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setShowHistorial(v => !v)}
                                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-5 h-5 text-[#34baab]" />
                                                <span className="font-bold text-gray-900">Historial de Turnos</span>
                                                <span className="text-xs text-gray-400 font-medium">({appointments.length} registros)</span>
                                            </div>
                                            {showHistorial ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                        </button>

                                    {showHistorial && (
                                    <div className="p-4 animate-in slide-in-from-top-2 duration-200 space-y-4">
                                    {/* Filtros */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar tratamiento..."
                                                    value={aptSearch}
                                                    onChange={e => setAptSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#34baab]"
                                                />
                                            </div>
                                            <div className="flex gap-1 flex-wrap">
                                                {([
                                                    { value: 'all', label: 'Todos' },
                                                    { value: 'pending', label: 'Pendiente' },
                                                    { value: 'completed', label: 'Realizado' },
                                                    { value: 'cancelled', label: 'Cancelado' },
                                                ] as const).map(f => (
                                                    <button
                                                        key={f.value}
                                                        onClick={() => setAptStatusFilter(f.value)}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors ${
                                                            aptStatusFilter === f.value
                                                                ? 'bg-[#34baab] text-white'
                                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {f.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Date range row */}
                                        <div className="flex items-center gap-2">
                                            <CalendarCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <div className="flex-1 grid grid-cols-2 gap-1.5">
                                                <input
                                                    type="date"
                                                    value={aptDateFrom}
                                                    onChange={e => setAptDateFrom(e.target.value)}
                                                    className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#34baab]"
                                                />
                                                <input
                                                    type="date"
                                                    value={aptDateTo}
                                                    onChange={e => setAptDateTo(e.target.value)}
                                                    className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#34baab]"
                                                />
                                            </div>
                                            {(aptDateFrom || aptDateTo) && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setAptDateFrom(''); setAptDateTo(''); }}
                                                    className="text-[10px] text-[#34baab] font-bold whitespace-nowrap hover:underline"
                                                >
                                                    Limpiar
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {historyLoading ? (
                                        <div className="flex justify-center p-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34baab]"></div>
                                        </div>
                                    ) : (() => {
                                        const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
                                        const filtered = appointments.filter(apt => {
                                            const status = (apt.status || 'pending') as string;
                                            const matchSearch = !aptSearch || norm(apt.treatment).includes(norm(aptSearch));
                                            const matchStatus = aptStatusFilter === 'all' ||
                                                (aptStatusFilter === 'completed' && (status === 'completed' || status === 'realizado')) ||
                                                (aptStatusFilter === 'cancelled' && (status === 'cancelled' || status === 'cancelado')) ||
                                                (aptStatusFilter === 'pending' && status === 'pending');
                                            const matchFrom = !aptDateFrom || apt.date >= aptDateFrom;
                                            const matchTo = !aptDateTo || apt.date <= aptDateTo;
                                            return matchSearch && matchStatus && matchFrom && matchTo;
                                        });

                                        if (filtered.length === 0) {
                                            return (
                                                <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                                                    <p className="text-gray-400 font-medium">
                                                        {appointments.length === 0 ? 'No hay turnos registrados.' : 'No hay turnos que coincidan con el filtro.'}
                                                    </p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="space-y-3">
                                                {filtered.map((apt) => {
                                                    const totalPaid = (apt.payments || []).reduce((sum, p) => sum + p.amount, 0);
                                                    const balance = (apt.price || 0) - totalPaid;
                                                    const status = apt.status || 'pending';

                                                    return (
                                                        <div key={apt.id} className="flex flex-col p-4 bg-gray-50 rounded-3xl border border-gray-100 hover:border-[#34baab]/30 transition-all">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                                        <CalendarCheck className="w-5 h-5 text-[#34baab]" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className="font-bold text-gray-900 text-sm">{apt.treatment}</h4>
                                                                            {((status as any) === 'completed' || (status as any) === 'realizado') && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                                                            {((status as any) === 'pending') && <Clock className="w-3.5 h-3.5 text-orange-500" />}
                                                                            {((status as any) === 'cancelled' || (status as any) === 'cancelado') && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                                                                        </div>
                                                                        <p className="text-xs text-gray-500">
                                                                            {(() => {
                                                                                const parts = apt.date.split('-');
                                                                                return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : apt.date;
                                                                            })()} - {apt.time}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex flex-col items-end gap-2">
                                                                    <div>
                                                                        <div className="flex items-center gap-1 text-[#34baab] font-black justify-end">
                                                                            <DollarSign className="w-3 h-3" />
                                                                            <span>{formatArgentineCurrency(apt.price || 0)}</span>
                                                                        </div>
                                                                        {((status as any) === 'completed' || (status as any) === 'realizado') ? (
                                                                            <span className="text-[8px] font-black bg-green-100 text-green-600 px-1.5 py-0.5 rounded uppercase tracking-widest">Realizado</span>
                                                                        ) : ((status as any) === 'cancelled' || (status as any) === 'cancelado') ? (
                                                                            <span className="text-[8px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase tracking-widest">Cancelado</span>
                                                                        ) : (
                                                                            <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded uppercase tracking-widest">Pendiente</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => handleEditClick(apt)}
                                                                            className="p-1.5 bg-white border border-gray-100 rounded-lg text-gray-400 hover:text-[#34baab] hover:border-[#34baab]/30 transition-all shadow-sm"
                                                                            title="Editar Turno"
                                                                        >
                                                                            <Pencil className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleCancelClick(apt)}
                                                                            className="p-1.5 bg-white border border-gray-100 rounded-lg text-gray-400 hover:text-amber-500 hover:border-amber-100 transition-all shadow-sm"
                                                                            title="Cancelar Turno"
                                                                        >
                                                                            <Ban className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteClick(apt)}
                                                                            className="p-1.5 bg-white border border-gray-100 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                                                                            title="Eliminar Turno"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {(apt.payments || []).length > 0 && (
                                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Pagos Realizados</span>
                                                                        <span className={`text-[12px] font-black ${balance > 0 ? 'text-red-500' : 'text-[#34baab]'} uppercase`}>
                                                                            {balance > 0 ? `Deuda: $${formatArgentineCurrency(balance)}` : 'Saldado'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {(apt.payments || []).map((p, i) => (
                                                                            <span key={i} className="text-[10px] bg-white text-gray-600 px-3 py-2 rounded-xl border border-gray-100 font-bold flex flex-col shadow-sm">
                                                                                <span className="text-gray-400 uppercase text-[8px] mb-0.5">{(() => {
                                                                                    const parts = (p.date || '').split('-');
                                                                                    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : p.date;
                                                                                })()} • {p.method === 'cash' ? 'Efectivo' : p.method === 'transfer' ? 'Transferencia' : p.method === 'debit' ? 'Débito' : p.method === 'credit' ? 'Crédito' : p.method}</span>
                                                                                <span className="text-gray-900">{p.label}: ${formatArgentineCurrency(p.amount)}</span>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {apt.notes && (
                                                                <div className="mt-2 text-[10px] text-gray-500 bg-white p-2 rounded-xl border border-gray-50 italic leading-tight">
                                                                    "{apt.notes}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                    </div>
                                    )}
                                    </div>
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
                    setSearchTerm('');
                    sessionStorage.removeItem('dhermica_users_cache');
                    loadRegisteredClients();
                }}
            />

            {selectedAppointment && (
                <AppointmentModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedAppointment(null);
                    }}
                    appointment={selectedAppointment}
                    date={selectedAppointment.date}
                    professionals={professionals}
                    existingAppointments={[]} // No validamos superposición aquí por simplicidad y porque es edición
                />
            )}

            <CancelAppointmentDialog
                isOpen={isCancelDialogOpen}
                onClose={() => setIsCancelDialogOpen(false)}
                onConfirm={handleConfirmCancel}
                appointment={selectedAppointment}
                loading={isDeleting}
            />

            <DeleteAppointmentDialog
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmHardDelete}
                appointment={selectedAppointment}
                loading={isDeleting}
            />

            {/* Vista del cliente modal */}
            {showClientView && selectedUser && (() => {
                const cvSummary = getClientLedgerSummary(appointments, clientCredits);
                const activeGiftCards = giftCards.filter(g => g.status === 'active');
                return (
                <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 overflow-y-auto">
                    {/* Header */}
                    <div className="bg-[#484450] px-4 py-5 flex items-center justify-between shrink-0 sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-lg">
                                <ClipboardList className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-[#34baab] uppercase tracking-widest flex items-center gap-1">
                                    <Smartphone className="w-3 h-3" /> Vista del cliente
                                </p>
                                <h1 className="text-lg font-black text-white leading-tight">{selectedUser.fullName}</h1>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowClientView(false)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>

                    <div className="max-w-2xl w-full mx-auto px-4 py-5 space-y-4">

                        {/* Banner de estado */}
                        {cvSummary.netBalance > 0 ? (
                            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-4">
                                <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                                <div>
                                    <p className="text-xs font-black text-red-400 uppercase tracking-widest">Saldo pendiente</p>
                                    <p className="text-xl font-black text-red-600">$ {formatArgentineCurrency(cvSummary.netBalance)}</p>
                                </div>
                            </div>
                        ) : cvSummary.netBalance < 0 ? (
                            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4">
                                <Gift className="w-6 h-6 text-amber-500 shrink-0" />
                                <div>
                                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest">Saldo a favor</p>
                                    <p className="text-xl font-black text-amber-600">$ {formatArgentineCurrency(Math.abs(cvSummary.netBalance))}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-4">
                                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                                <div>
                                    <p className="text-xs font-black text-green-500 uppercase tracking-widest">Al día</p>
                                    <p className="text-sm font-bold text-green-700">No hay deuda pendiente</p>
                                </div>
                            </div>
                        )}

                        {/* Historial de Turnos colapsable */}
                        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                            <button
                                type="button"
                                onClick={() => setClientViewTurnosOpen(v => !v)}
                                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <CalendarCheck className="w-4 h-4 text-[#34baab]" />
                                    <span className="font-bold text-gray-900 text-sm">Mis Turnos</span>
                                    <span className="text-xs text-gray-400 font-medium">({appointments.length})</span>
                                </div>
                                {clientViewTurnosOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </button>
                            {clientViewTurnosOpen && (
                                <div className="p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                    {appointments.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm font-bold text-gray-400">No hay turnos registrados</p>
                                        </div>
                                    ) : (
                                        [...appointments]
                                            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                                            .map(apt => {
                                                const totalPaid = (apt.payments || []).reduce((s, p) => s + p.amount, 0);
                                                const balance = (apt.price || 0) - totalPaid;
                                                const status = apt.status || 'pending';
                                                return (
                                                    <div key={apt.id} className="flex items-start justify-between gap-3 p-3 rounded-2xl border border-gray-100 bg-gray-50/50">
                                                        <div className="flex items-start gap-2 min-w-0">
                                                            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shrink-0 border border-gray-100">
                                                                <CalendarCheck className="w-4 h-4 text-[#34baab]" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-gray-900 text-sm truncate">{apt.treatment}</p>
                                                                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                                    <Clock className="w-3 h-3 shrink-0" />
                                                                    {(() => { const [y,m,d] = apt.date.split('-'); return `${d}/${m}/${y}`; })()} — {apt.time}hs
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                                            <span className="text-sm font-black text-[#34baab]">$ {formatArgentineCurrency(apt.price || 0)}</span>
                                                            {(status as string) === 'completed' || (status as string) === 'realizado' ? (
                                                                <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-[9px] uppercase font-black flex items-center gap-1">
                                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Realizado
                                                                </span>
                                                            ) : (status as string) === 'cancelled' || (status as string) === 'cancelado' ? (
                                                                <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[9px] uppercase font-black flex items-center gap-1">
                                                                    <XCircle className="w-2.5 h-2.5" /> Cancelado
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-[9px] uppercase font-black flex items-center gap-1">
                                                                    <Clock className="w-2.5 h-2.5" /> Pendiente
                                                                </span>
                                                            )}
                                                            {(apt.payments || []).length > 0 && balance === 0 && (
                                                                <span className="text-[9px] font-black text-[#34baab]">Saldado</span>
                                                            )}
                                                            {(apt.payments || []).length > 0 && balance > 0 && (
                                                                <span className="text-[9px] font-black text-red-500">Debe $ {formatArgentineCurrency(balance)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Gift Cards */}
                        <div className="space-y-2">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <Gift className="w-3.5 h-3.5 text-[#34baab]" /> Mis Gift Cards
                            </p>
                            {activeGiftCards.length === 0 ? (
                                <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
                                    <Gift className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-gray-400">No tenés gift cards activas</p>
                                    <p className="text-xs text-gray-300 mt-0.5">Podés consultarnos para obtener una.</p>
                                </div>
                            ) : (
                                activeGiftCards.map(gc => (
                                    <div key={gc.id} className="rounded-2xl bg-gradient-to-r from-teal-500 via-teal-400 to-cyan-400 p-4 shadow-sm">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Gift Card activa</p>
                                                <p className="text-2xl font-black text-white">$ {formatArgentineCurrency(gc.amount)}</p>
                                                <p className="text-xs font-mono text-white/80 mt-1">{gc.code}</p>
                                            </div>
                                            {gc.expiryDate && (
                                                <p className="text-[10px] text-white/70">Vence {(() => { const [y,m,d] = gc.expiryDate!.split('-'); return `${d}/${m}/${y}`; })()}</p>
                                            )}
                                        </div>
                                        {gc.notes && <p className="text-[10px] text-white/70 mt-2 italic">"{gc.notes}"</p>}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Historial de Transacciones */}
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-1 mb-2 flex items-center gap-2">
                                <DollarSign className="w-3.5 h-3.5 text-[#34baab]" /> Historial de Transacciones
                            </p>
                            <ClientLedger
                                appointments={appointments}
                                credits={clientCredits}
                                loading={historyLoading || creditsLoading}
                                hideSummary
                            />
                        </div>

                    </div>
                </div>
                );
            })()}
        </div>
    );
}
