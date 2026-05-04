'use client';

import { useState, useEffect } from 'react';
import { getTreatments } from '@/lib/firebase/treatments';
import { Treatment, TreatmentCategory, TreatmentPrice } from '@/lib/types/treatment';
import { SelectedTreatment } from '@/lib/types/appointment';
import { Search, X, ChevronRight, Plus } from 'lucide-react';

const CATEGORIES: TreatmentCategory[] = [
    'Facial', 'Corporal', 'Depilación', 'Manos', 'Pies', 'Aparatología', 'Cejas', 'Pestañas',
];

const GENDER_LABELS: Record<string, string> = {
    male: 'Masculino',
    female: 'Femenino',
    both: 'Ambos',
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (treatment: SelectedTreatment) => void;
}

export function TreatmentSelectorSheet({ isOpen, onClose, onAdd }: Props) {
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<TreatmentCategory | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setSearch('');
            setActiveCategory(null);
            setExpandedId(null);
            return;
        }
        setLoading(true);
        getTreatments().then(data => {
            setTreatments(data);
            setLoading(false);
        });
    }, [isOpen]);

    const filtered = treatments.filter(t => {
        const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !activeCategory || t.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const handleSelectPrice = (treatment: Treatment, p: TreatmentPrice) => {
        onAdd({
            treatmentId: treatment.id,
            name: treatment.name,
            category: treatment.category,
            zone: p.zone,
            gender: p.gender,
            price: p.price,
            duration: p.duration ?? 60,
        });
        setExpandedId(null);
    };

    const handleTreatmentTap = (treatment: Treatment) => {
        if (treatment.prices.length === 1) {
            handleSelectPrice(treatment, treatment.prices[0]);
            return;
        }
        setExpandedId(prev => prev === treatment.id ? null : treatment.id);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/40 z-[200]" onClick={onClose} />
            <div className="fixed bottom-0 left-0 right-0 z-[201] bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">

                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Seleccionar Tratamiento</h2>
                    <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="px-5 py-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar tratamiento..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#34baab]/30 focus:border-[#34baab]"
                        />
                    </div>
                </div>

                <div className="flex gap-2 px-5 pb-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                        type="button"
                        onClick={() => setActiveCategory(null)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${!activeCategory ? 'bg-[#34baab] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        Todos
                    </button>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setActiveCategory(prev => prev === cat ? null : cat)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${activeCategory === cat ? 'bg-[#34baab] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-2">
                    {loading ? (
                        <p className="py-12 text-center text-gray-400 text-sm">Cargando tratamientos...</p>
                    ) : filtered.length === 0 ? (
                        <p className="py-12 text-center text-gray-400 text-sm">No se encontraron tratamientos</p>
                    ) : filtered.map(treatment => {
                        const isExpanded = expandedId === treatment.id;
                        const singlePrice = treatment.prices.length === 1 ? treatment.prices[0] : null;

                        return (
                            <div key={treatment.id} className="rounded-2xl border border-gray-100 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => handleTreatmentTap(treatment)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${isExpanded ? 'bg-[#34baab]/5' : 'bg-white hover:bg-gray-50'}`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 text-sm leading-tight">{treatment.name}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">{treatment.category}</p>
                                    </div>
                                    {singlePrice ? (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="text-right">
                                                <p className="text-sm font-black text-[#34baab]">${singlePrice.price.toLocaleString('es-AR')}</p>
                                                {singlePrice.duration && (
                                                    <p className="text-[10px] text-gray-400">{singlePrice.duration} min</p>
                                                )}
                                            </div>
                                            <Plus className="w-5 h-5 text-[#34baab] shrink-0" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-[10px] text-gray-400 font-bold">{treatment.prices.length} opciones</span>
                                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                        </div>
                                    )}
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50/80 divide-y divide-gray-100 animate-in slide-in-from-top-1 duration-150">
                                        {treatment.prices.map((p, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => handleSelectPrice(treatment, p)}
                                                className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#34baab]/5 transition-colors"
                                            >
                                                <div className="text-left">
                                                    <p className="text-sm font-bold text-gray-800">{p.zone}</p>
                                                    {p.gender && p.gender !== 'both' && (
                                                        <p className="text-[10px] text-gray-400">{GENDER_LABELS[p.gender]}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-[#34baab]">${p.price.toLocaleString('es-AR')}</p>
                                                        {p.duration && <p className="text-[10px] text-gray-400">{p.duration} min</p>}
                                                    </div>
                                                    <Plus className="w-4 h-4 text-[#34baab]" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
