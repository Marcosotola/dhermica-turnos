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
import { AparatoSession, AparatoTreatment, APARATO_TREATMENTS } from '@/lib/types/aparato';
import { Professional } from '@/lib/types/professional';
import { Zap, Plus, Pencil, Trash2, Loader2, CalendarDays, DollarSign } from 'lucide-react';
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
    notes: string;
}

const emptyForm = (): SessionFormData => ({
    date: new Date().toISOString().split('T')[0],
    treatment: 'Definitiva',
    professionalId: '',
    professionalName: '',
    fixedFee: '',
    paymentMethod: 'cash',
    notes: '',
});

export default function AparatosPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [sessions, setSessions] = useState<AparatoSession[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<AparatoSession | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [form, setForm] = useState<SessionFormData>(emptyForm());

    const canEdit = profile?.role === 'admin' || profile?.role === 'secretary';
    const isProfessional = profile?.role === 'professional';

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

    const openEdit = (session: AparatoSession) => {
        setSelectedSession(session);
        setForm({
            date: session.date,
            treatment: session.treatment,
            professionalId: session.professionalId,
            professionalName: session.professionalName,
            fixedFee: String(session.fixedFee),
            paymentMethod: session.paymentMethod,
            notes: session.notes || '',
        });
        setModalOpen(true);
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
            const payload = {
                date: form.date,
                treatment: form.treatment,
                professionalId: form.professionalId,
                professionalName: form.professionalName,
                fixedFee: Number(form.fixedFee),
                paymentMethod: form.paymentMethod,
                notes: form.notes,
            };
            if (selectedSession) {
                await updateAparatoSession(selectedSession.id, payload);
                toast.success('Sesión actualizada');
            } else {
                await createAparatoSession(payload);
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

                {/* List */}
                {sessions.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
                        <Zap className="w-12 h-12 text-amber-300 mx-auto mb-4" />
                        <p className="text-gray-400 font-medium">No hay sesiones registradas.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {sessions.map(session => (
                            <div
                                key={session.id}
                                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all"
                            >
                                {/* Treatment badge */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${TREATMENT_COLORS[session.treatment]}`}>
                                        {session.treatment}
                                    </span>
                                    {canEdit && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEdit(session)}
                                                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-[#34baab] transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedSession(session); setDeleteDialogOpen(true); }}
                                                className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span className="font-bold text-sm">{formatDate(session.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <div className="w-4 h-4 bg-[#34baab]/20 rounded-full flex items-center justify-center shrink-0">
                                            <div className="w-2 h-2 bg-[#34baab] rounded-full" />
                                        </div>
                                        <span className="text-sm text-gray-600">{session.professionalName}</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                        <span className="text-xs text-gray-400 font-medium uppercase tracking-widest">
                                            {PAYMENT_METHOD_LABELS[session.paymentMethod]}
                                        </span>
                                        {session.fixedFee > 0 ? (
                                            <span className="text-lg font-black text-amber-600">
                                                {formatCurrency(session.fixedFee)}
                                            </span>
                                        ) : (
                                            <span className="text-sm font-bold text-gray-400 italic">Pendiente</span>
                                        )}
                                    </div>
                                    {session.notes && (
                                        <p className="text-xs text-gray-400 italic mt-1">{session.notes}</p>
                                    )}
                                </div>
                            </div>
                        ))}
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
                            <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Fecha *</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Tratamiento *</label>
                            <select
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
                            <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Profesional *</label>
                            <select
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

                        <div>
                            <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Monto Fijo del Profesional</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
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
                            <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Método de Pago</label>
                            <select
                                value={form.paymentMethod}
                                onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value as typeof form.paymentMethod }))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none font-medium bg-white"
                            >
                                {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Notas</label>
                            <textarea
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
