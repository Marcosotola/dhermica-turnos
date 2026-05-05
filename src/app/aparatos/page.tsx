'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
    getAllAparatoSessions,
    createAparatoSession,
    updateAparatoSession,
    deleteAparatoSession,
    getAparatoSessionsByProfessional,
} from '@/lib/firebase/aparatos';
import { getActiveProfessionals } from '@/lib/firebase/professionals';
import { createEgreso } from '@/lib/firebase/egresos';
import { AparatoSession, AparatoTreatment, APARATO_TREATMENTS } from '@/lib/types/aparato';
import { Professional } from '@/lib/types/professional';
import { Zap, Plus, Pencil, Trash2, Loader2, CalendarDays, DollarSign, CheckCircle2, Eye, Search, Filter } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { DeleteConfirmDialog } from '@/components/appointments/DeleteConfirmDialog';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    debit: 'T. Débito',
    credit: 'T. Crédito',
    qr: 'QR / Digital',
};

const TREATMENT_COLORS: Record<AparatoTreatment, string> = {
    Definitiva: 'bg-violet-100 text-violet-700 border-violet-200',
    HiFu: 'bg-amber-100 text-amber-700 border-amber-200',
    Liposonix: 'bg-blue-100 text-blue-700 border-blue-200',
};

interface SessionFormData {
    date: string;
    treatment: AparatoTreatment;
    professionalId: string;
    professionalName: string;
    fixedFee: string;
    paymentMethod: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    bankAccount: 'cuenta1' | 'cuenta2' | '';
    notes: string;
}

const emptyForm = (): SessionFormData => ({
    date: new Date().toISOString().split('T')[0],
    treatment: 'Definitiva',
    professionalId: '',
    professionalName: '',
    fixedFee: '',
    paymentMethod: 'cash',
    bankAccount: '',
    notes: '',
});

