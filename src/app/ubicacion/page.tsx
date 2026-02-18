'use client';

import React from 'react';
import { MapPin, Phone, Clock, ArrowLeft, Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function UbicacionPage() {
    const router = useRouter();
    const address = "Pablo Buitrago 6127, Córdoba, Argentina";
    const phone = "351 390-8626"; // From search, or 3512021889 as per user's whatsapp update
    const displayPhone = "351 202-1889"; // Using the WhatsApp number for consistency

    // Encoded address for Google Maps
    const mapQuery = encodeURIComponent(address);
    const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}&q=${mapQuery}`;

    // Fallback if no API key is provided - standard public embed URL
    const fallbackMapUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;

    const handleOpenInMaps = () => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${mapQuery}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-[#484450] text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 mb-6 text-gray-300 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Volver</span>
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#34baab] rounded-2xl shadow-lg">
                            <MapPin className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Estamos acá</h1>
                            <p className="text-gray-300 font-bold uppercase tracking-widest text-sm">Nuestra Ubicación</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Info Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 h-full">
                        <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                            Información de Contacto
                        </h2>

                        <div className="space-y-8">
                            {/* Address */}
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <MapPin className="w-6 h-6 text-[#34baab]" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Dirección</p>
                                    <p className="text-gray-900 font-bold leading-relaxed">
                                        {address}
                                    </p>
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Phone className="w-6 h-6 text-[#34baab]" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Teléfono</p>
                                    <p className="text-gray-900 font-bold">
                                        {displayPhone}
                                    </p>
                                </div>
                            </div>

                            {/* Hours - Generic Placeholder */}
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-6 h-6 text-[#34baab]" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Horarios</p>
                                    <p className="text-gray-900 font-bold">Martes a Viernes: 7:30 - 19:30</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12">
                            <Button
                                onClick={handleOpenInMaps}
                                className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-[#34baab] hover:bg-[#2da698] text-white shadow-xl transform active:scale-95 transition-all"
                            >
                                <Navigation className="w-5 h-5" />
                                Cómo llegar
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Map View */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 h-[400px] lg:h-full min-h-[400px]">
                        <iframe
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={fallbackMapUrl}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
