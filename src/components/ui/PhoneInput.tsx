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
    return (
        <div className={`w-full flex flex-col gap-1 ${className}`}>
            {label && (
                <label className="block text-sm font-bold text-gray-700">
                    {label}
                </label>
            )}
            <div className="flex gap-2 min-w-0">
                <div className="w-[110px] shrink-0">
                    <Select
                        value={countryCode}
                        onChange={(e) => onCountryCodeChange(e.target.value)}
                        options={[
                            { value: '+54', label: '🇦🇷 +54' },
                            { value: '+598', label: '🇺🇾 +598' },
                            { value: '+56', label: '🇨🇱 +56' },
                            { value: '+55', label: '🇧🇷 +55' },
                            { value: '+34', label: '🇪🇸 +34' },
                            { value: '+1', label: '🇺🇸 +1' },
                        ]}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <Input
                        value={phoneNumber}
                        onChange={(e) => onPhoneNumberChange(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ej: 3512345678"
                        required={required}
                        error={error}
                    />
                </div>
            </div>
            <p className="text-[10px] text-gray-400">
                Código de área + número (sin 0 ni 15)
            </p>
        </div>
    );
}
