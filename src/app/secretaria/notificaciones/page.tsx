'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Bell, Send, Users, User, History, Trash2, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { getAllUsers } from '@/lib/firebase/users';
import { getNotificationHistory, deleteNotificationRecord, NotificationRecord } from '@/lib/firebase/notifications';
import { UserProfile } from '@/lib/types/user';

export default function NotificationsPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [history, setHistory] = useState<NotificationRecord[]>([]);
    const [clients, setClients] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredClients, setFilteredClients] = useState<UserProfile[]>([]);


    // Config check
    const isVapidMissing = !process.env.NEXT_PUBLIC_VAPID_KEY;

    useEffect(() => {
        if (!authLoading && (!user || (profile?.role !== 'secretary' && profile?.role !== 'admin'))) {
            router.push('/dashboard');
        }
    }, [user, profile, authLoading, router]);

    useEffect(() => {
        if (user && (profile?.role === 'secretary' || profile?.role === 'admin')) {
            loadData();
        }
    }, [user, profile]);

    const loadData = async () => {
        try {
            const [historyData, usersData] = await Promise.all([
                getNotificationHistory(),
                getAllUsers()
            ]);
            console.log('FCM DEBUG: Total users fetched:', usersData.length);
            console.log('FCM DEBUG: Users found with tokens:', usersData.filter(u => u.fcmTokens?.length).length);

            setHistory(historyData);
            setAllUsers(usersData);
            setClients(usersData);
        } catch (error) {

            console.error('Error loading data:', error);
            toast.error('Error al cargar datos');
        }
    };

    // Filter clients based on search query
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredClients([]);
            return;
        }
        const query = searchQuery.toLowerCase();
        const filtered = allUsers.filter(user =>
            user.fullName.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
        );
        setFilteredClients(filtered);
    }, [searchQuery, allUsers]);

    const selectClient = (client: UserProfile) => {
        setSelectedUserId(client.uid);
        setSearchQuery(client.fullName);
        setShowSuggestions(false);
    };


    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !body) {
            toast.error('Por favor completa el título y el mensaje.');
            return;
        }

        setLoading(true);
        try {
            let targetTokens: string[] = [];
            let targetUid: string | undefined = undefined;

            if (targetType === 'all') {
                targetTokens = allUsers.flatMap(c => c.fcmTokens || []);
            } else {
                const target = clients.find(c => c.uid === selectedUserId);
                if (target) {
                    targetTokens = target.fcmTokens || [];
                    targetUid = target.uid;
                }
            }

            if (targetTokens.length === 0) {
                toast.error('No hay dispositivos registrados para recibir notificaciones.');
                setLoading(false);
                return;
            }

            const res = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    body,
                    tokens: targetTokens,
                    targetUserId: targetUid,
                    sentBy: user!.uid,
                    type: targetType === 'all' ? 'broadcast' : 'targeted'
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(`Notificación enviada con éxito (${data.successCount} dispositivos)`);
                setTitle('');
                setBody('');
                loadData(); // Refresh history
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            console.error('Error sending notification:', error);
            toast.error('Error al enviar notificación: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteNotificationRecord(id);
            setHistory(history.filter(h => h.id !== id));
            toast.success('Registro eliminado');
        } catch (error) {
            toast.error('Error al eliminar registro');
        }
    };

    if (authLoading) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 mb-4 text-amber-100 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Volver</span>
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <Bell className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Gestión de Avisos</h1>
                            <p className="text-amber-100">Envía notificaciones push a tus usuarios</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Compose Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Send className="w-5 h-5 text-amber-500" />
                            Nuevo Aviso
                        </h2>

                        <form onSubmit={handleSend} className="space-y-4">
                            <Input
                                label="Título"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej: Recordatorio de Turno"
                                required
                            />

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Mensaje
                                </label>
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Escribe el contenido de la notificación..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none h-32"
                                    required
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-gray-700">
                                    Destinatarios
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTargetType('all')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${targetType === 'all'
                                            ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Users className="w-4 h-4" />
                                        Todos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTargetType('specific')}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${targetType === 'specific'
                                            ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        <User className="w-4 h-4" />
                                        Particular
                                    </button>
                                </div>
                            </div>

                            {targetType === 'specific' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 relative">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Buscar Destinatario
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            placeholder="Nombre o email..."
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                            required={targetType === 'specific'}
                                        />
                                    </div>

                                    {/* Suggestions Dropdown */}
                                    {showSuggestions && searchQuery && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {filteredClients.length > 0 ? (
                                                filteredClients.slice(0, 10).map((client) => (
                                                    <button
                                                        key={client.uid}
                                                        type="button"
                                                        onClick={() => selectClient(client)}
                                                        className={`w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors border-b border-gray-100 last:border-b-0 ${selectedUserId === client.uid ? 'bg-amber-50' : ''}`}
                                                    >
                                                        <div className="font-medium text-gray-900">{client.fullName}</div>
                                                        <div className="text-sm text-gray-500">{client.email}</div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-4 text-center text-gray-500 text-sm">
                                                    No se encontraron usuarios
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}


                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500">
                                <p className="font-bold mb-1 uppercase tracking-wider text-[10px]">Estado de Envío</p>
                                {targetType === 'all' ? (
                                    <p>Se enviará a <strong>{allUsers.reduce((acc, c) => acc + (c.fcmTokens?.length || 0), 0)}</strong> dispositivos registrados.</p>
                                ) : (
                                    <p>
                                        {selectedUserId ? (
                                            <>El usuario seleccionado tiene <strong>{clients.find(c => c.uid === selectedUserId)?.fcmTokens?.length || 0}</strong> dispositivos registrados.</>
                                        ) : (
                                            "Selecciona un usuario para ver sus dispositivos."
                                        )}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={loading || isVapidMissing}
                                className="w-full py-4 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200 disabled:opacity-50"
                            >
                                {loading ? 'Enviando...' : 'Enviar Ahora'}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* History */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-full">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <History className="w-5 h-5 text-amber-500" />
                            Historial de Envíos
                        </h2>

                        <div className="space-y-4">
                            {history.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500">No hay notificaciones enviadas recientemente.</p>
                                </div>
                            ) : (
                                history.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all relative group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${item.sentBy === 'system'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : item.type === 'broadcast'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {item.sentBy === 'system' ? 'Automático' : item.type === 'broadcast' ? 'Masivo' : 'Individual'}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {item.sentAt.toLocaleString()}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(item.id!)}
                                                className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                                        <p className="text-sm text-gray-600 mt-1">{item.body}</p>
                                        {item.targetUserId && (
                                            <p className="text-[10px] text-gray-400 mt-2">
                                                ID Cliente: {item.targetUserId}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
