'use client';

import { Sparkles, MapPin, Clock, Phone, Instagram, Facebook } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AboutPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="container mx-auto px-4 py-8">
                {/* Hero Section */}
                <div className="bg-[#484450] rounded-3xl p-8 mb-8 shadow-lg text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles className="w-32 h-32" />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-normal mb-4 pl-4 text-[#34baab]" style={{ fontFamily: "var(--font-amsterdam), sans-serif" }}>
                        Dhermica
                    </h1>




                    <p className="text-xl opacity-90 font-light tracking-widest uppercase">
                        Estética Unisex
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Mission Section */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Sparkles className="text-[#34baab]" /> Nuestra Misión
                        </h2>
                        <p className="text-gray-600 leading-relaxed">
                            En Dhermica, nos dedicamos a realzar tu belleza natural a través de tratamientos 
                            personalizados y tecnología de vanguardia. Nuestro compromiso es brindarte 
                            una experiencia de bienestar integral en un ambiente relajado y profesional.
                        </p>
                    </div>

                    {/* Contact Info */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Información de Contacto</h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-gray-600">
                                <MapPin className="text-[#34baab]" />
                                <span>Recta Martinolli esquina Pablo Buitrago</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <Clock className="text-[#34baab]" />
                                <span>Lun - Sáb: 07:30 - 19:30</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <Phone className="text-[#34baab]" />
                                <span>+54 9 351 202 1889</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social Media */}
                <div className="mt-8 bg-[#34baab] rounded-3xl p-8 text-white text-center">
                    <h2 className="text-2xl font-bold mb-6">Síguenos en nuestras redes</h2>
                    <div className="flex justify-center gap-8">
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                            <Instagram className="w-8 h-8" />
                        </a>
                        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                            <Facebook className="w-8 h-8" />
                        </a>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <button 
                        onClick={() => router.back()}
                        className="bg-gray-900 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors"
                    >
                        Volver al Panel
                    </button>
                </div>
            </div>
        </div>
    );
}
