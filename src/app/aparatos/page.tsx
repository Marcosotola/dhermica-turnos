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
import { AparatoSession, AparatoPayment, AparatoTreatment, APARATO_TREATMENTS } from '@/lib/types/aparato';
import { Professional } from '@/lib/types/professional';
import { Zap, Plus, Pencil, Trash2, Loader2, CalendarDays, DollarSign, CheckCircle2, Eye, Search, Filter, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { formatCurrencyWithSymbol } from '@/lib/utils/currency';
import { formatPaymentMethod } from '@/lib/utils/clientLedger';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    debit: 'T. Débito',
    credit: 'T. Crédito',
    qr: 'QR / Digital',
};

const TREATMENT_COLORS: Record<AparatoTreatment, string> = {
    Definitiva: 'bg-red-100 text-red-700 border-red-200',
    HiFu: 'bg-orange-100 text-orange-700 border-orange-200',
    Liposonix: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

interface AparatoFormPayment {
    id: string;
    method: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    amount: string;
    bankAccount?: 'cuenta1' | 'cuenta2' | null;
}

interface SessionFormData {
    date: string;
    treatment: AparatoTreatment;
    professionalId: string;
    professionalName: string;
    fixedFee: string;
    paymentMethod: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    bankAccount: 'cuenta1' | 'cuenta2' | '';
    payments: AparatoFormPayment[];
    notes: string;
}

const emptyPayment = (): AparatoFormPayment => ({
    id: Date.now().toString(),
    method: 'cash',
    amount: '',
    bankAccount: null,
});

const emptyForm = (): SessionFormData => ({
    date: new Date().toISOString().split('T')[0],
    treatment: 'Definitiva',
    professionalId: '',
    professionalName: '',
    fixedFee: '',
    paymentMethod: 'cash',
    bankAccount: '',
    payments: [emptyPayment()],
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

    const paymentsToForm = (session: AparatoSession): AparatoFormPayment[] =>
        session.payments && session.payments.length > 0
            ? session.payments.map(p => ({
                id: p.id || Math.random().toString(),
                method: p.method,
                amount: String(p.amount),
                bankAccount: p.bankAccount,
            }))
            : session.fixedFee
                ? [{
                    id: Date.now().toString(),
                    method: session.paymentMethod || 'cash',
                    amount: String(session.fixedFee),
                    bankAccount: session.bankAccount,
                }]
                : [emptyPayment()];

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
            payments: paymentsToForm(session),
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
            payments: paymentsToForm(session),
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

            // Solo incluimos campos de pago si estamos editando una sesión ya completada
            if (selectedSession?.status === 'completed') {
                const payments: AparatoPayment[] = form.payments
                    .filter(p => Number(p.amount) > 0)
                    .map(p => ({
                        id: p.id,
                        method: p.method,
                        amount: Number(p.amount),
                        bankAccount: p.method !== 'cash' ? (p.bankAccount || 'cuenta1') : null,
                    }));
                payload.fixedFee = payments.reduce((sum, p) => sum + p.amount, 0);
                payload.payments = payments;
                payload.paymentMethod = payments[0]?.method || 'cash';
                payload.bankAccount = payments[0]?.bankAccount || null;
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
        if (!selectedSession) return;

        const totalAmount = form.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const hasInvalidPayment = form.payments.some(p =>
            !p.amount || Number(p.amount) <= 0 ||
            ((p.method === 'transfer' || p.method === 'qr' || p.method === 'debit') && !p.bankAccount)
        );

        if (form.payments.length === 0 || totalAmount <= 0 || hasInvalidPayment) {
            toast.error('Completá el monto y el método de pago de cada pago');
            return;
        }

        setClosing(true);
        try {
            const payments: AparatoPayment[] = form.payments.map(p => ({
                id: p.id,
                method: p.method,
                amount: Number(p.amount),
                bankAccount: p.method !== 'cash' ? (p.bankAccount || 'cuenta1') : null,
            }));

            // 1. Crear el Egreso
            const expenseId = await createEgreso({
                date: form.date,
                category: 'sueldos',
                amount: totalAmount,
                description: `Pago profesional: ${form.professionalName} - Sesión Aparato (${form.treatment})`,
                payments,
                paymentMethod: payments[0].method,
                bankAccount: payments[0].bankAccount,
            });

            // 2. Actualizar la Sesión
            await updateAparatoSession(selectedSession.id, {
                status: 'completed',
                fixedFee: totalAmount,
                paymentMethod: payments[0].method,
                bankAccount: payments[0].bankAccount,
                payments,
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

    const formatCurrency = formatCurrencyWithSymbol;

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
                                                                {session.payments && session.payments.length > 1
                                                                    ? `${session.payments.length} métodos`
                                                                    : formatPaymentMethod(session.paymentMethod || 'cash')}
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
                            <div className="border-t border-gray-100 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-500">Desglose de Pagos</label>
                                    <button
                                        onClick={() => setForm(f => ({ ...f, payments: [...f.payments, emptyPayment()] }))}
                                        className="text-[10px] font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 text-gray-600"
                                    >
                                        <Plus className="w-3 h-3" /> Agregar Pago
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {form.payments.map((p, idx) => (
                                        <div key={p.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative">
                                            {form.payments.length > 1 && (
                                                <button
                                                    aria-label="Eliminar pago"
                                                    onClick={() => setForm(f => ({ ...f, payments: f.payments.filter(pay => pay.id !== p.id) }))}
                                                    className="absolute -top-2 -right-2 bg-white border border-gray-200 text-red-500 p-1.5 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label htmlFor={`edit-method-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Medio</label>
                                                    <select
                                                        id={`edit-method-${idx}`}
                                                        value={p.method}
                                                        onChange={e => {
                                                            const newPayments = [...form.payments];
                                                            newPayments[idx] = { ...newPayments[idx], method: e.target.value as any };
                                                            if (e.target.value === 'cash') newPayments[idx].bankAccount = null;
                                                            setForm(f => ({ ...f, payments: newPayments }));
                                                        }}
                                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                                    >
                                                        {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                                                            <option key={val} value={val}>{label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor={`edit-amount-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Monto</label>
                                                    <input
                                                        id={`edit-amount-${idx}`}
                                                        type="number"
                                                        min="0"
                                                        value={p.amount}
                                                        onChange={e => {
                                                            const newPayments = [...form.payments];
                                                            newPayments[idx] = { ...newPayments[idx], amount: e.target.value };
                                                            setForm(f => ({ ...f, payments: newPayments }));
                                                        }}
                                                        placeholder="0"
                                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                                    />
                                                </div>
                                            </div>

                                            {p.method !== 'cash' && (
                                                <div className="mt-3">
                                                    <label htmlFor={`edit-account-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Cuenta</label>
                                                    <select
                                                        id={`edit-account-${idx}`}
                                                        value={p.bankAccount || 'cuenta1'}
                                                        onChange={e => {
                                                            const newPayments = [...form.payments];
                                                            newPayments[idx] = { ...newPayments[idx], bankAccount: e.target.value as any };
                                                            setForm(f => ({ ...f, payments: newPayments }));
                                                        }}
                                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                                    >
                                                        <option value="cuenta1">Cuenta 1</option>
                                                        <option value="cuenta2">Cuenta 2</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-between items-center px-1 mt-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total:</span>
                                    <span className="text-sm font-black text-amber-600">
                                        {formatCurrency(form.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0))}
                                    </span>
                                </div>
                            </div>
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

                        <div className="pt-2 max-h-[50vh] overflow-y-auto pr-1 -mr-1">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-500">Desglose de Pagos *</label>
                                <button
                                    onClick={() => setForm(f => ({ ...f, payments: [...f.payments, emptyPayment()] }))}
                                    className="text-[10px] font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 text-gray-600"
                                >
                                    <Plus className="w-3 h-3" /> Agregar Pago
                                </button>
                            </div>

                            <div className="space-y-3">
                                {form.payments.map((p, idx) => (
                                    <div key={p.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative">
                                        {form.payments.length > 1 && (
                                            <button
                                                aria-label="Eliminar pago"
                                                onClick={() => setForm(f => ({ ...f, payments: f.payments.filter(pay => pay.id !== p.id) }))}
                                                className="absolute -top-2 -right-2 bg-white border border-gray-200 text-red-500 p-1.5 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label htmlFor={`close-method-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Medio</label>
                                                <select
                                                    id={`close-method-${idx}`}
                                                    value={p.method}
                                                    onChange={e => {
                                                        const newPayments = [...form.payments];
                                                        newPayments[idx] = { ...newPayments[idx], method: e.target.value as any };
                                                        if (e.target.value === 'cash') newPayments[idx].bankAccount = null;
                                                        setForm(f => ({ ...f, payments: newPayments }));
                                                    }}
                                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-white"
                                                >
                                                    {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                                                        <option key={val} value={val}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor={`close-amount-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Monto</label>
                                                <input
                                                    id={`close-amount-${idx}`}
                                                    type="number"
                                                    min="0"
                                                    value={p.amount}
                                                    onChange={e => {
                                                        const newPayments = [...form.payments];
                                                        newPayments[idx] = { ...newPayments[idx], amount: e.target.value };
                                                        setForm(f => ({ ...f, payments: newPayments }));
                                                    }}
                                                    placeholder="0"
                                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-white"
                                                />
                                            </div>
                                        </div>

                                        {p.method !== 'cash' && (
                                            <div className="mt-3">
                                                <label htmlFor={`close-account-${idx}`} className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Cuenta</label>
                                                <select
                                                    id={`close-account-${idx}`}
                                                    value={p.bankAccount || 'cuenta1'}
                                                    onChange={e => {
                                                        const newPayments = [...form.payments];
                                                        newPayments[idx] = { ...newPayments[idx], bankAccount: e.target.value as any };
                                                        setForm(f => ({ ...f, payments: newPayments }));
                                                    }}
                                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#34baab] bg-white"
                                                >
                                                    <option value="cuenta1">Cuenta 1</option>
                                                    <option value="cuenta2">Cuenta 2</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total a Pagar:</span>
                            <span className="text-lg font-black text-[#34baab]">
                                {formatCurrency(form.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0))}
                            </span>
                        </div>

                        <div className="flex gap-3 pt-2">
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
                                        {selectedSession.payments && selectedSession.payments.length > 1 ? (
                                            <div className="space-y-1.5">
                                                {selectedSession.payments.map((p, idx) => (
                                                    <div key={p.id || idx} className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                                                            {formatPaymentMethod(p.method)}
                                                            {p.bankAccount && ` (${p.bankAccount === 'cuenta1' ? 'Cta 1' : 'Cta 2'})`}
                                                        </span>
                                                        <span className="text-xs font-bold text-gray-600">{formatCurrency(p.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Método</span>
                                                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                                                        {formatPaymentMethod(selectedSession.paymentMethod || 'cash')}
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
