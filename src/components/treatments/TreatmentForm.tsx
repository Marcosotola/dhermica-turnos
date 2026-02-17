'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Treatment, TreatmentCategory, TreatmentPrice } from '@/lib/types/treatment';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface TreatmentFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    treatment?: Treatment;
}

const CATEGORIES: TreatmentCategory[] = ['Facial', 'Corporal', 'Aparatología', 'Depilación', 'Manos', 'Pies', 'Cejas', 'Pestañas'];

export function TreatmentForm({ isOpen, onClose, onSubmit, treatment }: TreatmentFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>>({
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
    });

    useEffect(() => {
        if (treatment) {
            setFormData({
                name: treatment.name,
                shortDescription: treatment.shortDescription,
                fullDescription: treatment.fullDescription || '',
                category: treatment.category,
                prices: treatment.prices,
                contraindications: treatment.contraindications || [],
                benefits: treatment.benefits || [],
                results: treatment.results || [],
                preCare: treatment.preCare || [],
                postCare: treatment.postCare || [],
            });
        } else {
            setFormData({
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
            });
        }
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
    };

    const handlePriceChange = (index: number, field: keyof TreatmentPrice, value: any) => {
        setFormData(prev => ({
            ...prev,
            prices: prev.prices.map((p, i) => i === index ? { ...p, [field]: value } : p)
        }));
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
                            <div key={index} className="flex flex-col md:flex-row gap-3 md:items-end bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-in slide-in-from-right-4 relative">
                                <div className="flex-1">
                                    <Input
                                        label="Zona"
                                        value={p.zone}
                                        onChange={(e) => handlePriceChange(index, 'zone', e.target.value)}
                                        placeholder="Ej: Rostro"
                                        className="bg-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3 min-w-full md:min-w-0">
                                    <div className="flex-1">
                                        <Input
                                            label="Precio ($)"
                                            type="number"
                                            value={p.price || ''}
                                            onChange={(e) => handlePriceChange(index, 'price', parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="flex-1">
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
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemovePrice(index)}
                                    className="absolute md:relative top-2 right-2 md:top-0 md:right-0 p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 ml-1 italic">Contraindicaciones (una por línea)</label>
                        <textarea
                            value={formData.contraindications?.join('\n')}
                            onChange={(e) => handleListChange('contraindications', e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#34baab] outline-none resize-none transition-all text-gray-900 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 ml-1 italic">Beneficios (uno por línea)</label>
                        <textarea
                            value={formData.benefits?.join('\n')}
                            onChange={(e) => handleListChange('benefits', e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#34baab] outline-none resize-none transition-all text-gray-900 text-sm"
                        />
                    </div>
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
