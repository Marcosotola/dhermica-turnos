'use client';
// Force change for git detection


import { useState, useEffect, ElementType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, Calendar, Truck, Users, LayoutDashboard, LogOut, BookOpen, Settings, Sparkles, Tag, ShoppingBag, Bell, Share2, MapPin, DollarSign, Zap, TrendingDown, Download, Heart, Gift } from 'lucide-react';

import { Button } from '../ui/Button';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { usePWA } from '@/lib/hooks/usePWA';
import { IOSInstallModal } from '../pwa/IOSInstallModal';


export function TopNavbar() {
    const { user, profile, logout, loading: authLoading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    const router = useRouter();
    const { isInstallable, isIOS, isStandalone, installApp } = usePWA();
    const [showInstallHelp, setShowInstallHelp] = useState(false);
    const [showIOSInstall, setShowIOSInstall] = useState(false);

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

    const handleInstallClick = () => {
        setIsOpen(false);
        if (isStandalone) {
            setShowInstallHelp(true);
        } else if (isInstallable) {
            installApp();
        } else if (isIOS) {
            setShowIOSInstall(true);
        } else {
            setShowInstallHelp(true);
        }
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
            { href: '/egresos', label: 'Egresos', icon: TrendingDown },
            { href: '/agenda', label: 'Fichas', icon: BookOpen },
            { href: '/gift-cards', label: 'Gift Cards', icon: Gift },
            { href: '/aparatos', label: 'Aparatos', icon: Zap },
            { href: '/promociones', label: 'Promos', icon: Tag },
            { href: '/tratamientos', label: 'Servicios', icon: Sparkles },
            { href: '/productos', label: 'Productos', icon: ShoppingBag },
            { href: '/usuarios', label: 'Usuarios', icon: Settings },
            { href: '/profesionales', label: 'Profesionales', icon: Users },
            { href: '/alquileres', label: 'Alquiler', icon: Truck },
            { href: '/secretaria/notificaciones', label: 'Avisos', icon: Bell },
            { href: '/comunidad', label: 'Comunidad', icon: Users },
            { href: '/impacto', label: 'Impacto', icon: Heart },
        ] : []),
        // Professional only
        ...(role === 'professional' ? [
            { href: '/profesional', label: 'Mis Turnos', icon: Calendar },
            { href: '/finanzas', label: 'Mis Finanzas', icon: DollarSign },
            { href: '/agenda', label: 'Fichas', icon: BookOpen },
            { href: '/aparatos', label: 'Aparatos', icon: Zap },
            { href: '/tratamientos', label: 'Servicios', icon: Sparkles },
            { href: '/productos', label: 'Productos', icon: ShoppingBag },
            { href: '/promociones', label: 'Promos', icon: Tag },
            { href: '/comunidad', label: 'Comunidad', icon: Users },
            { href: '/impacto', label: 'Impacto', icon: Heart },
            { href: '/ubicacion', label: 'Ubicación', icon: MapPin },
        ] : []),
        // Secretary only
        ...(role === 'secretary' ? [
            { href: '/turnos', label: 'Turnos', icon: Calendar },
            { href: '/finanzas', label: 'Finanzas', icon: DollarSign },
            { href: '/egresos', label: 'Egresos', icon: TrendingDown },
            { href: '/agenda', label: 'Fichas', icon: BookOpen },
            { href: '/gift-cards', label: 'Gift Cards', icon: Gift },
            { href: '/aparatos', label: 'Aparatos', icon: Zap },
            { href: '/promociones', label: 'Promos', icon: Tag },
            { href: '/tratamientos', label: 'Servicios', icon: Sparkles },
            { href: '/productos', label: 'Productos', icon: ShoppingBag },
            { href: '/secretaria/notificaciones', label: 'Avisos', icon: Bell },
            { href: '/usuarios', label: 'Usuarios', icon: Settings },
            { href: '/ubicacion', label: 'Ubicación', icon: MapPin },
            { href: '/comunidad', label: 'Comunidad', icon: Users },
            { href: '/impacto', label: 'Impacto', icon: Heart },
            { href: '/alquileres', label: 'Alquiler', icon: Truck },
        ] : []),
        // Client and Promotor
        ...(role === 'client' || role === 'promotor' ? [
            { href: '/mis-turnos', label: 'Turnos', icon: Calendar },
            { href: '/tratamientos', label: 'Servicios', icon: Sparkles },
            { href: '/productos', label: 'Productos', icon: ShoppingBag },
            { href: '/promociones', label: 'Promociones', icon: Tag },
            { href: '/comunidad', label: 'Comunidad', icon: Users },
            { href: '/impacto', label: 'Impacto', icon: Heart },
            { href: '/ubicacion', label: 'Ubicación', icon: MapPin },
        ] : []),
        // Contador only
        ...(role === 'contador' ? [
            { href: '/mis-turnos', label: 'Turnos', icon: Calendar },
            { href: '/finanzas', label: 'Finanzas', icon: DollarSign },
            { href: '/tratamientos', label: 'Servicios', icon: Sparkles },
            { href: '/productos', label: 'Productos', icon: ShoppingBag },
            { href: '/promociones', label: 'Promociones', icon: Tag },
            { href: '/comunidad', label: 'Comunidad', icon: Users },
            { href: '/impacto', label: 'Impacto', icon: Heart },
            { href: '/ubicacion', label: 'Ubicación', icon: MapPin },
        ] : []),

    ];

    const NavContent = ({ mobile = false }) => (
        <div className={`flex flex-col h-full ${mobile ? 'p-6' : 'p-8'}`}>
            <div className="flex items-center gap-3 mb-10">
                <div className="w-12 h-12 bg-gradient-to-br from-[#34baab] to-[#2a9d8f] rounded-2xl flex items-center justify-center shadow-lg shadow-[#34baab]/20 transform transition-transform hover:rotate-3">
                    <LayoutDashboard className="w-7 h-7 text-white" />
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-black text-white tracking-tighter leading-none">Dhermica</span>
                    <span className="text-[10px] text-[#34baab] font-black uppercase tracking-[0.3em] mt-1">Estética Unisex</span>
                </div>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto min-h-0 pr-2 -mr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            href={link.disabled ? '#' : link.href}
                            className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group ${link.disabled ? 'opacity-40 cursor-not-allowed text-gray-400' :
                                isActive ? 'bg-[#34baab] text-white shadow-xl shadow-[#34baab]/20 translate-x-1' : 'text-gray-400 hover:text-white hover:bg-white/5 hover:translate-x-1'
                                }`}
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10 group-hover:scale-110'
                                }`}>
                                <Icon className="w-4.5 h-4.5" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="tracking-tight">{link.label}</span>
                                {link.disabled && <span className="text-[9px] uppercase tracking-widest opacity-60 font-black">Próximamente</span>}
                            </div>
                        </Link>
                    );
                })}

                <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                    {user && (
                        <div className="px-4 py-3 bg-white/5 rounded-2xl border border-white/5 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#34baab]/20 border border-[#34baab]/30 flex items-center justify-center overflow-hidden">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[#34baab] font-black text-sm">{profile?.fullName?.charAt(0) || 'U'}</span>
                                    )}

                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-white text-xs font-black truncate">{profile?.fullName || 'Usuario'}</span>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">{role}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
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
                            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl text-white font-black bg-[#34baab] shadow-lg shadow-[#34baab]/10 hover:brightness-110 active:scale-95 transition-all text-[9px] uppercase tracking-wider"
                        >
                            <Share2 className="w-4 h-4" />
                            <span>Compartir</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleInstallClick}
                            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl text-white/70 font-black bg-white/5 hover:bg-white/10 hover:text-white active:scale-95 transition-all border border-white/10 text-[9px] uppercase tracking-wider"
                        >
                            <Download className="w-4 h-4" />
                            <span>Instalar</span>
                        </button>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-red-400 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-red-400/10 transition-all group"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                    </button>

                    <p className="text-[9px] text-gray-600 uppercase font-black tracking-[0.3em] text-center pb-4">
                        v0.1.0 • 2024
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-[#484450] flex-col z-[100] shadow-2xl border-r border-white/5 overflow-hidden">
                <NavContent />
                {/* Decorative element */}
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#34baab]/5 rounded-full blur-3xl pointer-events-none" />
            </aside>

            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`lg:hidden fixed top-4 right-4 z-[130] p-3 rounded-2xl shadow-xl transition-all duration-300 active:scale-90 ${isOpen
                    ? 'bg-white text-[#484450] rotate-90 shadow-2xl'
                    : 'bg-[#34baab] text-white'
                    }`}
                aria-label="Menu"
            >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] animate-in fade-in duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile Menu Content */}
            <div className={`lg:hidden fixed top-0 right-0 bottom-0 w-[280px] bg-[#484450] z-[120] shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}>
                <NavContent mobile />
            </div>

            {/* Modals remain the same */}
            {showIOSInstall && <IOSInstallModal onClose={() => setShowIOSInstall(false)} />}
            {showInstallHelp && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500 sm:zoom-in">
                        <div className="relative p-6">
                            <button
                                type="button"
                                onClick={() => setShowInstallHelp(false)}
                                aria-label="Cerrar"
                                className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>

                            <div className="text-center mb-5">
                                <div className="w-16 h-16 bg-[#34baab]/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                    <Download className="w-8 h-8 text-[#34baab]" />
                                </div>
                                {isStandalone ? (
                                    <>
                                        <h3 className="text-xl font-black text-gray-900 mb-2">¡Ya la tenés instalada!</h3>
                                        <p className="text-gray-500 text-sm">Dhermica ya está instalada en tu dispositivo. Podés acceder directamente desde tu pantalla de inicio.</p>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-black text-gray-900 mb-1">Instalar Dhermica</h3>
                                        <p className="text-gray-500 text-sm">Seguí estos pasos para instalar la app:</p>
                                    </>
                                )}
                            </div>

                            {!isStandalone && (
                                <div className="space-y-2 mb-6">
                                    {[
                                        'Abrí esta página en Chrome o Edge',
                                        'Hacé clic en el ícono de instalación en la barra de direcciones (o en el menú del navegador)',
                                        'Seguí los pasos para completar la instalación',
                                    ].map((step, i) => (
                                        <div key={i} className="flex items-start gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                            <span className="w-7 h-7 bg-[#34baab] text-white text-xs font-black rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                            <p className="text-sm text-gray-700 font-medium">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setShowInstallHelp(false)}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] ${isStandalone ? 'bg-[#34baab] text-white' : 'bg-gray-900 text-white'}`}
                            >
                                {isStandalone ? '¡Perfecto!' : 'Entendido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
