'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Gift, Plus, Search, ChevronDown, ChevronUp, Trash2,
    Pencil, XCircle, CheckCircle2, Clock, AlertCircle, X, MessageCircle, Calendar
} from 'lucide-react';
import { GiftCardDownloadButton } from '@/components/clients/GiftCardDownloadButton';
import { ClientNameAutocomplete } from '@/components/ui/ClientNameAutocomplete';
import { GiftCard, GiftCardStatus } from '@/lib/types/giftCard';
import {
    getAllGiftCards, createGiftCard, updateGiftCard, deleteGiftCard,
    updateGiftCardStatus, generateGiftCardCode, defaultExpiryDate
} from '@/lib/firebase/giftCards';
import { formatArgentineCurrency } from '@/lib/utils/currency';
import { formatPaymentMethod } from '@/lib/utils/clientLedger';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'sonner';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    debit: 'Débito',
    credit: 'Crédito',
    qr: 'QR',
};

const STATUS_CONFIG: Record<GiftCardStatus, { label: string; icon: any; class: string }> = {
    active: { label: 'Activa', icon: CheckCircle2, class: 'text-teal-600 bg-teal-50 border-teal-200' },
    partially_used: { label: 'Uso parcial', icon: Clock, class: 'text-blue-600 bg-blue-50 border-blue-200' },
    redeemed: { label: 'Usada', icon: CheckCircle2, class: 'text-gray-500 bg-gray-50 border-gray-200' },
    cancelled: { label: 'Cancelada', icon: XCircle, class: 'text-red-500 bg-red-50 border-red-200' },
    expired: { label: 'Vencida', icon: AlertCircle, class: 'text-amber-600 bg-amber-50 border-amber-200' },
};

type FilterStatus = 'all' | GiftCardStatus;

interface CreateFormState {
    purchaserName: string;
    purchaserClientId: string;
    recipientName: string;
    message: string;
    amount: string;
    purchaseMethod: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    bankAccount: 'cuenta1' | 'cuenta2';
    expiryDate: string;
    notes: string;
}

function getEmptyForm(): CreateFormState {
    return {
        purchaserName: '',
        purchaserClientId: '',
        recipientName: '',
        message: '',
        amount: '',
        purchaseMethod: 'cash',
        bankAccount: 'cuenta1',
        expiryDate: defaultExpiryDate(),
        notes: '',
    };
}

function formatDate(d?: string) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
}

function todayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function GiftCardsPage() {
    const { profile } = useAuth();
    const role = profile?.role || 'client';
    const canManage = role === 'admin' || role === 'secretary';

    const [cards, setCards] = useState<GiftCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [form, setForm] = useState<CreateFormState>(getEmptyForm);
    const [creating, setCreating] = useState(false);
    const [editingCard, setEditingCard] = useState<GiftCard | null>(null);
    const [editForm, setEditForm] = useState<CreateFormState>(getEmptyForm);
    const [saving, setSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const today = todayString();

    const fetchCards = useCallback(async () => {
        setLoading(true);
        try {
            const all = await getAllGiftCards();
            // Marcar las vencidas activas/parciales como expired en la vista
            setCards(all.map(c => {
                if ((c.status === 'active' || c.status === 'partially_used') && c.expiryDate && c.expiryDate < today) {
                    return { ...c, status: 'expired' as GiftCardStatus };
                }
                return c;
            }));
        } catch {
            toast.error('Error al cargar las gift cards');
        } finally {
            setLoading(false);
        }
    }, [today]);

    useEffect(() => { fetchCards(); }, [fetchCards]);

    const filteredCards = cards.filter(c => {
        const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
        const q = search.toLowerCase();
        const matchesSearch = !q || [c.code, c.purchaserName, c.recipientName, c.message].some(f => f?.toLowerCase().includes(q));
        return matchesStatus && matchesSearch;
    });

    // Estadísticas
    const totalSold = cards.reduce((s, c) => s + c.originalAmount, 0);
    const totalRedeemed = cards.reduce((s, c) => s + (c.originalAmount - c.remainingBalance), 0);
    const outstanding = cards.filter(c => c.status === 'active' || c.status === 'partially_used').reduce((s, c) => s + c.remainingBalance, 0);
    const activeCount = cards.filter(c => c.status === 'active' || c.status === 'partially_used').length;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(form.amount);
        if (!amount || amount <= 0) { toast.error('Ingresá un monto válido'); return; }
        if (!form.purchaserName.trim()) { toast.error('Ingresá el nombre del comprador'); return; }
        setCreating(true);
        try {
            await createGiftCard({
                code: generateGiftCardCode(),
                originalAmount: amount,
                remainingBalance: amount,
                purchaserClientId: form.purchaserClientId || undefined,
                purchaserName: form.purchaserName.trim(),
                recipientName: form.recipientName || undefined,
                message: form.message || undefined,
                purchaseMethod: form.purchaseMethod,
                bankAccount: form.purchaseMethod === 'transfer' ? form.bankAccount : null,
                status: 'active',
                expiryDate: form.expiryDate || undefined,
                notes: form.notes || undefined,
                createdBy: profile?.uid,
            });
            toast.success('Gift card creada');
            setForm(getEmptyForm());
            setShowCreateForm(false);
            fetchCards();
        } catch (err) {
            console.error(err);
            toast.error('Error al crear la gift card');
        } finally {
            setCreating(false);
        }
    };

    const handleEditOpen = (card: GiftCard) => {
        setEditingCard(card);
        setEditForm({
            purchaserName: card.purchaserName,
            purchaserClientId: card.purchaserClientId || '',
            recipientName: card.recipientName || '',
            message: card.message || '',
            amount: String(card.originalAmount),
            purchaseMethod: card.purchaseMethod || 'cash',
            bankAccount: (card.bankAccount as 'cuenta1' | 'cuenta2') || 'cuenta1',
            expiryDate: card.expiryDate || '',
            notes: card.notes || '',
        });
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCard) return;
        const amount = parseFloat(editForm.amount);
        if (!amount || amount <= 0) { toast.error('Monto inválido'); return; }
        setSaving(true);
        try {
            await updateGiftCard(editingCard.id, {
                purchaserName: editForm.purchaserName.trim(),
                recipientName: editForm.recipientName || undefined,
                message: editForm.message || undefined,
                purchaseMethod: editForm.purchaseMethod,
                bankAccount: editForm.purchaseMethod === 'transfer' ? editForm.bankAccount : null,
                expiryDate: editForm.expiryDate || undefined,
                notes: editForm.notes || undefined,
            });
            toast.success('Gift card actualizada');
            setEditingCard(null);
            fetchCards();
        } catch (err) {
            console.error(err);
            toast.error('Error al guardar cambios');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async (card: GiftCard) => {
        setCancellingId(card.id);
        try {
            await updateGiftCardStatus(card.id, 'cancelled');
            toast.success(`Gift card ${card.code} cancelada`);
            fetchCards();
        } catch {
            toast.error('Error al cancelar');
        } finally {
            setCancellingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await deleteGiftCard(id);
            toast.success('Gift card eliminada');
            setConfirmDeleteId(null);
            fetchCards();
        } catch {
            toast.error('Error al eliminar');
        } finally {
            setDeletingId(null);
        }
    };

    const statusFilters: { value: FilterStatus; label: string }[] = [
        { value: 'all', label: 'Todas' },
        { value: 'active', label: 'Activas' },
        { value: 'partially_used', label: 'Parciales' },
        { value: 'redeemed', label: 'Usadas' },
        { value: 'expired', label: 'Vencidas' },
        { value: 'cancelled', label: 'Canceladas' },
    ];

    return (
        <main className="min-h-screen bg-gray-50 pb-28 lg:pl-64">
            <div className="max-w-3xl mx-auto px-4 pt-8 space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                        <Gift className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 leading-none">Gift Cards</h1>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">Gestión de tarjetas de regalo</p>
                    </div>
                </div>
                {canManage && (
                    <Button
                        onClick={() => setShowCreateForm(v => !v)}
                        className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-black rounded-2xl px-4 py-2.5 flex items-center gap-2 w-fit"
                    >
                        <Plus className="w-4 h-4" /> Nueva Gift Card
                    </Button>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Activas', value: activeCount, unit: '', color: 'text-teal-600' },
                        { label: 'Vendidas', value: `$${formatArgentineCurrency(totalSold)}`, unit: '', color: 'text-gray-900' },
                        { label: 'Redimido', value: `$${formatArgentineCurrency(totalRedeemed)}`, unit: '', color: 'text-blue-600' },
                        { label: 'En circulación', value: `$${formatArgentineCurrency(outstanding)}`, unit: '', color: 'text-amber-600' },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className={`text-lg font-black ${stat.color} leading-none`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Formulario de creación */}
                {showCreateForm && canManage && (
                    <form onSubmit={handleCreate} className="bg-white border border-teal-100 rounded-3xl p-5 space-y-4 shadow-sm animate-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                            <p className="font-black text-gray-900 text-sm uppercase tracking-wider">Nueva Gift Card</p>
                            <button type="button" onClick={() => setShowCreateForm(false)} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="gc-amount" className="block text-xs font-medium text-gray-600 mb-1">Monto ($) *</label>
                                <input id="gc-amount" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" min={1} required className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-teal-400 text-gray-900" />
                            </div>
                            <div>
                                <label htmlFor="gc-expiry" className="block text-xs font-medium text-gray-600 mb-1">Vence (60 días por defecto)</label>
                                <input id="gc-expiry" type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} title="Fecha de vencimiento" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-teal-400 text-gray-700" />
                            </div>
                        </div>

                        <div>
                            <ClientNameAutocomplete
                                id="gc-purchaser"
                                label="Comprador"
                                value={form.purchaserName}
                                clientId={form.purchaserClientId}
                                onChange={(name, clientId) => setForm(f => ({ ...f, purchaserName: name, purchaserClientId: clientId || '' }))}
                                placeholder="Nombre de quien compra la gift card"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="gc-recipient" className="block text-xs font-medium text-gray-600 mb-1">Para (destinatario, opcional)</label>
                            <input id="gc-recipient" type="text" value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} placeholder="Nombre de quien recibe el regalo" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-teal-400 text-gray-900" />
                        </div>

                        <div>
                            <label htmlFor="gc-message" className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" /> Mensaje personalizado (opcional)
                            </label>
                            <input id="gc-message" type="text" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Ej: ¡Feliz cumple! Te lo mereces" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-teal-400 text-gray-900" />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago</label>
                            <div className="flex flex-wrap gap-1.5">
                                {(Object.entries(PAYMENT_METHOD_LABELS) as [NonNullable<CreateFormState['purchaseMethod']>, string][]).map(([val, lbl]) => (
                                    <button key={val} type="button" onClick={() => setForm(f => ({ ...f, purchaseMethod: val }))}
                                        className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors ${form.purchaseMethod === val ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                        {lbl}
                                    </button>
                                ))}
                            </div>
                            {form.purchaseMethod === 'transfer' && (
                                <div className="flex gap-1.5 mt-2">
                                    {(['cuenta1', 'cuenta2'] as const).map(acc => (
                                        <button key={acc} type="button" onClick={() => setForm(f => ({ ...f, bankAccount: acc }))}
                                            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors ${form.bankAccount === acc ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                            {acc === 'cuenta1' ? 'Cuenta Brubank' : 'Cuenta Reba'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="gc-notes" className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
                            <textarea id="gc-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Observaciones adicionales..." className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-teal-400 text-gray-900 resize-none" />
                        </div>

                        <div className="flex gap-2">
                            <Button type="submit" disabled={creating} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white text-sm py-2.5 rounded-xl">
                                {creating ? 'Creando...' : 'Crear Gift Card'}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => { setShowCreateForm(false); setForm(getEmptyForm()); }} className="flex-1 text-sm py-2.5 rounded-xl">
                                Cancelar
                            </Button>
                        </div>
                    </form>
                )}

                {/* Filtros y búsqueda */}
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por código, comprador, destinatario..."
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-2xl text-sm bg-white focus:outline-none focus:border-teal-400 text-gray-900"
                        />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {statusFilters.map(f => (
                            <button
                                key={f.value}
                                type="button"
                                onClick={() => setFilterStatus(f.value)}
                                className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors ${filterStatus === f.value ? 'bg-teal-500 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-teal-300'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lista */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse h-20" />
                        ))}
                    </div>
                ) : filteredCards.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Gift className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                        <p className="text-sm font-medium">No hay gift cards{filterStatus !== 'all' ? ' con ese estado' : ''}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredCards.map(card => (
                            <GiftCardListItem
                                key={card.id}
                                card={card}
                                canManage={canManage}
                                cancellingId={cancellingId}
                                onEdit={() => handleEditOpen(card)}
                                onCancel={() => handleCancel(card)}
                                onDelete={() => setConfirmDeleteId(card.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de edición */}
            {editingCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <form onSubmit={handleEditSave} className="bg-white rounded-3xl shadow-2xl p-5 w-full max-w-sm space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <p className="font-black text-gray-900 text-sm uppercase tracking-wider">Editar Gift Card</p>
                            <span className="font-mono text-xs text-gray-400">{editingCard.code}</span>
                        </div>

                        <div>
                            <label htmlFor="edit-purchaser" className="block text-xs font-medium text-gray-600 mb-1">Comprador</label>
                            <ClientNameAutocomplete
                                id="edit-purchaser"
                                value={editForm.purchaserName}
                                clientId={editForm.purchaserClientId}
                                onChange={(name, clientId) => setEditForm(f => ({ ...f, purchaserName: name, purchaserClientId: clientId || '' }))}
                                placeholder="Nombre del comprador"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="edit-recipient" className="block text-xs font-medium text-gray-600 mb-1">Para (destinatario)</label>
                            <input id="edit-recipient" type="text" value={editForm.recipientName} onChange={e => setEditForm(f => ({ ...f, recipientName: e.target.value }))} placeholder="Nombre del destinatario" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-400 text-gray-900" />
                        </div>

                        <div>
                            <label htmlFor="edit-message" className="block text-xs font-medium text-gray-600 mb-1">Mensaje</label>
                            <input id="edit-message" type="text" value={editForm.message} onChange={e => setEditForm(f => ({ ...f, message: e.target.value }))} placeholder="Mensaje personalizado" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-400 text-gray-900" />
                        </div>

                        <div>
                            <label htmlFor="edit-expiry" className="block text-xs font-medium text-gray-600 mb-1">Vence</label>
                            <input id="edit-expiry" type="date" value={editForm.expiryDate} onChange={e => setEditForm(f => ({ ...f, expiryDate: e.target.value }))} title="Fecha de vencimiento" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-400 text-gray-700" />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago</label>
                            <div className="flex flex-wrap gap-1.5">
                                {(Object.entries(PAYMENT_METHOD_LABELS) as [NonNullable<CreateFormState['purchaseMethod']>, string][]).map(([val, lbl]) => (
                                    <button key={val} type="button" onClick={() => setEditForm(f => ({ ...f, purchaseMethod: val }))}
                                        className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors ${editForm.purchaseMethod === val ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                        {lbl}
                                    </button>
                                ))}
                            </div>
                            {editForm.purchaseMethod === 'transfer' && (
                                <div className="flex gap-1.5 mt-2">
                                    {(['cuenta1', 'cuenta2'] as const).map(acc => (
                                        <button key={acc} type="button" onClick={() => setEditForm(f => ({ ...f, bankAccount: acc }))}
                                            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors ${editForm.bankAccount === acc ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                            {acc === 'cuenta1' ? 'Cuenta Brubank' : 'Cuenta Reba'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="edit-notes" className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                            <textarea id="edit-notes" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Observaciones adicionales..." className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-400 text-gray-900 resize-none" />
                        </div>

                        <div className="flex gap-2">
                            <Button type="submit" disabled={saving} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white text-sm py-2 rounded-xl">
                                {saving ? 'Guardando...' : 'Guardar cambios'}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setEditingCard(null)} className="flex-1 text-sm py-2 rounded-xl">
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Confirmar eliminación */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900">Eliminar gift card</h3>
                                <p className="text-xs text-gray-500">Esta acción no se puede deshacer</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                                Cancelar
                            </button>
                            <button type="button" onClick={() => handleDelete(confirmDeleteId)} disabled={deletingId === confirmDeleteId}
                                className="flex-1 px-4 py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50">
                                {deletingId === confirmDeleteId ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

interface GiftCardListItemProps {
    card: GiftCard;
    canManage: boolean;
    cancellingId: string | null;
    onEdit: () => void;
    onCancel: () => void;
    onDelete: () => void;
}

function GiftCardListItem({ card, canManage, cancellingId, onEdit, onCancel, onDelete }: GiftCardListItemProps) {
    const [showHistory, setShowHistory] = useState(false);
    const cfg = STATUS_CONFIG[card.status] || STATUS_CONFIG.active;
    const StatusIcon = cfg.icon;
    const isActive = card.status === 'active' || card.status === 'partially_used';

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-gray-800">{card.code}</span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.class}`}>
                                <StatusIcon className="w-3 h-3" />
                                {cfg.label}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500">
                            Comprador: <span className="font-semibold text-gray-700">{card.purchaserName}</span>
                            {card.recipientName && <> · Para: <span className="font-semibold text-gray-700">{card.recipientName}</span></>}
                        </p>
                        {card.message && (
                            <p className="text-xs text-gray-400 italic">"{card.message}"</p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-gray-400">
                                Saldo: <span className={`font-bold ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>
                                    $ {formatArgentineCurrency(card.remainingBalance)}
                                </span>
                                {card.remainingBalance !== card.originalAmount && (
                                    <span className="text-gray-400"> de $ {formatArgentineCurrency(card.originalAmount)}</span>
                                )}
                            </span>
                            {card.createdAt && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Creada {card.createdAt.toLocaleDateString('es-AR')}
                                </span>
                            )}
                            {card.expiryDate && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Vence {formatDate(card.expiryDate)}
                                </span>
                            )}
                            {card.purchaseMethod && (
                                <span className="text-xs text-gray-400">{formatPaymentMethod(card.purchaseMethod)}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Descargar — teal */}
                        <GiftCardDownloadButton
                            card={card}
                            variant="full"
                            className="text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200"
                        />
                        {canManage && (
                            <>
                                {/* Editar — azul */}
                                <button type="button" onClick={onEdit} title="Editar"
                                    className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-700 border border-blue-200 transition-colors">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                {/* Cancelar — naranja */}
                                {isActive && (
                                    <button type="button" onClick={onCancel} disabled={cancellingId === card.id} title="Cancelar gift card"
                                        className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-500 hover:text-amber-700 border border-amber-200 transition-colors disabled:opacity-50">
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                )}
                                {/* Eliminar — rojo */}
                                <button type="button" onClick={onDelete} title="Eliminar"
                                    className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 border border-red-200 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Historial de usos */}
            {card.redemptions?.length > 0 && (
                <div className="border-t border-gray-50">
                    <button
                        type="button"
                        onClick={() => setShowHistory(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
                    >
                        <span className="font-bold">{card.redemptions.length} uso{card.redemptions.length > 1 ? 's' : ''}</span>
                        {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {showHistory && (
                        <div className="px-4 pb-3 space-y-1.5">
                            {card.redemptions.map((r, i) => (
                                <div key={i} className="flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-teal-500 shrink-0" />
                                        <span>{formatDate(r.date)}{r.recipientName && ` · ${r.recipientName}`}</span>
                                    </div>
                                    <span className="font-bold text-gray-700">$ {formatArgentineCurrency(r.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
