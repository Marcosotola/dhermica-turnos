'use client';

import { RegisterForm } from '@/components/auth/RegisterForm';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function RegistroPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-blue-50 flex items-center justify-center p-4 pb-28 sm:pb-4">
            <Toaster position="top-center" richColors />
            
            <div className="max-w-md w-full">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 mb-6 text-gray-500 hover:text-gray-900 transition-colors group px-4 py-2 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20 w-fit"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-black uppercase tracking-widest">Volver</span>
                </button>

                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 backdrop-blur-sm bg-white/90">
                    <div className="p-8">
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-20 h-20 mb-4 flex items-center justify-center">
                                <img src="/logo.png" alt="Dhermica Logo" className="w-full h-full object-contain" />
                            </div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
                                Dhermica
                            </h1>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">
                                Registro de Nuevo Usuario
                            </p>
                        </div>

                        <RegisterForm onToggleMode={() => router.push('/')} />
                    </div>
                </div>
            </div>
        </div>
    );
}
