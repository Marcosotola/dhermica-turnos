'use client';

import { Construction, ArrowLeft, Tag } from 'lucide-react';
import Link from 'next/link';

export default function PromocionesPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Tag className="w-8 h-8 text-pink-600" />
                </div>

                <h1 className="text-2xl font-black text-gray-900 mb-2">Promociones</h1>
                <p className="text-gray-500 mb-8">
                    Muy pronto encontrarás aquí nuestras mejores ofertas y paquetes especiales.
                    <br />
                    <span className="text-sm font-bold text-gray-400 block mt-2">¡Espéralo!</span>
                </p>

                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 text-[#34baab] font-bold hover:underline"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver al Panel
                </Link>
            </div>
        </div>
    );
}
