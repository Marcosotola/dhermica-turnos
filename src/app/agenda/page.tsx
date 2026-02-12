'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getClientsPaginated, searchClients } from '@/lib/firebase/users';
import { UserProfile } from '@/lib/types/user';
import { Toaster } from 'sonner';
import { BookOpen, Search, User as UserIcon, Mail, Phone, Calendar, Heart, AlertCircle, Info, CalendarCheck, ChevronDown, Loader2 } from 'lucide-react';
import { Appointment } from '@/lib/types/appointment';
import { getAppointmentsByClientId } from '@/lib/firebase/appointments';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';

export default function AgendaPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Pagination state
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        if (!authLoading && profile?.role !== 'admin' && profile?.role !== 'professional') {
            router.push('/dashboard');
        }
    }, [profile, authLoading, router]);

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
                // Perform search
                const results = await searchClients(term);
                setUsers(results);
                setHasMore(false); // Disable pagination during search
            }
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (profile?.role === 'admin' || profile?.role === 'professional') {
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
                            <h1 className="text-3xl font-black tracking-tight">Agenda de Clientes</h1>
                            <p className="text-gray-300 font-medium">Consulta fichas y datos relevantes.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* List Column */}
                    <div className="lg:col-span-1 space-y-4">
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
                                        <div className="w-10 h-10 bg-[#484450]/10 rounded-xl flex items-center justify-center shrink-0">
                                            <UserIcon className="w-6 h-6 text-[#484450]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{user.fullName}</p>
                                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
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
                    <div className="lg:col-span-2">
                        {selectedUser ? (
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8 animate-in fade-in duration-300">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 bg-[#484450] rounded-2xl flex items-center justify-center shadow-lg">
                                            <UserIcon className="w-12 h-12 text-[#34baab]" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900">{selectedUser.fullName}</h2>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] uppercase font-black tracking-widest">
                                                    ID: {selectedUser.uid.substring(0, 8)}...
                                                </span>
                                                <span className="px-2 py-1 bg-green-100 text-green-600 rounded-lg text-[10px] uppercase font-black tracking-widest">
                                                    Cliente Registrado
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
                                            <Info className="w-4 h-4 text-[#34baab]" /> Información Básica
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 p-4 rounded-2xl">
                                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">F. Nacimiento</p>
                                                <p className="font-bold text-gray-900">{selectedUser.birthDate}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-2xl">
                                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Desde</p>
                                                <p className="font-bold text-gray-900">{selectedUser.createdAt.toLocaleDateString()}</p>
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
                                                                {new Date(apt.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} - {apt.time}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {apt.notes && (
                                                            <span className="text-xs text-gray-400 italic block max-w-[150px] truncate">
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
        </div>
    );
}
