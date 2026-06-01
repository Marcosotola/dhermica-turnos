'use client';

import React from 'react';
import { Select } from './Select';
import { Input } from './Input';

interface PhoneInputProps {
    label?: string;
    countryCode: string;
    onCountryCodeChange: (code: string) => void;
    phoneNumber: string;
    onPhoneNumberChange: (number: string) => void;
    error?: string;
    required?: boolean;
    className?: string;
}

export function PhoneInput({
    label,
    countryCode,
    onCountryCodeChange,
    phoneNumber,
    onPhoneNumberChange,
    error,
    required,
    className = ''
}: PhoneInputProps) {
    const countries = [
        { value: '+54', label: '🇦🇷', name: 'Argentina' },
        { value: '+598', label: '🇺🇾', name: 'Uruguay' },
        { value: '+56', label: '🇨🇱', name: 'Chile' },
        { value: '+55', label: '🇧🇷', name: 'Brasil' },
        { value: '+595', label: '🇵🇾', name: 'Paraguay' },
        { value: '+591', label: '🇧🇴', name: 'Bolivia' },
        { value: '+58', label: '🇻🇪', name: 'Venezuela' },
        { value: '+57', label: '🇨🇴', name: 'Colombia' },
        { value: '+51', label: '🇵🇪', name: 'Perú' },
        { value: '+593', label: '🇪🇨', name: 'Ecuador' },
        { value: '+34', label: '🇪🇸', name: 'España' },
        { value: '+39', label: '🇮🇹', name: 'Italia' },
        { value: '+1', label: '🇺🇸', name: 'EE.UU.' },
    ];
    const selectedCountry = countries.find(c => c.value === countryCode) || countries[0];

    return (
        <div className={`w-full flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">
                    {label}
                </label>
            )}

            <div className="relative group">
                <div className="flex items-center min-h-[50px] bg-white border border-gray-300 rounded-2xl focus-within:ring-2 focus-within:ring-[#34baab] focus-within:border-transparent transition-all overflow-hidden shadow-sm">
                    {/* Country Code Prefix */}
                    <div className="flex items-center gap-1.5 px-4 h-full border-r border-gray-100 bg-gray-50/50 hover:bg-gray-100 transition-colors cursor-pointer relative shrink-0">
                        <span className="text-xl">{selectedCountry.label}</span>
                        <span className="font-bold text-gray-600 text-sm whitespace-nowrap">{countryCode}</span>
                        <select
                            title="Código de país"
                            aria-label="Código de país"
                            value={countryCode}
                            onChange={(e) => onCountryCodeChange(e.target.value)}
                            className="absolute inset-0 cursor-pointer w-full opacity-0 appearance-none"
                        >
                            {countries.map(c => (
                                <option key={c.value} value={c.value}>{c.name} {c.value}</option>
                            ))}
                        </select>
                    </div>

                    {/* Number Input */}
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => onPhoneNumberChange(e.target.value.replace(/\D/g, '').slice(0, 15))}
                        placeholder="Número de teléfono"
                        className="flex-1 px-4 py-3 bg-transparent outline-none text-gray-900 font-bold placeholder:text-gray-300 text-base"
                        required={required}
                    />
                </div>
                {error && <p className="mt-1 text-xs text-red-600 font-bold">{error}</p>}
            </div>

            <div className="flex flex-col gap-0.5 ml-1">
                {countryCode === '+54' ? (
                    <>
                        <p className="text-[11px] font-black text-[#34baab] uppercase tracking-wide">
                            ⚠️ Importante: Sin el 0 y sin el 15
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium">
                            Ej: si es 0351 152345678, poné: <span className="font-bold text-gray-600">3512345678</span>
                        </p>
                    </>
                ) : (
                    <p className="text-[11px] font-black text-[#34baab] uppercase tracking-wide">
                        Solo el número, sin espacios ni el código de país
                    </p>
                )}
            </div>
        </div>
    );
}
