'use client';

import { useState, useEffect } from 'react';
import {
    Sparkles, Heart, MapPin, Phone, Clock, MessageCircle,
    ChevronRight, Users, X, ArrowRight, Shield, Calendar
} from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Toaster } from 'sonner';
import { ShoppingBag } from 'lucide-react';
import { getImpactImages } from '@/lib/firebase/impact';
import { getCommunityPosts } from '@/lib/firebase/community';
import { getTreatments } from '@/lib/firebase/treatments';
import { getProducts } from '@/lib/firebase/products';
import { ImpactImage } from '@/lib/types/impact';
import { CommunityPost } from '@/lib/types/community';
import { Treatment } from '@/lib/types/treatment';
import { Product } from '@/lib/types/product';
import { formatCurrencyWithSymbol } from '@/lib/utils/currency';

const MISSION_CARDS = [
    {
        icon: Heart,
        title: 'Necesidades Básicas',
        description: 'Cubrimos necesidades de techo, ropa y alimentos para los más vulnerables.',
    },
    {
        icon: Users,
        title: 'Acompañamiento',
        description: 'Estamos presentes con quienes atraviesan momentos difíciles.',
    },
    {
        icon: Shield,
        title: 'Contención',
        description: 'Brindamos consejería y motivación para superar momentos de angustia.',
    },
];

