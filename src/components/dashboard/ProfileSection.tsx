'use client';

import React, { useState } from 'react';
import { User as UserIcon, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { UserProfile } from '@/lib/types/user';
import { NotificationToggle } from '@/components/pwa/NotificationToggle';

interface ProfileSectionProps {
    profile: UserProfile | null;
    onEditClick: () => void;
    className?: string;
}

export function ProfileSection({ profile, onEditClick, className = '' }: ProfileSectionProps) {
    const [isProfileCollapsed, setIsProfileCollapsed] = useState(true);

    if (!profile) return null;

    return (
        <div className={`${isProfileCollapsed ? 'col-span-2 md:col-span-1' : 'col-span-2'} bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ${className}`}>
            <button
                className={`w-full flex flex-col items-center justify-center p-4 group relative ${!isProfileCollapsed ? 'border-b border-gray-50' : ''}`}
                onClick={() => setIsProfileCollapsed(!isProfileCollapsed)}
            >
                <div className="w-10 h-10 bg-[#34baab]/10 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <UserIcon className="w-5 h-5 text-[#34baab]" />
                </div>
                <span className="text-base font-black text-gray-900 text-center">Mis Datos</span>
                <div className="absolute top-3 right-4 text-gray-400">
                    {isProfileCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
            </button>

            {!isProfileCollapsed && (
                <div className="p-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="mb-6">
                        <NotificationToggle />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100/50">
                            <p className="text-[9px] text-gray-500 font-black uppercase mb-0.5 tracking-wider">Nombre Completo</p>
                            <p className="font-extrabold text-gray-900 text-sm">{profile.fullName}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100/50">
                            <p className="text-[9px] text-gray-500 font-black uppercase mb-0.5 tracking-wider">Email</p>
                            <p className="font-extrabold text-gray-900 text-sm lowercase">{profile.email}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100/50">
                            <p className="text-[9px] text-gray-500 font-black uppercase mb-0.5 tracking-wider">Teléfono</p>
                            <p className="font-extrabold text-gray-900 text-sm">{profile.phone}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100/50">
                            <p className="text-[9px] text-gray-500 font-black uppercase mb-0.5 tracking-wider">Cumpleaños</p>
                            <p className="font-extrabold text-gray-900 text-sm">
                                {profile.birthDate ? (() => {
                                    const [y, m, d] = profile.birthDate.split('-');
                                    return `${d}/${m}/${y}`;
                                })() : 'No registrada'}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100/50">
                            <p className="text-[9px] text-gray-500 font-black uppercase mb-0.5 tracking-wider">Sexo</p>
                            <p className="font-extrabold text-gray-900 text-sm">{profile.sex === 'male' ? 'Masculino' : 'Femenino'}</p>
                        </div>
                        <div className={`p-3 rounded-xl border border-gray-100/50 ${profile.hasTattoos ? 'bg-orange-50/50' : 'bg-gray-50'}`}>
                            <p className="text-[9px] text-gray-500 font-black uppercase mb-0.5 tracking-wider">Tatuajes</p>
                            <p className={`font-extrabold text-sm ${profile.hasTattoos ? 'text-orange-600' : 'text-gray-900'}`}>{profile.hasTattoos ? 'SÍ' : 'NO'}</p>
                        </div>
                        {profile.sex === 'female' && (
                            <div className={`p-3 rounded-xl border border-gray-100/50 ${profile.isPregnant ? 'bg-pink-50/50' : 'bg-gray-50'}`}>
                                <p className="text-[9px] text-gray-400 font-black uppercase mb-0.5 tracking-wider">Embarazo</p>
                                <p className={`font-bold text-sm ${profile.isPregnant ? 'text-pink-600' : 'text-gray-900'}`}>{profile.isPregnant ? 'SÍ' : 'NO'}</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 space-y-2">
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider ml-1">Información Médica Relevante</p>
                        <div className="bg-red-50/30 p-4 rounded-xl border border-red-100/50">
                            <p className="text-sm text-gray-800 font-medium italic leading-relaxed">
                                {profile.relevantMedicalInfo || 'No hay información médica registrada.'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditClick();
                            }}
                            className="bg-[#34baab] hover:bg-[#2da698] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#34baab]/20 transition-all active:scale-95"
                        >
                            <Settings className="w-4 h-4" /> Editar Información
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
