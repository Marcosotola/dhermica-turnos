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
    const selectedCountry = [
        { value: '+54', label: '🇦🇷' },
        { value: '+598', label: '🇺🇾' },
        { value: '+56', label: '🇨🇱' },
        { value: '+55', label: '🇧🇷' },
        { value: '+34', label: '🇪🇸' },
        { value: '+1', label: '🇺🇸' },
    ].find(c => c.value === countryCode) || { value: '+54', label: '🇦🇷' };

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
                            value={countryCode}
                            onChange={(e) => onCountryCodeChange(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        >
                            <option value="+54">🇦🇷 Argentina (+54)</option>
                            <option value="+598">🇺🇾 Uruguay (+598)</option>
                            <option value="+56">🇨🇱 Chile (+56)</option>
                            <option value="+55">🇧🇷 Brasil (+55)</option>
                            <option value="+34">🇪🇸 España (+34)</option>
                            <option value="+1">🇺🇸 USA (+1)</option>
                        </select>
                    </div>

                    {/* Number Input */}
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => onPhoneNumberChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Cód. Área + Número"
                        className="flex-1 px-4 py-3 bg-transparent outline-none text-gray-900 font-bold placeholder:text-gray-300 text-base"
                        required={required}
                    />
                </div>
                {error && <p className="mt-1 text-xs text-red-600 font-bold">{error}</p>}
            </div>

            <div className="flex flex-col gap-0.5 ml-1">
                <p className="text-[11px] font-black text-[#34baab] uppercase tracking-wide">
                    ⚠️ Importante: Sin el 0 y sin el 15
                </p>
                <p className="text-[10px] text-gray-400 font-medium">
                    Ej: si es 0351 152345678, poné: <span className="font-bold text-gray-600">3512345678</span>
                </p>
            </div>
        </div>
    );
}
