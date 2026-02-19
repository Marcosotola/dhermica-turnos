'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Calendar, TrendingUp, Sparkles, ShoppingBag, BookOpen, Bell, MapPin, Users } from 'lucide-react';
import { ProfileSection } from '@/components/dashboard/ProfileSection';
import { EditProfileModal } from '@/components/dashboard/EditProfileModal';
import { Toaster } from 'sonner';

export default function SecretariaPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        if (!loading && (!user || profile?.role !== 'secretary')) {
            router.push('/dashboard');
        }
    }, [user, profile, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!user || profile?.role !== 'secretary') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Panel de Secretaría</h1>
                            <div className="flex items-center gap-2">
                                <p className="text-violet-100 font-medium">Bienvenida, {profile?.fullName}</p>
                                <span className="px-2 py-0.5 bg-violet-500/30 border border-violet-400/30 rounded-lg text-[10px] uppercase font-black tracking-widest text-white">
                                    Secretaría
                                </span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <ProfileSection
                        profile={profile}
                        onEditClick={() => setIsEditModalOpen(true)}
                    />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {/* Turnos */}
                    <button
                        onClick={() => router.push('/turnos')}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <Calendar className="w-10 h-10 text-violet-600 group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Turnos</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Gestionar todos los turnos</p>
                    </button>

                    {/* Promociones */}
                    <button
                        onClick={() => router.push('/promociones')}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <TrendingUp className="w-10 h-10 text-pink-600 group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Promos</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Gestionar ofertas y cupones</p>
                    </button>

                    {/* Servicios */}
                    <button
                        onClick={() => router.push('/tratamientos')}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <Sparkles className="w-10 h-10 text-purple-600 group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Servicios</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Gestionar lista de servicios</p>
                    </button>

                    {/* Productos */}
                    <button
                        onClick={() => router.push('/productos')}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <ShoppingBag className="w-10 h-10 text-[#34baab] group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Productos</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Stock y catálogo oficial</p>
                    </button>

                    {/* Fichas */}
                    <button
                        onClick={() => router.push('/agenda')}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <BookOpen className="w-10 h-10 text-teal-600 group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Fichas</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Historial y datos de clientes</p>
                    </button>

                    {/* Notificaciones */}
                    <button
                        onClick={() => router.push('/secretaria/notificaciones')}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <Bell className="w-10 h-10 text-amber-500 group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Avisos</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Enviar notificaciones push</p>
                    </button>

                    {/* Ubicación */}
                    <button
                        onClick={() => router.push('/ubicacion')}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <MapPin className="w-10 h-10 text-red-500 group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Ubicación</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Dirección y mapa</p>
                    </button>

                    {/* Comunidad */}
                    <button
                        onClick={() => router.push('/comunidad')}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <Users className="w-10 h-10 text-[#34baab] group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Comunidad</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Resultados e inspiración</p>
                    </button>
                </div>
            </div>
            {profile && (
                <EditProfileModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    user={profile}
                    onUpdate={() => window.location.reload()}
                />
            )}
        </div>
    );
}