export function DesktopLanding() {
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [impactImages, setImpactImages] = useState<ImpactImage[]>([]);
    const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
    const [selectedImpactImage, setSelectedImpactImage] = useState<ImpactImage | null>(null);

    useEffect(() => {
        getTreatments().then(setTreatments).catch(console.error);
        getProducts().then(setProducts).catch(console.error);
        getImpactImages().then(images => setImpactImages(images.slice(0, 6))).catch(console.error);
        getCommunityPosts().then(posts =>
            setCommunityPosts(posts.filter(p => p.imageUrl || p.imageUrls?.length).slice(0, 6))
        ).catch(console.error);
    }, []);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    const openLogin = () => {
        setAuthMode('login');
        setShowAuthModal(true);
    };

    const openRegister = () => {
        setAuthMode('register');
        setShowAuthModal(true);
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Fixed Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
                    <span
                        className="text-3xl text-[#34baab]"
                        style={{ fontFamily: 'var(--font-amsterdam), sans-serif' }}
                    >
                        Dhermica
                    </span>

                    <div className="flex items-center gap-8">
                        <button onClick={() => scrollTo('servicios')} className="text-sm font-bold text-gray-600 hover:text-[#34baab] transition-colors">
                            Servicios
                        </button>
                        <button onClick={() => scrollTo('nosotros')} className="text-sm font-bold text-gray-600 hover:text-[#34baab] transition-colors">
                            Nosotros
                        </button>
                        <button onClick={() => scrollTo('impacto')} className="text-sm font-bold text-gray-600 hover:text-[#34baab] transition-colors">
                            Impacto Social
                        </button>
                        <button onClick={() => scrollTo('comunidad')} className="text-sm font-bold text-gray-600 hover:text-[#34baab] transition-colors">
                            Comunidad
                        </button>
                        <button onClick={() => scrollTo('contacto')} className="text-sm font-bold text-gray-600 hover:text-[#34baab] transition-colors">
                            Contacto
                        </button>
                        <button
                            onClick={openLogin}
                            className="bg-[#34baab] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#2da698] transition-all hover:shadow-lg hover:shadow-[#34baab]/20 active:scale-95"
                        >
                            Iniciar Sesión
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-teal-50" />
                <div className="absolute top-20 right-20 w-96 h-96 bg-[#34baab]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-20 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

                <div className="relative z-10 text-center max-w-4xl mx-auto px-8">
                    <div className="mb-8">
                        <h1
                            className="text-8xl text-[#34baab] mb-4"
                            style={{ fontFamily: 'var(--font-amsterdam), sans-serif' }}
                        >
                            Dhermica
                        </h1>
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="h-px w-16 bg-gray-300" />
                            <p className="text-sm font-black text-gray-400 uppercase tracking-[0.4em]">
                                Estética Unisex
                            </p>
                            <div className="h-px w-16 bg-gray-300" />
                        </div>
                    </div>

                    <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-6 leading-tight">
                        Más que Estética,<br />
                        <span className="text-[#34baab]">un Propósito</span>
                    </h2>

                    <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
                        Transformamos tu bienestar con tratamientos de calidad profesional.
                        Cada visita impulsa nuestra misión social.
                    </p>

                    <div className="flex items-center justify-center gap-4">
                        <a
                            href="https://wa.me/5493513908626?text=Hola!%20Me%20gustar%C3%ADa%20realizar%20una%20consulta."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#25D366] text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#20bd5a] transition-all hover:shadow-lg hover:shadow-green-200 active:scale-95 flex items-center gap-3"
                        >
                            <MessageCircle className="w-5 h-5" />
                            Escribinos
                        </a>
                        <button
                            onClick={openRegister}
                            className="bg-[#484450] text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#3a3640] transition-all hover:shadow-lg active:scale-95 flex items-center gap-3"
                        >
                            Crear Cuenta
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
                    <button onClick={() => scrollTo('servicios')} className="text-gray-300 hover:text-[#34baab] transition-colors">
                        <ChevronRight className="w-8 h-8 rotate-90" />
                    </button>
                </div>
            </section>

            {/* Services / Treatments Section */}
            <section id="servicios" className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="text-center mb-16">
                        <p className="text-sm font-black text-[#34baab] uppercase tracking-[0.3em] mb-3">Nuestros Servicios</p>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">
                            Catálogo de Tratamientos
                        </h2>
                        <p className="text-gray-500 font-medium max-w-xl mx-auto">
                            Descubrí nuestra amplia gama de tratamientos estéticos pensados para tu bienestar.
                        </p>
                    </div>

                    {treatments.length > 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {treatments.map((treatment) => {
                                const minPrice = treatment.prices.length > 0
                                    ? Math.min(...treatment.prices.map(p => p.price))
                                    : 0;
                                return (
                                    <div
                                        key={treatment.id}
                                        className="group relative bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm hover:shadow-xl hover:border-[#34baab]/20 hover:-translate-y-1 transition-all p-6 overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50/50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
                                        <div className="relative z-10">
                                            <div className="w-12 h-12 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-lg shadow-teal-100 mb-4">
                                                <Sparkles className="w-6 h-6 text-white" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#34baab] bg-teal-50 px-3 py-1 rounded-full mb-3 inline-block">
                                                {treatment.category}
                                            </span>
                                            <h3 className="text-lg font-black text-gray-900 leading-tight group-hover:text-[#34baab] transition-colors mb-2">
                                                {treatment.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 font-medium">
                                                {treatment.shortDescription}
                                            </p>
                                            <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                                                <div>
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">Desde</span>
                                                    <p className="text-lg font-black text-gray-900">{formatCurrencyWithSymbol(minPrice)}</p>
                                                </div>
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-[#34baab] group-hover:text-white transition-all text-gray-400">
                                                    <ChevronRight className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex justify-center py-16">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34baab]" />
                        </div>
                    )}
                </div>
            </section>

            {/* Products Section */}
            {products.length > 0 && (
                <section id="productos" className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-8">
                        <div className="text-center mb-16">
                            <p className="text-sm font-black text-[#34baab] uppercase tracking-[0.3em] mb-3">Tienda</p>
                            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">
                                Productos de Cuidado
                            </h2>
                            <p className="text-gray-500 font-medium max-w-xl mx-auto">
                                Llevá el cuidado de Dhermica a tu casa con nuestros productos seleccionados.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all"
                                >
                                    {product.images?.[0] ? (
                                        <div className="aspect-square relative overflow-hidden bg-gray-50">
                                            <img
                                                src={product.images[0]}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                    ) : (
                                        <div className="aspect-square bg-gray-50 flex items-center justify-center">
                                            <ShoppingBag className="w-12 h-12 text-gray-200" />
                                        </div>
                                    )}
                                    <div className="p-5">
                                        <h3 className="font-black text-gray-900 mb-1 group-hover:text-[#34baab] transition-colors line-clamp-1">
                                            {product.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 mb-3 font-medium">
                                            {product.description}
                                        </p>
                                        <p className="text-lg font-black text-gray-900">
                                            {formatCurrencyWithSymbol(product.price)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* About Section */}
            <section id="nosotros" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <p className="text-sm font-black text-[#34baab] uppercase tracking-[0.3em] mb-3">Quiénes Somos</p>
                            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-6">
                                El Corazón de <span className="text-[#34baab]">Dhermica</span>
                            </h2>
                            <div className="space-y-5 text-gray-600 leading-relaxed">
                                <p className="text-lg font-medium text-gray-900 italic border-l-4 border-[#34baab] pl-6 py-2">
                                    "Creemos que la verdadera transformación comienza desde adentro."
                                </p>
                                <p>
                                    Dhermica nació bajo la premisa de <strong>"tener más para ayudar más"</strong>.
                                    Pero nuestra ayuda va más allá de lo material. Entendemos que muchas personas
                                    atraviesan momentos de angustia o soledad, y por eso nuestro espacio es un lugar
                                    de escucha, una palabra de aliento, un abrazo sincero que trasciende cualquier
                                    servicio estético.
                                </p>
                                <p>
                                    Con cada tratamiento, estás apoyando nuestras misiones sociales. Tu visita se
                                    transforma en ayuda real para quienes más lo necesitan.
                                </p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-[#484450] to-[#3a3640] rounded-[2.5rem] p-10 text-white shadow-2xl">
                            <h3
                                className="text-5xl text-[#34baab] mb-6"
                                style={{ fontFamily: 'var(--font-amsterdam), sans-serif' }}
                            >
                                Dhermica
                            </h3>
                            <p className="text-xl font-light tracking-[0.2em] uppercase text-gray-300 mb-8">
                                Más que Estética, un Propósito
                            </p>
                            <div className="grid grid-cols-3 gap-4">
                                {MISSION_CARDS.map((card) => {
                                    const Icon = card.icon;
                                    return (
                                        <div key={card.title} className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/5">
                                            <Icon className="w-6 h-6 text-[#34baab] mb-3" />
                                            <h4 className="text-sm font-bold mb-1">{card.title}</h4>
                                            <p className="text-xs text-gray-400 leading-relaxed">{card.description}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Impact Section */}
            <section id="impacto" className="py-24 bg-[#484450] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#34baab]/10 rounded-full -mr-48 -mt-48 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500/10 rounded-full -ml-48 -mb-48 blur-3xl" />

                <div className="max-w-7xl mx-auto px-8 relative z-10">
                    <div className="text-center mb-16">
                        <p className="text-sm font-black text-[#34baab] uppercase tracking-[0.3em] mb-3">Impacto Social</p>
                        <h2 className="text-4xl font-black tracking-tight mb-4">
                            Un Momento para <span className="text-[#34baab]">Vos</span>,
                            una Bendición para <span className="text-[#34baab]">Otros</span>
                        </h2>
                        <p className="text-gray-400 font-medium max-w-2xl mx-auto text-lg">
                            Con cada tratamiento en Dhermica, estás apoyando nuestras misiones sociales.
                            Aquí compartimos algunos de los momentos donde tu elección se convirtió en esperanza.
                        </p>
                    </div>

                    {impactImages.length > 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                            {impactImages.map((image) => (
                                <div
                                    key={image.id}
                                    onClick={() => setSelectedImpactImage(image)}
                                    className="group cursor-pointer rounded-2xl overflow-hidden border border-white/10 hover:border-[#34baab]/40 transition-all hover:shadow-xl hover:shadow-[#34baab]/10"
                                >
                                    <div className="aspect-[4/3] relative overflow-hidden">
                                        <img
                                            src={image.imageUrl}
                                            alt={image.description}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <p className="text-white text-sm font-medium italic line-clamp-2">"{image.description}"</p>
                                            <div className="flex items-center gap-2 mt-2 text-[10px] text-white/60 font-bold uppercase tracking-widest">
                                                <Heart className="w-3 h-3 text-[#34baab] fill-[#34baab]" />
                                                Misión Dhermica
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-8 mb-12">
                            {MISSION_CARDS.map((card) => {
                                const Icon = card.icon;
                                return (
                                    <div key={card.title} className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 text-center hover:bg-white/10 transition-all">
                                        <div className="w-16 h-16 bg-[#34baab]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                            <Icon className="w-8 h-8 text-[#34baab]" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3">{card.title}</h3>
                                        <p className="text-gray-400">{card.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="text-center">
                        <div className="bg-[#34baab] inline-block rounded-2xl px-10 py-5 shadow-xl shadow-[#34baab]/20">
                            <p className="text-lg font-bold">
                                Creemos que Dios nos bendice para ser de bendición.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Impact Lightbox */}
            {selectedImpactImage && (
                <div
                    className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-8"
                    onClick={() => setSelectedImpactImage(null)}
                >
                    <button className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                    <div className="max-w-4xl w-full flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
                        <img
                            src={selectedImpactImage.imageUrl}
                            alt={selectedImpactImage.description}
                            className="max-h-[70vh] w-auto rounded-2xl shadow-2xl"
                        />
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl w-full text-white text-center">
                            <p className="text-xl font-medium italic leading-relaxed">
                                "{selectedImpactImage.description}"
                            </p>
                            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-white/60 font-bold uppercase tracking-widest">
                                <span className="text-[#34baab]">Misión Dhermica</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Community Section */}
            <section id="comunidad" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="text-center mb-16">
                        <p className="text-sm font-black text-[#34baab] uppercase tracking-[0.3em] mb-3">Comunidad</p>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">
                            Resultados Reales, Inspiración Constante
                        </h2>
                        <p className="text-gray-500 font-medium max-w-xl mx-auto">
                            Nuestra comunidad comparte sus transformaciones. Creá tu cuenta para ver resultados
                            y compartir tu propia experiencia.
                        </p>
                    </div>

                    {communityPosts.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                                {communityPosts.map((post) => {
                                    const imageUrl = post.imageUrls?.[0] || post.imageUrl;
                                    return (
                                        <div
                                            key={post.id}
                                            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-lg hover:-translate-y-1 transition-all"
                                        >
                                            <div className="aspect-square relative overflow-hidden">
                                                <img
                                                    src={imageUrl}
                                                    alt={post.content}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>
                                            <div className="p-4">
                                                <p className="text-sm text-gray-700 font-medium line-clamp-2 italic">
                                                    "{post.content}"
                                                </p>
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                                        {post.userName}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-[10px] text-[#34baab] font-bold">
                                                        <Heart className="w-3 h-3 fill-[#34baab]" />
                                                        {post.likes?.length || 0}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="text-center">
                                <button
                                    onClick={openRegister}
                                    className="bg-[#34baab] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#2da698] transition-all hover:shadow-lg hover:shadow-[#34baab]/20 active:scale-95 inline-flex items-center gap-2"
                                >
                                    Unite a la Comunidad <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="bg-gradient-to-br from-gray-50 to-teal-50/30 rounded-[2.5rem] p-12 text-center border border-gray-100">
                            <Users className="w-16 h-16 text-[#34baab]/30 mx-auto mb-6" />
                            <h3 className="text-2xl font-black text-gray-900 mb-3">Unite a la Comunidad</h3>
                            <p className="text-gray-500 mb-8 max-w-md mx-auto">
                                Registrate para ver los resultados de nuestros tratamientos y compartir tu propia transformación.
                            </p>
                            <button
                                onClick={openRegister}
                                className="bg-[#34baab] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#2da698] transition-all hover:shadow-lg hover:shadow-[#34baab]/20 active:scale-95 inline-flex items-center gap-2"
                            >
                                Crear Mi Cuenta <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Contact & Location Section */}
            <section id="contacto" className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="text-center mb-16">
                        <p className="text-sm font-black text-[#34baab] uppercase tracking-[0.3em] mb-3">Contacto</p>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">
                            Estamos Acá
                        </h2>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
                            <div className="flex gap-4 items-start">
                                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <MapPin className="w-6 h-6 text-[#34baab]" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Dirección</p>
                                    <p className="text-gray-900 font-bold">Av. Recta Martinolli 8102, Córdoba, Argentina</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Phone className="w-6 h-6 text-[#34baab]" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Teléfono</p>
                                    <p className="text-gray-900 font-bold">351 390-8626</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-6 h-6 text-[#34baab]" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Horarios</p>
                                    <p className="text-gray-900 font-bold">Martes a Viernes: 7:30 - 19:30</p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Calendar className="w-6 h-6 text-[#34baab]" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Reservas</p>
                                    <p className="text-gray-900 font-bold">Online o por WhatsApp</p>
                                </div>
                            </div>

                            <a
                                href="https://wa.me/5493513908626?text=Hola!%20Me%20gustar%C3%ADa%20realizar%20una%20consulta."
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-[#25D366] text-white py-4 rounded-xl font-bold hover:bg-[#20bd5a] transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Escribinos por WhatsApp
                            </a>
                        </div>

                        <div className="lg:col-span-2 bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 min-h-[400px]">
                            <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0, minHeight: '400px' }}
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                src={`https://www.google.com/maps?q=${encodeURIComponent('Av. Recta Martinolli 8102, Córdoba, Argentina')}&output=embed`}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#484450] text-white py-16">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="grid md:grid-cols-3 gap-12 mb-12">
                        <div>
                            <span
                                className="text-3xl text-[#34baab] block mb-4"
                                style={{ fontFamily: 'var(--font-amsterdam), sans-serif' }}
                            >
                                Dhermica
                            </span>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Estética Unisex con propósito social.
                                Cada tratamiento impulsa nuestra misión de ayudar a quienes más lo necesitan.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-bold text-sm uppercase tracking-widest mb-4 text-gray-300">Enlaces</h4>
                            <div className="space-y-3">
                                <button onClick={() => scrollTo('servicios')} className="block text-gray-400 hover:text-[#34baab] transition-colors text-sm">
                                    Servicios
                                </button>
                                <button onClick={() => scrollTo('nosotros')} className="block text-gray-400 hover:text-[#34baab] transition-colors text-sm">
                                    Nosotros
                                </button>
                                <button onClick={() => scrollTo('impacto')} className="block text-gray-400 hover:text-[#34baab] transition-colors text-sm">
                                    Impacto Social
                                </button>
                                <button onClick={() => scrollTo('comunidad')} className="block text-gray-400 hover:text-[#34baab] transition-colors text-sm">
                                    Comunidad
                                </button>
                                <button onClick={() => scrollTo('contacto')} className="block text-gray-400 hover:text-[#34baab] transition-colors text-sm">
                                    Contacto
                                </button>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-sm uppercase tracking-widest mb-4 text-gray-300">Mi Cuenta</h4>
                            <div className="space-y-3">
                                <button onClick={openLogin} className="block text-gray-400 hover:text-[#34baab] transition-colors text-sm">
                                    Iniciar Sesión
                                </button>
                                <button onClick={openRegister} className="block text-gray-400 hover:text-[#34baab] transition-colors text-sm">
                                    Crear Cuenta
                                </button>
                                <a
                                    href="https://wa.me/5493513908626"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-gray-400 hover:text-[#25D366] transition-colors text-sm"
                                >
                                    WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/10 pt-8 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            &copy; {new Date().getFullYear()} Dhermica Estética Unisex. Todos los derechos reservados.
                        </p>
                        <p className="text-sm text-gray-500">
                            Córdoba, Argentina
                        </p>
                    </div>
                </div>
            </footer>

            {/* Auth Modal */}
            {showAuthModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowAuthModal(false)}
                    />
                    <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowAuthModal(false)}
                            className="absolute top-4 right-4 z-20 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>

                        <div className="p-8">
                            <div className="flex flex-col items-center mb-8">
                                <div className="w-16 h-16 mb-4 flex items-center justify-center">
                                    <img src="/logo.png" alt="Dhermica Logo" className="w-full h-full object-contain" />
                                </div>
                                <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Dhermica</h2>
                            </div>

                            <div className="flex mb-8 p-1 bg-gray-100 rounded-2xl">
                                <button
                                    onClick={() => setAuthMode('login')}
                                    className={`flex-1 py-3 text-sm font-black uppercase tracking-wider rounded-xl transition-all ${authMode === 'login'
                                        ? 'bg-white text-[#34baab] shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Iniciar Sesión
                                </button>
                                <button
                                    onClick={() => setAuthMode('register')}
                                    className={`flex-1 py-3 text-sm font-black uppercase tracking-wider rounded-xl transition-all ${authMode === 'register'
                                        ? 'bg-white text-[#34baab] shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Crear Cuenta
                                </button>
                            </div>

                            <Toaster position="top-center" richColors />

                            {authMode === 'login' ? (
                                <LoginForm onToggleMode={() => setAuthMode('register')} />
                            ) : (
                                <RegisterForm onToggleMode={() => setAuthMode('login')} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
