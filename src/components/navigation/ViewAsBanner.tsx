'use client';

import { useRouter } from 'next/navigation';
import { Eye, X } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

/** Aviso fijo mientras admin/secretaria navegan la app "como" un profesional. */
export function ViewAsBanner() {
    const { viewAs, stopViewAs } = useAuth();
    const router = useRouter();

    if (!viewAs) return null;

    const handleExit = () => {
        const professionalId = viewAs.professionalId;
        stopViewAs();
        router.push(`/profesionales/${professionalId}`);
    };

    return (
        <div className="sticky top-0 z-[60] bg-amber-400 text-amber-950 shadow-md">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-xs sm:text-sm font-bold min-w-0">
                    <Eye className="w-4 h-4 shrink-0" />
                    <span className="truncate">Estás viendo la app como <b>{viewAs.name}</b></span>
                </p>
                <button
                    type="button"
                    onClick={handleExit}
                    className="flex items-center gap-1 shrink-0 px-3 py-1.5 bg-amber-950 text-amber-50 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-amber-900 transition-colors"
                >
                    <X className="w-3.5 h-3.5" /> Salir
                </button>
            </div>
        </div>
    );
}
