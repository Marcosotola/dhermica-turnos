'use client';

import { useState, useEffect, ElementType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, Calendar, Truck, Users, LayoutDashboard, LogOut, BookOpen, Settings, Sparkles, Tag, ShoppingBag, Bell, Share2, MapPin, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';


export function TopNavbar() {
    const { user, profile, logout, loading: authLoading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    const router = useRouter();

    // Close menu when route changes
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Track scroll for frosted glass effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!user || authLoading) return null;

    const role = profile?.role || 'client';

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    interface NavLink {
        href: string;
        label: string;
        icon: ElementType;
        disabled?: boolean;
    }

    const navLinks: NavLink[] = [
        { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
        // Admin only - in dashboard order
        ...(role === 'admin' ? [
            { href: '/turnos', label: 'Turnos', icon: Calendar },
            { href: '/finanzas', label: 'Finanzas', icon: DollarSign },
            { href: '/agenda', label: 'Fichas', icon: BookOpen },
            { href: '/promociones', label: 'Promociones', icon: Tag },
            { href: '/tratamientos', label: 'Servicios', icon: Sparkles },
            { href: '/productos', label: 'Productos', icon: ShoppingBag },
            { href: '/usuarios', label: 'Usuarios', icon: Settings },
            { href: '/profesionales', label: 'Profesionales', icon: Users },
            { href: '/alquileres', label: 'Alquiler', icon: Truck },
            { href: '/secretaria/notificaciones', label: 'Avisos', icon: Bell },
            { href: '/comunidad', label: 'Comunidad', icon: Users },
            { href: '/ubicacion', label: 'Ubicación', icon: MapPin },
        ] : []),
        // Professional only
        ...(role === 'professional' ? [
            { href: '/profesional/turnos', label: 'Mis Turnos', icon: Calendar },
            { href: '/finanzas', label: 'Mis Finanzas', icon: DollarSign },
            { href: '/agenda', label: 'Fichas', icon: BookOpen },
            { href: '/tratamientos', label: 'Servicios', icon: Sparkles },
            { href: '/productos', label: 'Productos', icon: ShoppingBag },
            { href: '/promociones', label: 'Promociones', icon: Tag },
            { href: '/comunidad', label: 'Comunidad', icon: Users },
            { href: '/ubicacion', label: 'Ubicación', icon: MapPin },
        ] : []),
        // Secretary only
        ...(role === 'secretary' ? [
            { href: '/turnos', label: 'Turnos', icon: Calendar },
            { href: '/agenda', label: 'Fichas', icon: BookOpen },
            { href: '/promociones', label: 'Promociones', icon: Tag },
            { href: '/tratamientos', label: 'Servicios', icon: Sparkles },
            { href: '/productos', label: 'Productos', icon: ShoppingBag },
            { href: '/secretaria/notificaciones', label: 'Avisos', icon: Bell },
            { href: '/usuarios', label: 'Usuarios', icon: Settings },
            { href: '/comunidad', label: 'Comunidad', icon: Users },
            { href: '/ubicacion', label: 'Ubicación', icon: MapPin },
        ] : []),
        // Client and Promotor
        ...(role === 'client' || role === 'promotor' ? [
            { href: '/mis-turnos', label: 'Turnos', icon: Calendar },
            { href: '/tratamientos', label: 'Servicios', icon: Sparkles },
            { href: '/productos', label: 'Productos', icon: ShoppingBag },
            { href: '/promociones', label: 'Promociones', icon: Tag },
            { href: '/comunidad', label: 'Comunidad', icon: Users },
            { href: '/ubicacion', label: 'Ubicación', icon: MapPin },
        ] : []),
    ];


    return (
        <>
            {/* Absolute Menu Button (Scrolls with page) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`absolute top-4 right-4 z-[100] p-3 rounded-2xl shadow-xl transition-all duration-300 active:scale-90 ${isOpen
                    ? 'fixed bg-white text-[#484450] rotate-90 shadow-2xl'
                    : 'bg-[#34baab] text-white'
                    }`}
                aria-label="Menu"
            >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] animate-in fade-in duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile Menu Content */}
            <div className={`fixed top-0 right-0 bottom-0 w-[280px] bg-[#484450] z-[120] shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#34baab] rounded-lg flex items-center justify-center">
                                <LayoutDashboard className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-black text-white tracking-tighter text-left">Dhermica</span>
                        </div>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto min-h-0 pr-2 -mr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;

                            return (
                                <Link
                                    key={link.href}
                                    href={link.disabled ? '#' : link.href}
                                    className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-base font-bold transition-all ${link.disabled ? 'opacity-40 cursor-not-allowed text-gray-400' :
                                        isActive ? 'bg-[#34baab] text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-white/5'
                                        }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span>{link.label}</span>
                                        {link.disabled && <span className="text-[10px] uppercase tracking-widest opacity-60">Próximamente</span>}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                        {user && (
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-red-400 font-bold hover:bg-red-400/10 transition-all"
                            >
                                <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center">
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <span>Cerrar Sesión</span>
                            </button>
                        )}

                        <div className="px-2">
                            <button
                                onClick={async () => {
                                    if (navigator.share) {
                                        try {
                                            await navigator.share({
                                                title: 'Dhermica Estética Unisex',
                                                text: '¡Mirá esta aplicación para gestionar tus turnos en Dhermica!',
                                                url: window.location.origin,
                                            });
                                        } catch (err) {
                                            console.error('Error sharing:', err);
                                        }
                                    } else {
                                        try {
                                            await navigator.clipboard.writeText(window.location.origin);
                                            alert('Enlace copiado al portapapeles');
                                        } catch (err) {
                                            console.error('Could not copy text: ', err);
                                        }
                                    }
                                }}
                                className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-white font-bold bg-[#34baab] shadow-lg hover:brightness-110 active:scale-95 transition-all"
                            >
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Share2 className="w-5 h-5" />
                                </div>
                                <span>Compartir App</span>
                            </button>
                        </div>

                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest text-center mt-4">
                            Dhermica v0.1.0
                        </p>
                    </div>

                </div>
            </div>
        </>
    );
}
