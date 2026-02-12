'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, Calendar, Truck, Users, LayoutDashboard } from 'lucide-react';
import { Button } from '../ui/Button';

export function TopNavbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

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

    const navLinks = [
        { href: '/', label: 'Inicio', icon: Home },
        { href: '/alquileres', label: 'Alquileres', icon: Truck },
        { href: '/usuarios', label: 'Usuarios', icon: Users, disabled: true },
    ];

    return (
        <>
            {/* Floating Menu Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed top-4 right-4 z-[100] p-3 rounded-2xl shadow-2xl transition-all duration-300 active:scale-90 ${isOpen
                    ? 'bg-white text-[#484450] rotate-90'
                    : scrolled
                        ? 'bg-[#34baab] text-white'
                        : 'bg-[#484450] text-white'
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

                    <div className="space-y-2 flex-1">
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

                    <div className="mt-auto pt-6 border-t border-white/5">
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest text-center">
                            Dhermica v0.1.0
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
