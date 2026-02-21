'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Plus, Search, Filter } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTreatments, createTreatment, updateTreatment, deleteTreatment } from '@/lib/firebase/treatments';
import { Treatment, TreatmentCategory } from '@/lib/types/treatment';
import { TreatmentCard } from '@/components/treatments/TreatmentCard';
import { TreatmentForm } from '@/components/treatments/TreatmentForm';
import { TreatmentDetail } from '@/components/treatments/TreatmentDetail';
import { TreatmentSeeder } from '@/components/treatments/TreatmentSeeder';
import { Button } from '@/components/ui/Button';
import { toast, Toaster } from 'sonner';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { haptics } from '@/lib/utils/haptics';

const CATEGORIES: (TreatmentCategory | 'Todos')[] = ['Todos', 'Facial', 'Corporal', 'Aparatología', 'Depilación', 'Manos', 'Pies', 'Cejas', 'Pestañas'];

export default function TratamientosPage() {
    const { profile, loading: authLoading } = useAuth();
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<TreatmentCategory | 'Todos'>('Todos');

    // Modals state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [editingTreatment, setEditingTreatment] = useState<Treatment | undefined>();
    const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);

    const isAdmin = profile?.role === 'admin' || profile?.role === 'secretary' || profile?.role === 'promotor';

    useEffect(() => {
        fetchTreatments();
    }, []);

    const fetchTreatments = async () => {
        setLoading(true);
        const data = await getTreatments();
        setTreatments(data);
        setLoading(false);
    };

    const handleCreate = async (data: Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>) => {
        await createTreatment(data);
        toast.success('Tratamiento creado exitosamente');
        fetchTreatments();
    };

    const handleUpdate = async (data: Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!editingTreatment) return;
        await updateTreatment(editingTreatment.id, data);
        toast.success('Tratamiento actualizado');
        fetchTreatments();
        setEditingTreatment(undefined);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este tratamiento del catálogo?')) {
            await deleteTreatment(id);
            toast.success('Tratamiento eliminado');
            fetchTreatments();
        }
    };

    const filteredTreatments = useMemo(() => {
        return treatments.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'Todos' || t.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [treatments, searchQuery, selectedCategory]);

    if (authLoading && treatments.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34baab]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />

            {/* Header Section */}
            <div className="bg-[#484450] text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
                                <Sparkles className="w-8 h-8 text-[#34baab]" /> Catálogo de Servicios
                            </h1>
                            <p className="text-gray-300 font-medium">Descubre nuestra amplia gama de tratamientos estéticos.</p>
                        </div>
                        {isAdmin && (
                            <Button
                                onClick={() => { setEditingTreatment(undefined); setIsFormOpen(true); }}
                                className="bg-[#34baab] hover:bg-[#2aa89a] border-none rounded-2xl py-4 px-8 shadow-lg shadow-[#34baab]/20 transform hover:-translate-y-1 transition-all"
                            >
                                <Plus className="w-5 h-5 mr-2" /> Nuevo Tratamiento
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
                {/* Seeder for initial data - Removed after migration to prevent data resets */}
                {/* {isAdmin && <TreatmentSeeder />} */}

                {/* Search & Filter Bar */}
                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-4 md:p-6 mb-8">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar tratamiento..."
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#34baab] outline-none text-gray-900 font-medium shadow-inner"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-4 lg:pb-0 no-scrollbar touch-pan-x">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-6 py-4 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest whitespace-nowrap transition-all flex-shrink-0 ${selectedCategory === cat
                                        ? 'bg-[#34baab] text-white shadow-lg shadow-teal-100 ring-2 ring-[#34baab] ring-offset-2'
                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <CardSkeleton key={i} />
                        ))}
                    </div>
                ) : filteredTreatments.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">No se encontraron resultados</h3>
                        <p className="text-gray-500">Prueba con otros términos o categorías.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                        {filteredTreatments.map(t => (
                            <TreatmentCard
                                key={t.id}
                                treatment={t}
                                isAdmin={isAdmin}
                                onEdit={(t) => { setEditingTreatment(t); setIsFormOpen(true); }}
                                onDelete={handleDelete}
                                onClick={(t) => {
                                    haptics.light();
                                    setSelectedTreatment(t);
                                    setIsDetailOpen(true);
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <TreatmentForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                treatment={editingTreatment}
                onSubmit={editingTreatment ? handleUpdate : handleCreate}
            />

            <TreatmentDetail
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                treatment={selectedTreatment}
            />
        </div>
    );
}
