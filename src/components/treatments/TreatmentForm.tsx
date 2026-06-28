'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Treatment, TreatmentCategory, TreatmentPrice, CancellationPolicy } from '@/lib/types/treatment';
import { Plus, Trash2, Clock, Banknote } from 'lucide-react';
import { toast } from 'sonner';

interface TreatmentFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    treatment?: Treatment;
}

const CATEGORIES: TreatmentCategory[] = ['Facial', 'Corporal', 'Aparatología', 'Depilación', 'Manos', 'Pies', 'Cejas', 'Pestañas', 'Plasma', 'Botox', 'Peluquería'];

const DURATION_OPTIONS_MINUTES = [
    { value: 30, label: '30 minutos' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '1 hora 30 minutos' },
    { value: 120, label: '2 horas' },
    { value: 150, label: '2 horas 30 minutos' },
    { value: 180, label: '3 horas' },
    { value: 210, label: '3 horas 30 minutos' },
    { value: 240, label: '4 horas' },
];

const PRESET_DURATIONS = new Set(DURATION_OPTIONS_MINUTES.map(o => o.value));

function buildFormData(treatment?: Treatment): Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'> {
    if (treatment) {
        return {
            name: treatment.name,
            shortDescription: treatment.shortDescription,
            fullDescription: treatment.fullDescription || '',
            category: treatment.category,
            prices: treatment.prices || [],
            contraindications: treatment.contraindications || [],
            benefits: treatment.benefits || [],
            results: treatment.results || [],
            preCare: treatment.preCare || [],
            postCare: treatment.postCare || [],
            cancellationPolicy: treatment.cancellationPolicy,
            depositAmount: treatment.depositAmount ?? 0,
        };
    }
    return {
        name: '',
        shortDescription: '',
        fullDescription: '',
        category: 'Facial',
        prices: [],
        contraindications: [],
        benefits: [],
        results: [],
        preCare: [],
        postCare: [],
        cancellationPolicy: undefined,
        depositAmount: 0,
    };
}

function buildCustomDurations(treatment?: Treatment): Record<number, boolean> {
    const map: Record<number, boolean> = {};
    (treatment?.prices || []).forEach((p, i) => {
        if (p.duration !== undefined && !PRESET_DURATIONS.has(p.duration)) {
            map[i] = true;
        }
    });
    return map;
}

