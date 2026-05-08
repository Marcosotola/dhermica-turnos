'use client';

import { useState } from 'react';
import { Gift, Plus, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, History, Pencil, Trash2 } from 'lucide-react';
import { GiftCard } from '@/lib/types/giftCard';
import { createGiftCard, updateGiftCard, deleteGiftCard, updateGiftCardStatus, generateGiftCardCode } from '@/lib/firebase/giftCards';
import { formatArgentineCurrency } from '@/lib/utils/currency';
import { Button } from '../ui/Button';
import { toast } from 'sonner';

interface GiftCardSectionProps {
    clientId: string;
    clientName: string;
    giftCards: GiftCard[];
    onRefresh: () => void;
    createdBy?: string;
}


function formatDate(d?: string): string {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
}

function todayString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    debit: 'Débito',
    credit: 'Crédito',
    qr: 'QR',
};

interface CreateFormState {
    amount: string;
    purchaseMethod: 'cash' | 'transfer' | 'debit' | 'credit' | 'qr';
    bankAccount: 'cuenta1' | 'cuenta2';
    purchasedByName: string;
    expiryDate: string;
    notes: string;
}

const EMPTY_FORM: CreateFormState = { amount: '', purchaseMethod: 'cash', bankAccount: 'cuenta1', purchasedByName: '', expiryDate: '', notes: '' };

