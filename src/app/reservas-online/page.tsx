'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { authFetch } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    Bot, ChevronLeft, Clock, CheckCircle2, XCircle, AlertCircle,
    MessageSquare, ChevronDown, ChevronUp, Loader2, User, Calendar, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { formatArgentineCurrency } from '@/lib/utils/currency';

interface ChatMessage { role: 'user' | 'assistant'; content: string; }
interface BookingSlot { treatmentNames: string[]; zones: string[]; date: string; time: string; durationMinutes: number; }
interface PendingBookingRow {
    id: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    slots: BookingSlot[];
    status: string;
    depositAmount: number;
    chatHistory: ChatMessage[];
    createdAt: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; className: string }> = {
    confirmed:      { label: 'Confirmado',       icon: CheckCircle2,  className: 'bg-green-100 text-green-700' },
    pending_payment:{ label: 'Pdte. de pago',    icon: AlertCircle,   className: 'bg-amber-100 text-amber-700' },
    expired:        { label: 'Expirado',          icon: Clock,         className: 'bg-gray-100 text-gray-500' },
    failed:         { label: 'Fallido',           icon: XCircle,       className: 'bg-red-100 text-red-600' },
};

export default function ReservasOnlinePage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [bookings, setBookings] = useState<PendingBookingRow[]>([]);
    const [fetching, setFetching] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending_payment' | 'expired'>('all');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && profile?.role !== 'admin' && profile?.role !== 'secretary') {
            router.push('/dashboard');
        }
    }, [profile, loading, router]);

    useEffect(() => {
        if (!user) return;
        authFetch(user, '/api/admin/pending-bookings')
            .then(r => r.json())
            .then(d => setBookings(d.bookings || []))
            .catch(() => {})
            .finally(() => setFetching(false));
    }, [user]);

    const handleDelete = async (id: string) => {
        if (!user) return;
        setDeletingId(id);
        try {
            const res = await authFetch(user, '/api/admin/pending-bookings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                setBookings(prev => prev.filter(b => b.id !== id));
            }
        } catch {}
        setDeletingId(null);
        setConfirmDeleteId(null);
    };

    if (loading || fetching) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-[#34baab]" />
            </div>
        );
    }

    const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

    const formatDate = (iso: string | null) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="container mx-auto px-4 py-8">

                {/* Header */}
                <div className="bg-[#484450] rounded-3xl p-6 mb-6 shadow-lg text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-lg">
                                <Bot className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight">Reservas Online (IA)</h1>
                                <p className="text-gray-300 text-sm">Historial de reservas creadas por el asistente</p>
                            </div>
                        </div>
                        <Link href="/dashboard" className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-xl text-sm font-bold">
                            <ChevronLeft className="w-4 h-4" /> Volver
                        </Link>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex gap-2 mb-4 flex-wrap">
                    {(['all', 'confirmed', 'pending_payment', 'expired'] as const).map(f => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                filter === f ? 'bg-[#34baab] text-white' : 'bg-white text-gray-500 border border-gray-200'
                            }`}
                        >
                            {f === 'all' ? `Todas (${bookings.length})` : STATUS_CONFIG[f]?.label}
                        </button>
                    ))}
                </div>

                {/* Lista */}
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
                        <Bot className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-bold">No hay reservas online todavía</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(b => {
                            const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.expired;
                            const StatusIcon = sc.icon;
                            const isExpanded = expandedId === b.id;
                            const firstSlot = b.slots[0];
                            const treatments = b.slots.flatMap(s => s.treatmentNames || []).join(', ');
                            const zones = b.slots.flatMap(s => (s.zones || []).filter(Boolean)).join(', ');
                            const hasChatHistory = b.chatHistory.length > 0;

                            return (
                                <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    {/* Fila principal */}
                                    <div className="p-4 flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="w-10 h-10 bg-[#34baab]/10 rounded-xl flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5 text-[#34baab]" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-900 text-sm">{b.clientName}</p>
                                                <p className="text-xs text-gray-500 truncate">{b.clientEmail} · {b.clientPhone}</p>
                                                <p className="text-xs text-[#34baab] font-medium mt-0.5">
                                                    {treatments}{zones ? ` · ${zones}` : ''}
                                                </p>
                                                {firstSlot && (
                                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <Calendar className="w-3 h-3" />
                                                        {firstSlot.date.split('-').reverse().join('-')} a las {firstSlot.time}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${sc.className}`}>
                                                    <StatusIcon className="w-3 h-3" /> {sc.label}
                                                </span>
                                                {confirmDeleteId === b.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(b.id)}
                                                            disabled={deletingId === b.id}
                                                            className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 disabled:opacity-50"
                                                        >
                                                            {deletingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sí'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="px-2 py-1 rounded-lg bg-gray-200 text-gray-600 text-[10px] font-bold hover:bg-gray-300"
                                                        >
                                                            No
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDeleteId(b.id)}
                                                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                        title="Eliminar reserva"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            {b.depositAmount > 0 && (
                                                <span className="text-xs font-bold text-gray-600">
                                                    Seña: {formatArgentineCurrency(b.depositAmount)}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-gray-300">{formatDate(b.createdAt)}</span>
                                        </div>
                                    </div>

                                    {/* Botón ver chat */}
                                    {hasChatHistory && (
                                        <button
                                            type="button"
                                            onClick={() => setExpandedId(isExpanded ? null : b.id)}
                                            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors border-t border-gray-100 text-xs font-bold text-gray-500"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <MessageSquare className="w-3.5 h-3.5 text-[#34baab]" />
                                                Ver conversación ({b.chatHistory.length} mensajes)
                                            </span>
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    )}

                                    {/* Historial del chat */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-2 max-h-96 overflow-y-auto">
                                            {b.chatHistory.map((msg, i) => (
                                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    {msg.role === 'assistant' && (
                                                        <div className="w-6 h-6 rounded-full bg-[#34baab]/10 flex items-center justify-center mr-1.5 mt-1 shrink-0">
                                                            <Bot className="w-3.5 h-3.5 text-[#34baab]" />
                                                        </div>
                                                    )}
                                                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                                                        msg.role === 'user'
                                                            ? 'bg-[#34baab] text-white rounded-br-sm'
                                                            : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-bl-sm'
                                                    }`}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
