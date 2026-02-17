'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Calendar, TrendingUp, Sparkles, Scissors } from 'lucide-react';

export default function SecretariaPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

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
                    <h1 className="text-3xl font-bold mb-2">Panel de Secretaría</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-violet-100 font-medium">Bienvenida, {profile?.fullName}</p>
                        <span className="px-2 py-0.5 bg-violet-500/30 border border-violet-400/30 rounded-lg text-[10px] uppercase font-black tracking-widest text-white">
                            Secretaría
                        </span>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="max-w-7xl mx-auto px-4 py-8">
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

                    {/* Tratamientos */}
                    <button
                        onClick={() => router.push('/tratamientos')}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <Sparkles className="w-10 h-10 text-purple-600 group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Servicios</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Gestionar lista de servicios</p>
                    </button>

                    {/* Fichas */}
                    <button
                        onClick={() => router.push('/agenda')}
                        className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all text-center group"
                    >
                        <Scissors className="w-10 h-10 text-teal-600 group-hover:scale-110 transition-transform mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">Fichas</h2>
                        <p className="hidden md:block text-sm text-gray-500 mt-2">Historial y datos de clientes</p>
                    </button>
                </div>
            </div>
        </div>
    );
}
