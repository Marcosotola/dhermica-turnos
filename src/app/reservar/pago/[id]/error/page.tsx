'use client';

import { XCircle } from 'lucide-react';
import Link from 'next/link';

export default function PagoErrorPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">El pago no se completó</h1>
                <p className="text-gray-500 text-sm max-w-xs">
                    No pudimos procesar tu pago. Tu turno no fue reservado. Podés intentarlo de nuevo.
                </p>
            </div>
            <Link
                href="/reservar"
                className="bg-[#34baab] hover:bg-[#2aa89a] text-white font-bold px-8 py-3 rounded-2xl transition-all"
            >
                Volver a intentar
            </Link>
        </div>
    );
}