export function GiftCardSection({ clientId, clientName, giftCards, onRefresh, createdBy }: GiftCardSectionProps) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
    const [creating, setCreating] = useState(false);
    const [redeemingId, setRedeemingId] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);
    const [editingCard, setEditingCard] = useState<GiftCard | null>(null);
    const [editForm, setEditForm] = useState<CreateFormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const activeCards = giftCards.filter(g => g.status === 'active');
    const inactiveCards = giftCards.filter(g => g.status !== 'active');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(form.amount);
        if (!amount || amount <= 0) {
            toast.error('Ingresá un monto válido');
            return;
        }
        setCreating(true);
        try {
            await createGiftCard({
                code: generateGiftCardCode(),
                amount,
                purchaseMethod: form.purchaseMethod,
                bankAccount: form.purchaseMethod === 'transfer' ? form.bankAccount : null,
                clientId,
                clientName,
                purchasedByName: form.purchasedByName || undefined,
                status: 'active',
                expiryDate: form.expiryDate || undefined,
                notes: form.notes || undefined,
                createdBy,
            });
            toast.success('Gift card creada');
            setForm(EMPTY_FORM);
            setShowForm(false);
            onRefresh();
        } catch (err) {
            console.error('Error al crear gift card:', err);
            toast.error('Error al crear la gift card');
        } finally {
            setCreating(false);
        }
    };

    const handleRedeem = async (card: GiftCard) => {
        setRedeemingId(card.id);
        try {
            await updateGiftCardStatus(card.id, 'redeemed', { redeemedDate: todayString() });
            toast.success(`Gift card ${card.code} marcada como usada`);
            onRefresh();
        } catch {
            toast.error('Error al redimir la gift card');
        } finally {
            setRedeemingId(null);
        }
    };

    const handleCancel = async (card: GiftCard) => {
        setRedeemingId(card.id);
        try {
            await updateGiftCardStatus(card.id, 'cancelled');
            toast.success(`Gift card ${card.code} cancelada`);
            onRefresh();
        } catch {
            toast.error('Error al cancelar la gift card');
        } finally {
            setRedeemingId(null);
        }
    };

    const handleEditOpen = (card: GiftCard) => {
        setEditingCard(card);
        setEditForm({
            amount: String(card.amount),
            purchaseMethod: (card.purchaseMethod as CreateFormState['purchaseMethod']) || 'cash',
            bankAccount: (card.bankAccount as 'cuenta1' | 'cuenta2') || 'cuenta1',
            purchasedByName: card.purchasedByName || '',
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
                amount,
                purchaseMethod: editForm.purchaseMethod,
                bankAccount: editForm.purchaseMethod === 'transfer' ? editForm.bankAccount : null,
                purchasedByName: editForm.purchasedByName || undefined,
                expiryDate: editForm.expiryDate || undefined,
                notes: editForm.notes || undefined,
            });
            toast.success('Gift card actualizada');
            setEditingCard(null);
            onRefresh();
        } catch (err) {
            console.error('Error al editar gift card:', err);
            toast.error('Error al guardar cambios');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await deleteGiftCard(id);
            toast.success('Gift card eliminada');
            setConfirmDeleteId(null);
            onRefresh();
        } catch {
            toast.error('Error al eliminar la gift card');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs flex items-center gap-2">
                    <Gift className="w-3.5 h-3.5 text-teal-500" /> Gift Cards
                </h4>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(v => !v)}
                    className="text-teal-600 text-xs"
                >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nueva
                </Button>
            </div>

            {/* Create form */}
            {showForm && (
                <form
                    onSubmit={handleCreate}
                    className="bg-teal-50 border border-teal-200 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2"
                >
                    <p className="text-xs font-bold text-teal-800 uppercase tracking-wider">Nueva Gift Card</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="gc-amount" className="block text-xs font-medium text-gray-600 mb-1">Monto ($)</label>
                            <input
                                id="gc-amount"
                                type="number"
                                value={form.amount}
                                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                placeholder="0"
                                min={1}
                                required
                                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-teal-400 text-gray-900"
                            />
                        </div>
                        <div>
                            <label htmlFor="gc-expiry" className="block text-xs font-medium text-gray-600 mb-1">Vence (opcional)</label>
                            <input
                                id="gc-expiry"
                                type="date"
                                value={form.expiryDate}
                                onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-teal-400 text-gray-700"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago</label>
                        <div className="flex flex-wrap gap-1.5">
                            {(Object.entries(PAYMENT_METHOD_LABELS) as [NonNullable<CreateFormState['purchaseMethod']>, string][]).map(([val, lbl]) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, purchaseMethod: val }))}
                                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors ${
                                        form.purchaseMethod === val
                                            ? 'bg-teal-500 text-white'
                                            : 'bg-white border border-gray-200 text-gray-500 hover:border-teal-300'
                                    }`}
                                >
                                    {lbl}
                                </button>
                            ))}
                        </div>
                        {form.purchaseMethod === 'transfer' && (
                            <div className="flex gap-1.5 mt-2">
                                {(['cuenta1', 'cuenta2'] as const).map(acc => (
                                    <button
                                        key={acc}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, bankAccount: acc }))}
                                        className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors ${
                                            form.bankAccount === acc
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-white border border-gray-200 text-gray-500 hover:border-teal-300'
                                        }`}
                                    >
                                        {acc === 'cuenta1' ? 'Cuenta 1' : 'Cuenta 2'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="gc-buyer" className="block text-xs font-medium text-gray-600 mb-1">Comprada por (opcional)</label>
                        <input
                            id="gc-buyer"
                            type="text"
                            value={form.purchasedByName}
                            onChange={e => setForm(f => ({ ...f, purchasedByName: e.target.value }))}
                            placeholder="Nombre de quien la compró"
                            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-teal-400 text-gray-900"
                        />
                    </div>
                    <div>
                        <label htmlFor="gc-notes" className="block text-xs font-medium text-gray-600 mb-1">Observaciones (opcional)</label>
                        <textarea
                            id="gc-notes"
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            rows={2}
                            placeholder="Notas adicionales..."
                            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-teal-400 text-gray-900 resize-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" disabled={creating} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white text-sm py-2 rounded-xl">
                            {creating ? 'Creando...' : 'Crear Gift Card'}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="flex-1 text-sm py-2 rounded-xl">
                            Cancelar
                        </Button>
                    </div>
                </form>
            )}

            {/* Active cards */}
            {activeCards.length === 0 && !showForm && (
                <p className="text-xs text-gray-400 text-center py-3">Sin gift cards activas</p>
            )}

            {activeCards.map(card => (
                <GiftCardRow
                    key={card.id}
                    card={card}
                    onRedeem={() => handleRedeem(card)}
                    onCancel={() => handleCancel(card)}
                    onEdit={() => handleEditOpen(card)}
                    onDelete={() => setConfirmDeleteId(card.id)}
                    loading={redeemingId === card.id}
                />
            ))}

            {/* Historial colapsable */}
            {inactiveCards.length > 0 && (
                <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <button
                        type="button"
                        onClick={() => setShowAll(v => !v)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-[#34baab]" />
                            <span className="font-bold text-gray-900 text-sm">Historial de Gift Cards</span>
                            <span className="text-xs text-gray-400 font-medium">({inactiveCards.length})</span>
                        </div>
                        {showAll ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>
                    {showAll && (
                        <div className="p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                            {inactiveCards.map(card => (
                                <GiftCardRow
                                    key={card.id}
                                    card={card}
                                    onEdit={() => handleEditOpen(card)}
                                    onDelete={() => setConfirmDeleteId(card.id)}
                                    loading={false}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal de edición */}
            {editingCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <form
                        onSubmit={handleEditSave}
                        className="bg-white rounded-3xl shadow-2xl p-5 w-full max-w-sm space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <p className="font-black text-gray-900 text-sm uppercase tracking-wider">Editar Gift Card</p>
                            <span className="font-mono text-xs text-gray-400">{editingCard.code}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Monto ($)</label>
                                <input type="number" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} min={1} required className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-teal-400 text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Vence (opcional)</label>
                                <input type="date" value={editForm.expiryDate} onChange={e => setEditForm(f => ({ ...f, expiryDate: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-400 text-gray-700" />
                            </div>
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
                                            {acc === 'cuenta1' ? 'Cuenta 1' : 'Cuenta 2'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Comprada por (opcional)</label>
                            <input type="text" value={editForm.purchasedByName} onChange={e => setEditForm(f => ({ ...f, purchasedByName: e.target.value }))} placeholder="Nombre de quien la compró" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-400 text-gray-900" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones (opcional)</label>
                            <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-400 text-gray-900 resize-none" />
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

            {/* Confirmación de eliminación */}
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
        </div>
    );
}

interface GiftCardRowProps {
    card: GiftCard;
    onRedeem?: () => void;
    onCancel?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    loading: boolean;
}

function GiftCardRow({ card, onRedeem, onCancel, onEdit, onDelete, loading }: GiftCardRowProps) {
    const isActive = card.status === 'active';
    const isRedeemed = card.status === 'redeemed';
    const isCancelled = card.status === 'cancelled';
    const isExpired = isActive && card.expiryDate && card.expiryDate < todayString();

    // ── HISTORIAL: flat card con borde izquierdo de color ──
    if (!isActive || isExpired) {
        const leftBorder = isRedeemed ? 'border-l-[#34baab]' : isCancelled ? 'border-l-red-300' : 'border-l-amber-400';
        const BadgeIcon = isRedeemed ? CheckCircle2 : isCancelled ? XCircle : Clock;
        const badgeLabel = isRedeemed ? 'Usada' : isCancelled ? 'Cancelada' : 'Vencida';
        const badgeClass = isRedeemed
            ? 'text-teal-600 bg-teal-50 border-teal-200'
            : isCancelled
            ? 'text-red-500 bg-red-50 border-red-200'
            : 'text-amber-600 bg-amber-50 border-amber-200';

        return (
            <div className={`bg-white border border-gray-100 border-l-4 ${leftBorder} rounded-xl p-3 space-y-1`}>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                            <BadgeIcon className="w-3 h-3" />
                            {badgeLabel}
                        </span>
                        <span className="font-mono text-xs text-gray-400 truncate">{card.code}</span>
                    </div>
                    <span className={`font-bold text-sm shrink-0 ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        $ {formatArgentineCurrency(card.amount)}
                    </span>
                </div>
                {card.purchasedByName && (
                    <p className="text-xs text-gray-400">De: {card.purchasedByName}</p>
                )}
                {card.redeemedDate && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#34baab]" />
                        Usada el {formatDate(card.redeemedDate)}
                    </p>
                )}
                {isExpired && card.expiryDate && (
                    <p className="text-xs text-amber-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Venció el {formatDate(card.expiryDate)}
                    </p>
                )}
                {card.notes && <p className="text-xs text-gray-400 italic">{card.notes}</p>}
                <div className="flex gap-1.5 pt-1">
                    {onEdit && (
                        <button type="button" onClick={onEdit} className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-teal-600 px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors">
                            <Pencil className="w-3 h-3" /> Editar
                        </button>
                    )}
                    {onDelete && (
                        <button type="button" onClick={onDelete} className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── ACTIVA: gradient card prominente ──
    return (
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-teal-500 via-teal-400 to-cyan-400 p-4 shadow-sm">
            <Gift className="absolute right-2 top-1/2 -translate-y-1/2 w-20 h-20 text-white/10 pointer-events-none" />

            <div className="flex items-center gap-1.5 mb-2">
                <Gift className="w-3.5 h-3.5 text-white/70" />
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">Gift Card · Activa</span>
            </div>

            <p className="text-2xl font-black text-white tracking-tight leading-none mb-3">
                $ {formatArgentineCurrency(card.amount)}
            </p>

            <p className="font-mono text-[11px] text-white/60 tracking-widest mb-2">{card.code}</p>

            <div className="space-y-0.5">
                {card.purchasedByName && (
                    <p className="text-xs text-white/70">De: <span className="font-semibold">{card.purchasedByName}</span></p>
                )}
                {card.expiryDate && (
                    <p className="text-xs text-white/70 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Vence el {formatDate(card.expiryDate)}
                    </p>
                )}
                {card.notes && <p className="text-xs text-white/60 italic">{card.notes}</p>}
            </div>

            <div className="flex gap-2 mt-3">
                {onRedeem && (
                    <button type="button" onClick={onRedeem} disabled={loading}
                        className="flex-1 text-xs font-bold text-teal-700 bg-white hover:bg-teal-50 rounded-xl py-1.5 transition-colors disabled:opacity-50 shadow-sm">
                        {loading ? '...' : 'Marcar como usada'}
                    </button>
                )}
                {onCancel && (
                    <button type="button" onClick={onCancel} disabled={loading}
                        className="text-xs font-semibold text-white/80 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                )}
                {onEdit && (
                    <button type="button" onClick={onEdit}
                        className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors" title="Editar">
                        <Pencil className="w-3.5 h-3.5 text-white/80" />
                    </button>
                )}
                {onDelete && (
                    <button type="button" onClick={onDelete}
                        className="p-1.5 rounded-xl bg-white/20 hover:bg-red-400/40 transition-colors" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5 text-white/80" />
                    </button>
                )}
            </div>
        </div>
    );
}
