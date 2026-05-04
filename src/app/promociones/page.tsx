'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Promotion } from '@/lib/types/promotion';
import Image from 'next/image';
import {
    getPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    uploadPromotionImage,
    deletePromotionImage
} from '@/lib/firebase/promotions';
import { PromotionCard } from '@/components/promotions/PromotionCard';
import { PromotionForm } from '@/components/promotions/PromotionForm';
import {
    Search,
    Plus,
    Tag,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Loader2,
    X
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { PromoCardSkeleton } from '@/components/ui/Skeleton';
import { haptics } from '@/lib/utils/haptics';

export default function PromosPage() {
    const { profile, loading: authLoading } = useAuth();
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Modals state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | undefined>();
    const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);

    const isAdmin = profile?.role === 'admin' || profile?.role === 'secretary' || profile?.role === 'promotor';

    useEffect(() => {
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        try {
            const data = await getPromotions();
            setPromotions(data);
        } catch (error) {
            console.error('Error fetching promotions:', error);
            toast.error('No se pudieron cargar las promociones');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (data: any, imageFile?: File) => {
        try {
            if (imageFile) {
                const id = await createPromotion({ ...data, imageUrl: '' });
                const imageUrl = await uploadPromotionImage(imageFile, id);
                await updatePromotion(id, { imageUrl });
            } else {
                await createPromotion(data);
            }

            toast.success('Promoción creada con éxito');
            fetchPromotions();
        } catch (error) {
            console.error('Error creating promotion:', error);
            throw error;
        }
    };

    const handleUpdate = async (data: any, imageFile?: File) => {
        if (!editingPromotion) return;
        try {
            let imageUrl = editingPromotion.imageUrl;

            if (imageFile) {
                if (editingPromotion.imageUrl) {
                    await deletePromotionImage(editingPromotion.imageUrl);
                }
                imageUrl = await uploadPromotionImage(imageFile, editingPromotion.id);
            }

            await updatePromotion(editingPromotion.id, { ...data, imageUrl });
            toast.success('Promoción actualizada');
            fetchPromotions();
            setEditingPromotion(undefined);
        } catch (error) {
            console.error('Error updating promotion:', error);
            throw error;
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta promoción?')) return;

        try {
            await deletePromotion(id);
            toast.success('Promoción eliminada');
            setPromotions(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting promotion:', error);
            toast.error('Error al eliminar la promoción');
        }
    };

    if (authLoading || (loading && promotions.length === 0)) {
        return (
            <div className="min-h-screen bg-gray-50 pb-24">
                <div className="bg-[#484450] text-white pt-20 md:pt-10 pb-12 px-4 md:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="h-24 w-64 bg-white/10 animate-pulse rounded-2xl" />
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 mt-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-80 md:h-[500px] bg-gray-200 animate-pulse rounded-[3rem]" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />

            {/* Header — mismo diseño que Alquileres */}
            <div className="container mx-auto px-4 pt-4 md:pt-8">
                <div className="bg-[#484450] rounded-2xl p-6 md:p-8 mb-4 shadow-lg flex items-center justify-between transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-lg">
                            <Tag className="w-7 h-7 md:w-8 md:h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                                Promociones
                            </h1>
                            <p className="text-sm font-bold text-gray-300 uppercase tracking-widest leading-none mt-1">
                                Ofertas Especiales
                            </p>
                        </div>
                    </div>
                </div>

                {/* Botón de acción — solo para admins */}
                {isAdmin && (
                    <div className="flex justify-end mb-6">
                        <button
                            onClick={() => { setEditingPromotion(undefined); setIsFormOpen(true); }}
                            className="bg-[#34baab] hover:bg-[#2da698] text-white px-5 py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 text-sm"
                        >
                            <Plus className="w-4 h-4" /> Nueva Promo
                        </button>
                    </div>
                )}
            </div>

            {/* Main Content - Grid Layout */}
            <div className="max-w-7xl mx-auto px-4 mt-8">
                {promotions.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                        {promotions.map((promo) => (
                            <PromotionCard
                                key={promo.id}
                                promotion={promo}
                                isAdmin={isAdmin}
                                onEdit={(p) => { setEditingPromotion(p); setIsFormOpen(true); }}
                                onDelete={handleDelete}
                                onClick={(p) => {
                                    haptics.medium();
                                    setSelectedPromotion(p);
                                }}
                            />
                        ))}
                    </div>
                ) : !loading && (
                    <div className="bg-white rounded-[3rem] p-12 text-center shadow-xl border-2 border-dashed border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                            <Tag className="w-10 h-10 text-gray-300" />
                        </div>
                        <h2 className="text-2xl font-black text-[#484450] mb-2 tracking-tight">No hay promociones</h2>
                        <p className="text-gray-400 font-medium">Estamos preparando nuevas ofertas para ti. ¡Vuelve pronto!</p>
                    </div>
                )}
            </div>

            {/* Promotion Detail Modal */}
            {selectedPromotion && (
                <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ paddingBottom: '96px' }}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedPromotion(null)} />

                    {/* Card modal */}
                    <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" style={{ maxHeight: 'calc(100dvh - 120px)' }}>

                        {/* Header */}
                        <div className="flex-none flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                            <button
                                aria-label="Cerrar"
                                onClick={() => setSelectedPromotion(null)}
                                className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-90 flex-none"
                            >
                                <X className="w-6 h-6 text-gray-600" />
                            </button>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#34baab]">Promoción</span>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto">
                            {/* Image */}
                            <div className="relative w-full bg-gray-50" style={{ aspectRatio: '4/5' }}>
                                <Image
                                    src={selectedPromotion.imageUrl}
                                    alt={selectedPromotion.title || 'Promoción'}
                                    fill
                                    className="object-cover"
                                    priority
                                    unoptimized
                                />
                            </div>

                            {/* Info below image */}
                            {(selectedPromotion.title || selectedPromotion.price || selectedPromotion.description) && (
                                <div className="px-5 py-4 space-y-2">
                                    {selectedPromotion.title && (
                                        <h2 className="text-xl font-black text-[#484450] leading-tight">
                                            {selectedPromotion.title}
                                        </h2>
                                    )}
                                    {selectedPromotion.price && (
                                        <p className="text-[#34baab] font-black text-2xl">
                                            <span className="text-sm font-semibold">$ </span>
                                            {selectedPromotion.price}
                                        </p>
                                    )}
                                    {selectedPromotion.description && (
                                        <p className="text-gray-400 text-sm font-medium leading-relaxed">
                                            {selectedPromotion.description}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <PromotionForm
                isOpen={isFormOpen}
                initialData={editingPromotion}
                onClose={() => { setIsFormOpen(false); setEditingPromotion(undefined); }}
                onSubmit={editingPromotion ? handleUpdate : handleCreate}
            />
        </div>
    );
}