export default function AparatosPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [sessions, setSessions] = useState<AparatoSession[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [closeModalOpen, setCloseModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<AparatoSession | null>(null);
    const [saving, setSaving] = useState(false);
    const [closing, setClosing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [form, setForm] = useState<SessionFormData>(emptyForm());

    // Search and Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTreatment, setFilterTreatment] = useState<string>('all');
    const [filterProfessional, setFilterProfessional] = useState<string>('all');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [visibleCount, setVisibleCount] = useState(20);

    const canEdit = profile?.role === 'admin' || profile?.role === 'secretary';
    const isProfessional = profile?.role === 'professional';

    // Derived state for filtering and pagination
    const filteredSessions = sessions.filter(s => {
        const matchesSearch = 
            s.professionalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTreatment = filterTreatment === 'all' || s.treatment === filterTreatment;
        const matchesProfessional = filterProfessional === 'all' || s.professionalId === filterProfessional;
        const matchesStartDate = !filterStartDate || s.date >= filterStartDate;
        const matchesEndDate = !filterEndDate || s.date <= filterEndDate;
        return matchesSearch && matchesTreatment && matchesProfessional && matchesStartDate && matchesEndDate;
    });

    const displayedSessions = filteredSessions.slice(0, visibleCount);
    const hasMore = filteredSessions.length > visibleCount;

    const loadData = useCallback(async () => {
        if (!profile) return;
        setLoading(true);
        try {
            const [profs, sess] = await Promise.all([
                getActiveProfessionals(),
                isProfessional
                    ? getAparatoSessionsByProfessional(profile.uid)
                    : getAllAparatoSessions(),
            ]);
            setProfessionals(profs);
            setSessions(sess);
        } catch (err) {
            console.error(err);
            toast.error('Error al cargar sesiones');
        } finally {
            setLoading(false);
        }
    }, [profile, isProfessional]);

    useEffect(() => {
        if (!authLoading && profile) {
            if (profile.role !== 'admin' && profile.role !== 'secretary' && profile.role !== 'professional') {
                router.push('/dashboard');
                return;
            }
            loadData();
        }
    }, [authLoading, profile, loadData, router]);

    const openCreate = () => {
        setSelectedSession(null);
        setForm(emptyForm());
        setModalOpen(true);
    };

    const openView = (session: AparatoSession) => {
        setSelectedSession(session);
        setViewModalOpen(true);
    };

    const openEdit = (session: AparatoSession) => {
        setSelectedSession(session);
        setForm({
            date: session.date,
            treatment: session.treatment,
            professionalId: session.professionalId,
            professionalName: session.professionalName,
            fixedFee: String(session.fixedFee || ''),
            paymentMethod: session.paymentMethod || 'cash',
            bankAccount: session.bankAccount || '',
            notes: session.notes || '',
        });
        setModalOpen(true);
    };

    const openCloseModal = (session: AparatoSession) => {
        setSelectedSession(session);
        setForm({
            date: session.date,
            treatment: session.treatment,
            professionalId: session.professionalId,
            professionalName: session.professionalName,
            fixedFee: String(session.fixedFee || ''),
            paymentMethod: session.paymentMethod || 'cash',
            bankAccount: session.bankAccount || '',
            notes: session.notes || '',
        });
        setCloseModalOpen(true);
    };

    const handleProfessionalChange = (profId: string) => {
        const prof = professionals.find(p => p.id === profId);
        setForm(f => ({ ...f, professionalId: profId, professionalName: prof?.name || '' }));
    };

    const handleSave = async () => {
        if (!form.professionalId || !form.date) {
            toast.error('Completá todos los campos requeridos');
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                date: form.date,
                treatment: form.treatment,
                professionalId: form.professionalId,
                professionalName: form.professionalName,
                notes: form.notes,
            };

            // Solo incluimos campos de pago si ya existen o si estamos editando una completada
            if (selectedSession?.status === 'completed' || form.fixedFee) {
                payload.fixedFee = Number(form.fixedFee);
                payload.paymentMethod = form.paymentMethod;
                payload.bankAccount = form.bankAccount || null;
            }

            if (selectedSession) {
                await updateAparatoSession(selectedSession.id, payload);
                toast.success('Sesión actualizada');
            } else {
                await createAparatoSession({
                    ...payload,
                    status: 'pending'
                });
                toast.success('Sesión registrada');
            }
            setModalOpen(false);
            loadData();
        } catch (err) {
            console.error(err);
            toast.error('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleCloseSession = async () => {
        if (!selectedSession || !form.fixedFee || (form.paymentMethod === 'transfer' && !form.bankAccount)) {
            toast.error('Completá el monto y el método de pago');
            return;
        }

        setClosing(true);
        try {
            // 1. Crear el Egreso
            const expenseId = await createEgreso({
                date: form.date,
                category: 'sueldos',
                amount: Number(form.fixedFee),
                description: `Pago profesional: ${form.professionalName} - Sesión Aparato (${form.treatment})`,
                paymentMethod: form.paymentMethod,
                bankAccount: form.bankAccount as any || null,
            });

            // 2. Actualizar la Sesión
            await updateAparatoSession(selectedSession.id, {
                status: 'completed',
                fixedFee: Number(form.fixedFee),
                paymentMethod: form.paymentMethod,
                bankAccount: form.bankAccount as any || null,
                expenseId: expenseId
            });

            toast.success('Sesión cerrada y gasto registrado');
            setCloseModalOpen(false);
            loadData();
        } catch (err) {
            console.error(err);
            toast.error('Error al cerrar sesión');
        } finally {
            setClosing(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedSession) return;
        setDeleting(true);
        try {
            await deleteAparatoSession(selectedSession.id);
            toast.success('Sesión eliminada');
            setDeleteDialogOpen(false);
            setSelectedSession(null);
            loadData();
        } catch (err) {
            toast.error('Error al eliminar');
        } finally {
            setDeleting(false);
        }
    };

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);

    const formatDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-');
        return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('es-AR', {
            weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#34baab]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-[#484450] rounded-3xl p-8 mb-8 shadow-lg text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <Zap className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Aparatos</h1>
                            <p className="text-gray-300 font-medium">
                                {canEdit ? 'Gestión de sesiones de aparatología' : 'Mis sesiones de aparatos'}
                            </p>
                        </div>
                    </div>
                    {canEdit && (
                        <button
                            onClick={openCreate}
                            className="bg-amber-500 hover:bg-amber-400 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="hidden md:inline">Nueva Sesión</span>
                        </button>
                    )}
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por profesional o notas..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setVisibleCount(20); }}
                            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-[#34baab] outline-none font-medium text-gray-700"
                        />
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={filterStartDate}
                                onChange={e => { setFilterStartDate(e.target.value); setVisibleCount(20); }}
                                className="flex-1 bg-gray-50 border-none rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[#34baab] outline-none font-bold text-[9px] text-gray-600 cursor-pointer"
                                title="Desde"
                            />
                            <span className="text-gray-400 font-bold text-[10px]">AL</span>
                            <input
                                type="date"
                                value={filterEndDate}
                                onChange={e => { setFilterEndDate(e.target.value); setVisibleCount(20); }}
                                className="flex-1 bg-gray-50 border-none rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[#34baab] outline-none font-bold text-[9px] text-gray-600 cursor-pointer"
                                title="Hasta"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={filterTreatment}
                                onChange={e => { setFilterTreatment(e.target.value); setVisibleCount(20); }}
                                className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border-none rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-purple-400 outline-none font-black text-[9px] uppercase tracking-tighter appearance-none cursor-pointer transition-colors"
                            >
                                <option value="all">TRATAMIENTOS</option>
                                {APARATO_TREATMENTS.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            {!isProfessional && (
                                <select
                                    value={filterProfessional}
                                    onChange={e => { setFilterProfessional(e.target.value); setVisibleCount(20); }}
                                    className="flex-1 bg-[#34baab]/10 hover:bg-[#34baab]/20 text-[#34baab] border-none rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[#34baab] outline-none font-black text-[9px] uppercase tracking-tighter appearance-none cursor-pointer transition-colors"
                                >
                                    <option value="all">PROFESIONALES</option>
                                    {professionals.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                {/* List Table */}
                {filteredSessions.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
                        <Zap className="w-12 h-12 text-amber-300 mx-auto mb-4" />
                        <p className="text-gray-400 font-medium">No se encontraron sesiones con esos filtros.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Tratamiento</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Profesional</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Estado</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Pago</th>
                                            {canEdit && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Acciones</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {displayedSessions.map(session => (
                                            <tr key={session.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarDays className="w-4 h-4 text-gray-400" />
                                                        <span className="font-bold text-sm text-gray-700">{formatDate(session.date)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${TREATMENT_COLORS[session.treatment]}`}>
                                                        {session.treatment}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-[#34baab] rounded-full" />
                                                        <span className="text-sm font-medium text-gray-600">{session.professionalName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-100">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${session.status === 'completed' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${session.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`}>
                                                            {session.status === 'completed' ? 'Completada' : 'Pendiente'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    {session.status === 'completed' ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                                {PAYMENT_METHOD_LABELS[session.paymentMethod || 'cash']}
                                                            </span>
                                                            <span className="text-sm font-black text-gray-900">
                                                                {formatCurrency(session.fixedFee || 0)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        canEdit && (
                                                            <button
                                                                onClick={() => openCloseModal(session)}
                                                                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm border border-amber-600/20"
                                                            >
                                                                <DollarSign className="w-3 h-3" />
                                                                Cobrar y Cerrar
                                                            </button>
                                                        )
                                                    )}
                                                </td>
                                                {canEdit && (
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <button
                                                                aria-label="Ver sesión"
                                                                onClick={() => openView(session)}
                                                                className="p-2 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors shadow-sm"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                aria-label="Editar sesión"
                                                                onClick={() => openEdit(session)}
                                                                className="p-2 rounded-xl bg-[#34baab]/10 text-[#34baab] hover:bg-[#34baab]/20 transition-colors shadow-sm"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                aria-label="Eliminar sesión"
                                                                onClick={() => { setSelectedSession(session); setDeleteDialogOpen(true); }}
                                                                className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors shadow-sm"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {hasMore && (
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 20)}
                                    className="bg-white hover:bg-gray-50 text-gray-600 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm border border-gray-100 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Ver más sesiones
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {modalOpen && canEdit && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5">
                        <h2 className="text-2xl font-black text-gray-900">
                            {selectedSession ? 'Editar Sesión' : 'Nueva Sesión de Aparato'}
                        </h2>

                        <div>
                            <label htmlFor="aparato-date" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Fecha *</label>
                            <input
                                id="aparato-date"
                                type="date"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                            />
                        </div>

                        <div>
                            <label htmlFor="aparato-treatment" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Tratamiento *</label>
                            <select
                                id="aparato-treatment"
                                value={form.treatment}
                                onChange={e => setForm(f => ({ ...f, treatment: e.target.value as AparatoTreatment }))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none font-medium bg-white"
                            >
                                {APARATO_TREATMENTS.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="aparato-professional" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Profesional *</label>
                            <select
                                id="aparato-professional"
                                value={form.professionalId}
                                onChange={e => handleProfessionalChange(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none font-medium bg-white"
                            >
                                <option value="">Seleccionar...</option>
                                {professionals.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {selectedSession?.status === 'completed' && (
                            <>
                                <div>
                                    <label htmlFor="aparato-fixed-fee" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Monto Fijo del Profesional</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            id="aparato-fixed-fee"
                                            type="number"
                                            min="0"
                                            value={form.fixedFee}
                                            onChange={e => setForm(f => ({ ...f, fixedFee: e.target.value }))}
                                            placeholder="0"
                                            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="aparato-payment-method" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Método de Pago</label>
                                    <select
                                        id="aparato-payment-method"
                                        value={form.paymentMethod}
                                        onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value as any }))}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none font-medium bg-white"
                                    >
                                        {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {(form.paymentMethod === 'transfer' || form.paymentMethod === 'qr' || form.paymentMethod === 'debit') && (
                                    <div>
                                        <label htmlFor="aparato-bank" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Cuenta de Salida</label>
                                        <select
                                            id="aparato-bank"
                                            value={form.bankAccount}
                                            onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value as any }))}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none font-medium bg-white"
                                        >
                                            <option value="">Seleccionar cuenta...</option>
                                            <option value="cuenta1">Cuenta 1 (Efectivo/Principal)</option>
                                            <option value="cuenta2">Cuenta 2 (Secundaria)</option>
                                        </select>
                                    </div>
                                )}
                            </>
                        )}

                        <div>
                            <label htmlFor="aparato-notes" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Notas</label>
                            <textarea
                                id="aparato-notes"
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                rows={2}
                                placeholder="Observaciones opcionales..."
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none font-medium resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="flex-1 py-3 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {selectedSession ? 'Guardar Cambios' : 'Registrar Sesión'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Session Modal */}
            {closeModalOpen && canEdit && selectedSession && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-[#34baab]/20 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-[#34baab]" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900">
                                Cerrar Sesión
                            </h2>
                        </div>

                        <p className="text-sm text-gray-500 font-medium">
                            Registrá el pago para <span className="font-bold text-gray-700">{selectedSession.professionalName}</span> por la sesión de <span className="font-bold text-gray-700">{selectedSession.treatment}</span> del {formatDate(selectedSession.date)}.
                        </p>

                        <div className="space-y-4 pt-2">
                            <div>
                                <label htmlFor="close-fixed-fee" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Monto a Pagar *</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        id="close-fixed-fee"
                                        type="number"
                                        min="0"
                                        value={form.fixedFee}
                                        onChange={e => setForm(f => ({ ...f, fixedFee: e.target.value }))}
                                        placeholder="0"
                                        className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-[#34baab] outline-none font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="close-payment-method" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Método de Pago *</label>
                                <select
                                    id="close-payment-method"
                                    value={form.paymentMethod}
                                    onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value as any }))}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#34baab] outline-none font-medium bg-white"
                                >
                                    {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            {(form.paymentMethod === 'transfer' || form.paymentMethod === 'qr' || form.paymentMethod === 'debit') && (
                                <div>
                                    <label htmlFor="close-bank" className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Cuenta de Salida *</label>
                                    <select
                                        id="close-bank"
                                        value={form.bankAccount}
                                        onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value as any }))}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#34baab] outline-none font-medium bg-white"
                                    >
                                        <option value="">Seleccionar cuenta...</option>
                                        <option value="cuenta1">Cuenta 1 (Efectivo/Principal)</option>
                                        <option value="cuenta2">Cuenta 2 (Secundaria)</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setCloseModalOpen(false)}
                                className="flex-1 py-3 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCloseSession}
                                disabled={closing}
                                className="flex-1 py-3 rounded-2xl bg-[#34baab] hover:bg-[#2da598] text-white font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {closing && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirmar Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal (Styled Card) */}
            {viewModalOpen && selectedSession && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transition-all animate-in fade-in zoom-in duration-300">
                        {/* Header Banner */}
                        <div className={`h-24 ${TREATMENT_COLORS[selectedSession.treatment].split(' ')[0]} flex items-center justify-center relative`}>
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center absolute -bottom-8">
                                <Zap className={`w-8 h-8 ${TREATMENT_COLORS[selectedSession.treatment].split(' ')[1]}`} />
                            </div>
                        </div>

                        <div className="p-8 pt-12 space-y-6">
                            <div className="text-center">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedSession.treatment}</h3>
                                <div className="flex items-center justify-center gap-2 mt-1">
                                    <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-sm font-bold text-gray-500">{formatDate(selectedSession.date)}</span>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Profesional</span>
                                    <span className="text-sm font-bold text-gray-700">{selectedSession.professionalName}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estado</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${selectedSession.status === 'completed' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${selectedSession.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`}>
                                            {selectedSession.status === 'completed' ? 'Completada' : 'Pendiente'}
                                        </span>
                                    </div>
                                </div>
                                {selectedSession.status === 'completed' && (
                                    <>
                                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Monto Abonado</span>
                                            <span className="text-lg font-black text-gray-900">{formatCurrency(selectedSession.fixedFee || 0)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Método</span>
                                            <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                                                {PAYMENT_METHOD_LABELS[selectedSession.paymentMethod || 'cash']}
                                            </span>
                                        </div>
                                        {selectedSession.bankAccount && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cuenta</span>
                                                <span className="text-xs font-bold text-gray-600 italic">
                                                    {selectedSession.bankAccount === 'cuenta1' ? 'Cuenta 1' : 'Cuenta 2'}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {selectedSession.notes && (
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Notas / Observaciones</span>
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                                        <p className="text-xs text-amber-900 italic leading-relaxed">{selectedSession.notes}</p>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setViewModalOpen(false)}
                                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200 active:scale-95"
                            >
                                Cerrar Detalle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DeleteConfirmDialog
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Eliminar Sesión"
                description={`¿Eliminás la sesión de ${selectedSession?.treatment} del ${selectedSession?.date}? Esta acción no se puede deshacer.`}
                loading={deleting}
            />
        </div>
    );
}