export function TreatmentForm({ isOpen, onClose, onSubmit, treatment }: TreatmentFormProps) {
    const [loading, setLoading] = useState(false);
    const [customDurationRows, setCustomDurationRows] = useState<Record<number, boolean>>(() => buildCustomDurations(treatment));
    const [formData, setFormData] = useState<Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>>(() => buildFormData(treatment));

    useEffect(() => {
        setFormData(buildFormData(treatment));
        setCustomDurationRows(buildCustomDurations(treatment));
    }, [treatment, isOpen]);

    const handleAddPrice = () => {
        setFormData(prev => ({
            ...prev,
            prices: [...prev.prices, { zone: '', price: 0, gender: 'female' }]
        }));
    };

    const handleRemovePrice = (index: number) => {
        setFormData(prev => ({
            ...prev,
            prices: prev.prices.filter((_, i) => i !== index)
        }));
        setCustomDurationRows(prev => {
            const next: Record<number, boolean> = {};
            Object.entries(prev).forEach(([k, v]) => {
                const ki = parseInt(k);
                if (ki < index) next[ki] = v;
                else if (ki > index) next[ki - 1] = v;
            });
            return next;
        });
    };

    const handlePriceChange = (index: number, field: keyof TreatmentPrice, value: any) => {
        setFormData(prev => ({
            ...prev,
            prices: prev.prices.map((p, i) => i === index ? { ...p, [field]: value } : p)
        }));
    };

    const handleDurationSelectChange = (index: number, value: string) => {
        if (value === 'custom') {
            setCustomDurationRows(prev => ({ ...prev, [index]: true }));
            handlePriceChange(index, 'duration', undefined);
        } else if (value === '') {
            setCustomDurationRows(prev => ({ ...prev, [index]: false }));
            handlePriceChange(index, 'duration', undefined);
        } else {
            setCustomDurationRows(prev => ({ ...prev, [index]: false }));
            handlePriceChange(index, 'duration', parseInt(value));
        }
    };

    const handleListChange = (field: 'contraindications' | 'benefits' | 'results' | 'preCare' | 'postCare', value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value.split('\n').filter(line => line.trim() !== '')
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.prices.length === 0) {
            toast.error('Debes agregar al menos un precio');
            return;
        }
        setLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error('Error submitting treatment:', error);
            toast.error('Error al guardar el tratamiento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={treatment ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Nombre del Tratamiento"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Ej: Limpieza Facial Profunda"
                    />
                    <Select
                        label="Categoría"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as TreatmentCategory })}
                        options={CATEGORIES.map(c => ({ value: c, label: c }))}
                    />
                </div>

                <Input
                    label="Descripción Corta"
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    required
                    placeholder="Resumen para la tarjeta del catálogo"
                />

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Descripción Completa</label>
                    <textarea
                        value={formData.fullDescription}
                        onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#34baab] outline-none resize-none transition-all text-gray-900"
                        placeholder="Detalles extendidos del tratamiento..."
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs">Precios y Zonas</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={handleAddPrice} className="text-[#34baab]">
                            <Plus className="w-4 h-4 mr-1" /> Agregar
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {formData.prices.map((p, index) => (
                            <div key={index} className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-in slide-in-from-right-4">
                                {/* Zona ocupa fila completa en mobile, 1/3 en desktop junto a Precio, Género y Eliminar */}
                                <div className="grid grid-cols-[1fr_1fr_auto] md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                                    <div className="col-span-3 md:col-span-1">
                                        <Input
                                            label="Zona"
                                            value={p.zone}
                                            onChange={(e) => handlePriceChange(index, 'zone', e.target.value)}
                                            placeholder="Ej: Rostro"
                                            className="bg-white"
                                        />
                                    </div>
                                    <Input
                                        label="Precio ($)"
                                        type="number"
                                        value={p.price || ''}
                                        onChange={(e) => handlePriceChange(index, 'price', parseFloat(e.target.value) || 0)}
                                        placeholder="0"
                                        className="bg-white"
                                    />
                                    <Select
                                        label="Género"
                                        value={p.gender || 'both'}
                                        onChange={(e) => handlePriceChange(index, 'gender', e.target.value)}
                                        options={[
                                            { value: 'female', label: 'Fem.' },
                                            { value: 'male', label: 'Masc.' },
                                            { value: 'both', label: 'Ambos' },
                                        ]}
                                        className="bg-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePrice(index)}
                                        aria-label="Eliminar zona"
                                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all self-end"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <Select
                                            label="Duración"
                                            value={customDurationRows[index] ? 'custom' : (p.duration?.toString() || '')}
                                            onChange={(e) => handleDurationSelectChange(index, e.target.value)}
                                            options={[
                                                { value: '', label: 'Sin especificar' },
                                                ...DURATION_OPTIONS_MINUTES.map(o => ({ value: o.value.toString(), label: o.label })),
                                                { value: 'custom', label: 'Otro...' },
                                            ]}
                                            className="bg-white"
                                        />
                                    </div>
                                    {customDurationRows[index] && (
                                        <div className="flex-1">
                                            <Input
                                                label="Minutos"
                                                type="number"
                                                value={p.duration || ''}
                                                onChange={(e) => handlePriceChange(index, 'duration', parseInt(e.target.value) || undefined)}
                                                placeholder="Ej: 45"
                                                min={1}
                                                className="bg-white"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="contraindications" className="block text-sm font-bold text-gray-700 mb-2 ml-1 italic">Contraindicaciones (una por línea)</label>
                        <textarea
                            id="contraindications"
                            value={formData.contraindications?.join('\n')}
                            onChange={(e) => handleListChange('contraindications', e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#34baab] outline-none resize-none transition-all text-gray-900 text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="benefits" className="block text-sm font-bold text-gray-700 mb-2 ml-1 italic">Beneficios (uno por línea)</label>
                        <textarea
                            id="benefits"
                            value={formData.benefits?.join('\n')}
                            onChange={(e) => handleListChange('benefits', e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#34baab] outline-none resize-none transition-all text-gray-900 text-sm"
                        />
                    </div>
                </div>

                {/* Seña para Reserva Online */}
                <div className="space-y-3">
                    <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs flex items-center gap-2">
                        <Banknote className="w-3.5 h-3.5 text-[#34baab]" /> Seña para Reserva Online
                    </h4>
                    <div className="bg-teal-50 border border-teal-200 p-4 rounded-2xl space-y-2">
                        <p className="text-xs text-teal-700 font-medium">
                            Monto fijo que el cliente debe abonar para confirmar un turno online. Poner 0 si no requiere seña.
                        </p>
                        <Input
                            label="Monto de seña ($)"
                            type="number"
                            value={formData.depositAmount ?? 0}
                            onChange={e => setFormData(prev => ({ ...prev, depositAmount: parseFloat(e.target.value) || 0 }))}
                            min={0}
                            placeholder="0"
                            className="bg-white"
                        />
                    </div>
                </div>

                {/* Política de Cancelación */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-amber-500" /> Política de Cancelación
                        </h4>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={!!formData.cancellationPolicy}
                                onChange={e => setFormData(prev => ({
                                    ...prev,
                                    cancellationPolicy: e.target.checked
                                        ? { hoursBeforeToCancel: 45, forfeitDeposit: true }
                                        : undefined,
                                }))}
                                className="accent-amber-500 w-4 h-4"
                            />
                            <span className="text-sm font-medium text-gray-600">Activar</span>
                        </label>
                    </div>

                    {formData.cancellationPolicy && (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-4 animate-in slide-in-from-top-2">
                            <p className="text-xs text-amber-700 font-medium">
                                Define cuántas horas antes del turno el cliente puede cancelar sin perder la seña.
                            </p>
                            <div className="flex items-end gap-4">
                                <div className="flex-1">
                                    <Input
                                        label="Horas mínimas de anticipación"
                                        type="number"
                                        value={formData.cancellationPolicy.hoursBeforeToCancel || ''}
                                        onChange={e => setFormData(prev => ({
                                            ...prev,
                                            cancellationPolicy: {
                                                ...(prev.cancellationPolicy as CancellationPolicy),
                                                hoursBeforeToCancel: parseInt(e.target.value) || 0,
                                            },
                                        }))}
                                        min={1}
                                        placeholder="45"
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={formData.cancellationPolicy.forfeitDeposit}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        cancellationPolicy: {
                                            ...(prev.cancellationPolicy as CancellationPolicy),
                                            forfeitDeposit: e.target.checked,
                                        },
                                    }))}
                                    className="accent-red-500 w-4 h-4 mt-0.5"
                                />
                                <span className="text-sm text-gray-700">
                                    La seña se pierde si cancela con menos anticipación de la indicada
                                </span>
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 pt-4">
                    <Button type="submit" disabled={loading} className="flex-1 py-4 rounded-2xl bg-[#34baab] hover:bg-[#2aa89a] text-white">
                        {loading ? 'Guardando...' : treatment ? 'Actualizar' : 'Crear Tratamiento'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={onClose} className="flex-1 py-4 rounded-2xl">
                        Cancelar
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
