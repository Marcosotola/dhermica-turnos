'use client';

import { Clock } from 'lucide-react';
import Link from 'next/link';

export default function PagoPendientePage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">Pago en revisión</h1>
                <p className="text-gray-500 text-sm max-w-xs">
                    Tu pago está siendo procesado. Cuando se apruebe, recibirás una notificación y tu turno quedará confirmado.
                </p>
            </div>
            <Link
                href="/mis-turnos"
                className="bg-[#34baab] hover:bg-[#2aa89a] text-white font-bold px-8 py-3 rounded-2xl transition-all"
            >
                Ver mis turnos
            </Link>
        </div>
    );
}
