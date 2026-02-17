'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Promotion } from '@/lib/types/promotion';
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
    Loader2
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function PromosPage() {
    const { profile, loading: authLoading } = useAuth();
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Modals state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | undefined>();

    // Carousel ref
    const carouselRef = useRef<HTMLDivElement>(null);

    const isAdmin = profile?.role === 'admin' || profile?.role === 'secretary';

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
            // 1. Create doc to get ID
            const tempId = 'temp-' + Date.now();
            let imageUrl = '';

            if (imageFile) {
                // We need the final ID for the folder structure, but addDoc happens later.
                // Let's create the doc first with a placeholder image, then update.
                const id = await createPromotion({ ...data, imageUrl: '' });
                imageUrl = await uploadPromotionImage(imageFile, id);
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
                // Delete old image if it exists
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

    // Auto carousel logic
    useEffect(() => {
        if (promotions.length <= 1) return;
        const interval = setInterval(() => {
            const nextIndex = (currentIndex + 1) % promotions.length;
            setCurrentIndex(nextIndex);
            scrollToIndex(nextIndex);
        }, 5000);
        return () => clearInterval(interval);
    }, [promotions.length, currentIndex]);

    const scrollToIndex = (index: number) => {
        if (carouselRef.current) {
            const child = carouselRef.current.children[index] as HTMLElement;
            if (child) {
                carouselRef.current.scrollTo({
                    left: child.offsetLeft - 16,
                    behavior: 'smooth'
                });
            }
        }
    };

    const handleNext = () => {
        const nextIndex = (currentIndex + 1) % promotions.length;
        setCurrentIndex(nextIndex);
        scrollToIndex(nextIndex);
    };

    const handlePrev = () => {
        const prevIndex = (currentIndex - 1 + promotions.length) % promotions.length;
        setCurrentIndex(prevIndex);
        scrollToIndex(prevIndex);
    };


    if (authLoading || (loading && promotions.length === 0)) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-[#34baab] animate-spin" />
                    <p className="text-[#484450] font-black uppercase tracking-widest text-xs">Cargando Ofertas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />

            {/* Header / Hero Section */}
            <div className="bg-[#484450] text-white pt-14 md:pt-10 pb-12 px-4 md:px-8">
                <div className="max-w-7xl mx-auto flex items-start justify-between">
                    <div className="animate-in slide-in-from-left-8 duration-700">
                        <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-5 h-5 text-pink-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-400">Ofertas</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">
                            Ofertas que <span className="text-[#34baab]">enamoran.</span>
                        </h1>
                    </div>

                    {isAdmin && (
                        <button
                            onClick={() => { setEditingPromotion(undefined); setIsFormOpen(true); }}
                            className="mt-4 md:mt-0 bg-[#34baab] hover:bg-[#2da698] text-white p-4 md:px-8 md:py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-teal-500/20 transition-all active:scale-95"
                        >
                            <Plus className="w-6 h-6" />
                            <span className="hidden md:inline">Nueva Promo</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content - Carousel */}
            <div className="max-w-7xl mx-auto px-4 -mt-6">
                {promotions.length > 0 ? (
                    <div className="relative group/carousel">
                        {/* Carousel Container */}
                        <div
                            ref={carouselRef}
                            className="flex gap-4 md:gap-8 overflow-x-auto pb-8 pt-4 px-2 no-scrollbar scroll-smooth snap-x snap-mandatory"
                        >
                            {promotions.map((promo, index) => (
                                <div
                                    key={promo.id}
                                    className="flex-none w-[90vw] md:w-[450px] snap-center"
                                >
                                    <PromotionCard
                                        promotion={promo}
                                        isAdmin={isAdmin}
                                        onEdit={(p) => { setEditingPromotion(p); setIsFormOpen(true); }}
                                        onDelete={handleDelete}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Navigation Arrows (Internal) */}
                        {promotions.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrev}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/90 backdrop-blur-sm text-[#484450] rounded-2xl shadow-xl hover:bg-[#34baab] hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center z-10 border border-gray-100"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/90 backdrop-blur-sm text-[#484450] rounded-2xl shadow-xl hover:bg-[#34baab] hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center z-10 border border-gray-100"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}

                        {/* Pagination Dots */}
                        {promotions.length > 1 && (
                            <div className="flex justify-center gap-2 mt-4">
                                {promotions.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setCurrentIndex(index);
                                            scrollToIndex(index);
                                        }}
                                        className={`w-3 h-3 rounded-full transition-all duration-300 ${currentIndex === index
                                            ? 'bg-[#34baab] w-8'
                                            : 'bg-gray-300 hover:bg-gray-400'
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-[3rem] p-12 text-center shadow-inner border border-gray-100">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Tag className="w-8 h-8 text-gray-300" />
                        </div>
                        <h2 className="text-2xl font-black text-[#484450] mb-2">No hay promos por ahora</h2>
                        <p className="text-gray-500 font-medium">Estamos preparando nuevas ofertas para ti. ¡Vuelve pronto!</p>
                    </div>
                )}
            </div>

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

