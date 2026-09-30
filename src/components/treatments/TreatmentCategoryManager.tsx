'use client';

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Treatment, TreatmentCategoryDoc } from '@/lib/types/treatment';
import {
    createTreatmentCategory,
    renameTreatmentCategory,
    updateTreatmentCategoryOrders,
    deleteTreatmentCategory,
} from '@/lib/firebase/treatmentCategories';
import { Plus, Trash2, Pencil, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    categories: TreatmentCategoryDoc[];
    treatments: Treatment[];
    onChanged: () => Promise<void> | void;
}

function normalizeName(value: string): string {
    const trimmed = value.trim().replace(/\s+/g, ' ');
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function TreatmentCategoryManager({ isOpen, onClose, categories, treatments, onChanged }: Props) {
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [busy, setBusy] = useState(false);

    const usageCount = (name: string) => treatments.filter(t => t.category === name).length;

    const isDuplicate = (name: string, exceptId?: string) =>
        categories.some(c => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase());

    const run = async (action: () => Promise<void>) => {
        setBusy(true);
        try {
            await action();
            await onChanged();
        } catch (error) {
            console.error('Error managing treatment categories:', error);
            toast.error('No se pudo guardar el cambio');
        } finally {
            setBusy(false);
        }
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const name = normalizeName(newName);
        if (!name) return;
        if (isDuplicate(name)) {
            toast.error('Esa categoría ya existe');
            return;
        }
        const nextOrder = categories.reduce((max, c) => Math.max(max, c.order), -1) + 1;
        run(async () => {
            await createTreatmentCategory(name, nextOrder);
            setNewName('');
            toast.success(`Categoría "${name}" creada`);
        });
    };

    const handleRename = (cat: TreatmentCategoryDoc) => {
        const name = normalizeName(editingName);
        if (!name || name === cat.name) {
            setEditingId(null);
            return;
        }
        if (isDuplicate(name, cat.id)) {
            toast.error('Esa categoría ya existe');
            return;
        }
        run(async () => {
            const updated = await renameTreatmentCategory(cat.id, cat.name, name);
            setEditingId(null);
            toast.success(updated > 0
                ? `Categoría renombrada y ${updated} tratamiento(s) actualizados`
                : 'Categoría renombrada');
        });
    };

    const handleMove = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= categories.length) return;
        const reordered = [...categories];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        run(() => updateTreatmentCategoryOrders(reordered.map((c, i) => ({ id: c.id, order: i }))));
    };

    const handleDelete = (cat: TreatmentCategoryDoc) => {
        const count = usageCount(cat.name);
        if (count > 0) {
            toast.error(`No se puede eliminar: ${count} tratamiento(s) usan "${cat.name}". Cambiales la categoría primero.`);
            return;
        }
        if (!window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
        run(async () => {
            await deleteTreatmentCategory(cat.id);
            toast.success('Categoría eliminada');
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Categorías">
            <div className="space-y-6">
                <form onSubmit={handleAdd} className="flex gap-3 items-end">
                    <div className="flex-1">
                        <Input
                            label="Nueva categoría"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Ej: Masajes"
                        />
                    </div>
                    <Button type="submit" disabled={busy || !newName.trim()} className="bg-[#34baab] hover:bg-[#2aa89a] text-white rounded-2xl py-3">
                        <Plus className="w-4 h-4 mr-1" /> Agregar
                    </Button>
                </form>

                <div className="space-y-2">
                    {categories.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-6">Todavía no hay categorías</p>
                    )}
                    {categories.map((cat, index) => {
                        const count = usageCount(cat.name);
                        const isEditing = editingId === cat.id;
                        return (
                            <div key={cat.id} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2">
                                <div className="flex flex-col">
                                    <button
                                        type="button"
                                        onClick={() => handleMove(index, -1)}
                                        disabled={busy || index === 0}
                                        aria-label="Subir"
                                        className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                                    >
                                        <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMove(index, 1)}
                                        disabled={busy || index === categories.length - 1}
                                        aria-label="Bajar"
                                        className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                </div>

                                {isEditing ? (
                                    <input
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { e.preventDefault(); handleRename(cat); }
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        autoFocus
                                        aria-label="Nombre de la categoría"
                                        className="flex-1 min-w-0 px-3 py-2 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#34baab] outline-none text-gray-900 text-sm"
                                    />
                                ) : (
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 text-sm truncate">{cat.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                            {count === 0 ? 'Sin tratamientos' : `${count} tratamiento${count === 1 ? '' : 's'}`}
                                        </p>
                                    </div>
                                )}

                                {isEditing ? (
                                    <>
                                        <button type="button" onClick={() => handleRename(cat)} disabled={busy} aria-label="Guardar" className="p-2 text-[#34baab] hover:bg-teal-50 rounded-xl">
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button type="button" onClick={() => setEditingId(null)} aria-label="Cancelar" className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }}
                                            disabled={busy}
                                            aria-label={`Renombrar ${cat.name}`}
                                            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(cat)}
                                            disabled={busy}
                                            aria-label={`Eliminar ${cat.name}`}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                <p className="text-xs text-gray-400">
                    Al renombrar una categoría se actualizan también los tratamientos que la usan. Solo se pueden eliminar categorías sin tratamientos.
                </p>
            </div>
        </Modal>
    );
}
