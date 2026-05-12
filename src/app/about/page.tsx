'use client';

import { Sparkles, Heart, HandHelping, MessageCircle, Home, Quote } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AboutPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="container mx-auto px-4 py-8">
                {/* Hero Section */}
                <div className="bg-[#484450] rounded-3xl p-12 mb-8 shadow-lg text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles className="w-48 h-48" />
                    </div>
                    <h1 className="text-6xl md:text-8xl font-normal mb-2 text-[#34baab]" style={{ fontFamily: "var(--font-amsterdam), sans-serif" }}>
                        Dhermica
                    </h1>
                    <p className="text-xl opacity-90 font-light tracking-[0.3em] uppercase">
                        Más que Estética, un Propósito
                    </p>
                </div>

                <div className="max-w-4xl mx-auto space-y-8">
                    {/* The Heart of Dhermica */}
                    <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-gray-100 relative">
                        <div className="absolute -top-6 left-12 w-12 h-12 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-lg">
                            <Heart className="text-white w-6 h-6" />
                        </div>
                        
                        <h2 className="text-3xl font-black text-gray-900 mb-8 tracking-tighter">El Corazón de Dhermica</h2>
                        
                        <div className="space-y-6 text-gray-600 leading-relaxed text-lg">
                            <p className="font-medium text-gray-900 italic border-l-4 border-[#34baab] pl-6 py-2">
                                "Creemos que la verdadera transformación comienza desde adentro. Nuestra historia no nace de la búsqueda de éxito comercial, sino de un profundo sentido de responsabilidad y gratitud."
                            </p>

                            <section className="space-y-4">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Sparkles className="text-[#34baab] w-5 h-5" /> Nuestra Raíz: La Mano de Dios
                                </h3>
                                <p>
                                    Hubo un tiempo en que nosotros también enfrentamos la dificultad. En ese momento de angustia, experimentamos la mano de Dios a través de personas que se acercaron para sostenernos. Esa vivencia cambió nuestra vida para siempre y nos regaló una misión: ser, para otros, ese granito de arena que les permita conocer a Dios y vivir un cambio real en todas las áreas de su vida.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <MessageCircle className="text-[#34baab] w-5 h-5" /> Más que un Tratamiento, una Caricia al Alma
                                </h3>
                                <p>
                                    Dhermica nació bajo la premisa de <strong>"tener más para ayudar más"</strong>. Pero nuestra ayuda va más allá de lo material. Entendemos que muchas personas atraviesan momentos de angustia o soledad, y por eso nuestro espacio es un lugar de escucha, una palabra de aliento, un consejo o simplemente un abrazo sincero que trasciende cualquier servicio estético.
                                </p>
                            </section>
                        </div>
                    </div>

                    {/* Social Mission Cards */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center group hover:border-[#34baab]/30 transition-all">
                            <div className="w-12 h-12 bg-teal-50 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Home className="text-[#34baab] w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Necesidades Básicas</h4>
                            <p className="text-xs text-gray-500">Cubrimos necesidades de techo, ropa y alimentos para los más vulnerables.</p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center group hover:border-[#34baab]/30 transition-all">
                            <div className="w-12 h-12 bg-teal-50 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <HandHelping className="text-[#34baab] w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Acompañamiento</h4>
                            <p className="text-xs text-gray-500">Estamos presentes con quienes atraviesan momentos difíciles en hospitales.</p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center group hover:border-[#34baab]/30 transition-all">
                            <div className="w-12 h-12 bg-teal-50 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Quote className="text-[#34baab] w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Contención</h4>
                            <p className="text-xs text-gray-500">Brindamos consejería y motivación para superar momentos de angustia.</p>
                        </div>
                    </div>

                    {/* Link to Impact Gallery */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-center space-y-6">
                        <div className="w-16 h-16 bg-[#34baab]/10 rounded-2xl flex items-center justify-center mx-auto">
                            <Heart className="text-[#34baab] w-8 h-8 fill-[#34baab]" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Un Momento para Vos, una Bendición para Otros</h3>
                            <p className="text-gray-500 max-w-xl mx-auto">
                                Te invitamos a conocer el álbum de nuestras misiones sociales. Mirá cómo tu visita a Dhermica se transforma en ayuda real.
                            </p>
                        </div>
                        <button 
                            onClick={() => router.push('/impacto')}
                            className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                        >
                            Ver Galería de Impacto <Sparkles className="w-4 h-4 text-[#34baab]" />
                        </button>
                    </div>

                    {/* Final Message */}

                    <div className="bg-[#34baab] rounded-[2.5rem] p-8 md:p-12 text-white text-center shadow-xl shadow-teal-100">
                        <h2 className="text-2xl md:text-3xl font-black mb-6 tracking-tighter">Nuestro Propósito Principal</h2>
                        <p className="text-lg opacity-90 font-medium mb-8 max-w-2xl mx-auto leading-relaxed">
                            Creemos que Dios nos bendice para ser de bendición. En Dhermica, nuestro mayor éxito es que salgas de aquí con el corazón renovado.
                        </p>
                        <button 
                            onClick={() => router.push('/dashboard')}
                            className="bg-white text-[#34baab] px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95 shadow-lg"
                        >
                            Volver al Panel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
