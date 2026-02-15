'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Users, Search, Home, LayoutDashboard, BookOpen, Sparkles, Tag, ClipboardList } from 'lucide-react';
import { getTodayDate } from '@/lib/utils/time';
import { useAuth } from '@/lib/contexts/AuthContext';


interface NavTab {
    label: string;
    icon: any;
    href?: string;
    action?: () => void;
    active: boolean;
    primary?: boolean;
}

export function BottomNav() {
    const pathname_real = usePathname();
    const { user, profile } = useAuth();
    const router = useRouter();

    if (!user) return null;

    const role = profile?.role || 'client';
    const isManagement = role === 'admin' || role === 'professional' || role === 'secretary';


    const tabs: NavTab[] = [
        {
            label: 'Panel',
            icon: LayoutDashboard,
            href: '/dashboard',
            active: pathname_real === '/dashboard'
        },
        // Role-specific primary action
        ...(role === 'professional' ? [
            {
                label: 'Mis Turnos',
                icon: ClipboardList,
                href: '/profesional',
                primary: true,
                active: pathname_real === '/profesional'
            }
        ] : []),
        // Admin & Secretary specific
        ...(role === 'admin' || role === 'secretary' ? [
            {
                label: 'Fecha',
                icon: Calendar,
                action: () => {
                    if (pathname_real === '/turnos') {
                        window.dispatchEvent(new CustomEvent('toggle-datepicker'));
                    } else {
                        router.push('/turnos?action=datepicker');
                    }
                },
                active: false
            },
            {
                label: 'Agenda',
                icon: BookOpen,
                href: '/agenda',
                active: pathname_real === '/agenda'
            },
            {
                label: 'Hoy',
                icon: Home,
                action: () => {
                    const today = getTodayDate();
                    if (pathname_real === '/turnos') {
                        window.dispatchEvent(new CustomEvent('set-date', { detail: today }));
                    } else {
                        router.push(`/turnos?date=${today}`);
                    }
                },
                primary: true,
                active: pathname_real === '/turnos'
            },
            {
                label: 'Buscar',
                icon: Search,
                action: () => {
                    if (pathname_real === '/turnos') {
                        window.dispatchEvent(new CustomEvent('toggle-search'));
                    } else {
                        router.push('/turnos?action=search');
                    }
                },
                active: false
            }
        ] : []),
        // Client specific
        ...(role === 'client' ? [
            {
                label: 'Tratamientos',
                icon: Sparkles,
                href: '/tratamientos',
                active: pathname_real === '/tratamientos'
            },
            {
                label: 'Promociones',
                icon: Tag,
                href: '/promociones',
                active: pathname_real === '/promociones'
            },
            {
                label: 'Turnos',
                icon: ClipboardList,
                href: '/dashboard',
                primary: true,
                active: pathname_real === '/dashboard'
            }
        ] : []),
    ];


    return (
        <div className="fixed bottom-0 left-0 right-0 bg-[#484450] border-t border-white/10 px-6 py-3 flex items-center justify-between z-40 md:hidden shadow-[0_-8px_20px_rgba(0,0,0,0.3)] pb-safe">
            {tabs.map((tab, index) => {
                const Icon = tab.icon;

                if (tab.primary) {
                    const content = (
                        <div className={`p-4 rounded-2xl shadow-lg ring-4 ring-[#484450] active:scale-90 transition-all flex items-center justify-center ${tab.active ? 'bg-[#34baab] text-white' : 'bg-white/10 text-white/50'}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                    );

                    return (
                        <div key={index} className="relative -top-6">
                            {tab.action ? (
                                <button onClick={tab.action} className="focus:outline-none">
                                    {content}
                                </button>
                            ) : (
                                <Link href={tab.href!} className="focus:outline-none">
                                    {content}
                                </Link>
                            )}
                            <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-tight ${tab.active ? 'text-[#34baab]' : 'text-white/40'}`}>
                                {tab.label}
                            </span>
                        </div>
                    );
                }

                const Content = (
                    <div className="flex flex-col items-center gap-1 group py-1">
                        <div className="p-1 group-active:scale-95 transition-transform">
                            <Icon className={`w-6 h-6 ${tab.active ? 'text-[#34baab]' : 'text-white/40 group-hover:text-white/70'}`} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-tight ${tab.active ? 'text-[#34baab]' : 'text-white/40'}`}>
                            {tab.label}
                        </span>
                    </div>
                );

                if (tab.action) {
                    return (
                        <button key={index} onClick={tab.action} className="focus:outline-none">
                            {Content}
                        </button>
                    );
                }

                return (
                    <Link key={index} href={tab.href!} className="focus:outline-none">
                        {Content}
                    </Link>
                );
            })}
        </div>
    );
}
