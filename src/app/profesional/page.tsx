'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAppointmentsByProfessional } from '@/lib/firebase/appointments';
import { Appointment } from '@/lib/types/appointment';
import { Calendar, TrendingUp, Sparkles, BookOpen, ShoppingBag, MapPin } from 'lucide-react';
import { ProfileSection } from '@/components/dashboard/ProfileSection';
import { EditProfileModal } from '@/components/dashboard/EditProfileModal';
import { toast, Toaster } from 'sonner';
import { updateAppointment } from '@/lib/firebase/appointments';

export default function ProfesionalPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
        if (!authLoading && profile?.role !== 'professional') {
            router.push('/dashboard');
        }
    }, [user, profile, authLoading, router]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    if (profile?.role !== 'professional') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />

            {/* Header */}
            <div className="bg-[#484450] text-white">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <h1 className="text-4xl font-black tracking-tight mb-2">Panel Profesional</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-gray-300 font-medium">Bienvenida, {profile?.fullName}</p>
                        <span className="px-2 py-0.5 bg-violet-500/30 border border-violet-400/30 rounded-lg text-[10px] uppercase font-black tracking-widest text-white">
                            Profesional
                        </span>
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
                        onClick={() => router.push('/profesional/turnos')}
                        className="flex flex-col items-center justify-center bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 hover:shadow-xl hover:-translate-y-1 transition-all text-center group"
                    >
                        <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-violet-600 transition-colors">
                            <Calendar className="w-8 h-8 text-violet-600 group-hover:text-white transition-colors" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-1">Mis Turnos</h2>
                        <p className="hidden md:block text-xs text-gray-400 font-bold uppercase tracking-wider">Citas hoy y mañana</p>
                    </button>

                    {/* Fichas */}
                    <button
                        onClick={() => router.push('/agenda')}
                        className="flex flex-col items-center justify-center bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 hover:shadow-xl hover:-translate-y-1 transition-all text-center group"
                    >
                        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#34baab] transition-colors">
                            <BookOpen className="w-8 h-8 text-[#34baab] group-hover:text-white transition-colors" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-1">Fichas</h2>
                        <p className="hidden md:block text-xs text-gray-400 font-bold uppercase tracking-wider">Historial clínico</p>
                    </button>

                    {/* Servicios */}
                    <button
                        onClick={() => router.push('/tratamientos')}
                        className="flex flex-col items-center justify-center bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 hover:shadow-xl hover:-translate-y-1 transition-all text-center group"
                    >
                        <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                            <Sparkles className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-1">Servicios</h2>
                        <p className="hidden md:block text-xs text-gray-400 font-bold uppercase tracking-wider">Precios y más</p>
                    </button>

                    {/* Productos */}
                    <button
                        onClick={() => router.push('/productos')}
                        className="flex flex-col items-center justify-center bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 hover:shadow-xl hover:-translate-y-1 transition-all text-center group"
                    >
                        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#34baab] transition-colors">
                            <ShoppingBag className="w-8 h-8 text-[#34baab] group-hover:text-white transition-colors" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-1">Productos</h2>
                        <p className="hidden md:block text-xs text-gray-400 font-bold uppercase tracking-wider">Catálogo oficial</p>
                    </button>

                    {/* Promos */}
                    <button
                        onClick={() => router.push('/promociones')}
                        className="flex flex-col items-center justify-center bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 hover:shadow-xl hover:-translate-y-1 transition-all text-center group"
                    >
                        <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-pink-600 transition-colors">
                            <TrendingUp className="w-8 h-8 text-pink-600 group-hover:text-white transition-colors" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-1">Promos</h2>
                        <p className="hidden md:block text-xs text-gray-400 font-bold uppercase tracking-wider">Combos y ofertas</p>
                    </button>

                    {/* Ubicación */}
                    <button
                        onClick={() => router.push('/ubicacion')}
                        className="flex flex-col items-center justify-center bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 hover:shadow-xl hover:-translate-y-1 transition-all text-center group"
                    >
                        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 transition-colors">
                            <MapPin className="w-8 h-8 text-red-600 group-hover:text-white transition-colors" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-1">Ubicación</h2>
                        <p className="hidden md:block text-xs text-gray-400 font-bold uppercase tracking-wider">Dirección y mapa</p>
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
