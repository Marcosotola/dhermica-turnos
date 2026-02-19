'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getCommunityPosts, deleteCommunityPost, toggleLikePost } from '@/lib/firebase/community';
import { CommunityPost } from '@/lib/types/community';
import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import { CommunityPostForm } from '@/components/community/CommunityPostForm';
import { Button } from '@/components/ui/Button';
import { Plus, Users, Image as ImageIcon, Search } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { toast, Toaster } from 'sonner';
import { haptics } from '@/lib/utils/haptics';
import { getTreatments } from '@/lib/firebase/treatments';
import { Treatment } from '@/lib/types/treatment';

export default function CommunityPage() {
    const { profile, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [filterTreatmentId, setFilterTreatmentId] = useState('');

    const isAdmin = profile?.role === 'admin';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [postsData, treatmentsData] = await Promise.all([
                getCommunityPosts(),
                getTreatments()
            ]);
            setPosts(postsData);
            setTreatments(treatmentsData);
        } catch (error) {
            console.error('Error loading community data:', error);
            toast.error('Error al cargar el muro');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (post: CommunityPost) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return;

        try {
            haptics.medium();
            await deleteCommunityPost(post.id, post.imageUrl);
            setPosts(posts.filter(p => p.id !== post.id));
            toast.success('Publicación eliminada correctamente');
        } catch (error) {
            console.error('Error deleting post:', error);
            toast.error('No se pudo eliminar la publicación');
        }
    };

    const handleLike = async (postId: string) => {
        if (!profile) {
            toast.error('Inicia sesión para interactuar');
            return;
        }

        try {
            await toggleLikePost(postId, profile.uid);
            // Optimistic update
            setPosts(posts.map(p => {
                if (p.id === postId) {
                    const isLiked = p.likes.includes(profile.uid);
                    return {
                        ...p,
                        likes: isLiked
                            ? p.likes.filter(id => id !== profile.uid)
                            : [...p.likes, profile.uid]
                    };
                }
                return p;
            }));
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };

    const filteredPosts = filterTreatmentId
        ? posts.filter(p => p.treatmentId === filterTreatmentId)
        : posts;

    if (authLoading) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" />

            {/* Elegant Header */}
            <div className="bg-[#484450] text-white pt-20 md:pt-10 pb-16 px-4 md:px-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#34baab]/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />

                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-lg shadow-teal-900/20">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tighter italic">Comunidad<span className="text-[#34baab]">.</span></h1>
                            <p className="text-white/60 text-sm font-medium">Resultados reales, inspiración constante</p>
                        </div>
                    </div>

                    <Button
                        onClick={() => { haptics.light(); setIsFormOpen(true); }}
                        className="mt-6 !bg-white !text-[#484450] hover:bg-teal-50 rounded-2xl py-4 px-6 font-black shadow-xl border-none"
                    >
                        <Plus className="w-5 h-5 mr-2 !text-[#484450]" />
                        Compartir Mi Resultado
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-20">
                <div className="bg-white rounded-3xl shadow-xl p-4 border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Search className="w-5 h-5 text-gray-400" />
                        <select
                            value={filterTreatmentId}
                            onChange={(e) => setFilterTreatmentId(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900 w-full"
                        >
                            <option value="">Todos los resultados</option>
                            {treatments.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Content Feed */}
            <div className="max-w-4xl mx-auto px-4 mt-8">
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <CardSkeleton key={i} />
                        ))}
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <ImageIcon className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900">Aún no hay resultados</h3>
                        <p className="text-gray-400 font-medium">Sé el primero en inspirar a la comunidad</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6">
                        {filteredPosts.map((post, index) => (
                            <CommunityPostCard
                                key={post.id}
                                post={post}
                                isAdmin={isAdmin}
                                onDelete={handleDelete}
                                onLike={handleLike}
                                treatmentName={treatments.find(t => t.id === post.treatmentId)?.name}
                                priority={index < 2} // Cargar con prioridad las primeras 2 imágenes
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Post Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#484450]/80 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
                    <div className="bg-white w-full max-w-xl rounded-[3rem] p-6 md:p-10 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <CommunityPostForm
                            onSuccess={() => { setIsFormOpen(false); loadData(); }}
                            onCancel={() => setIsFormOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
