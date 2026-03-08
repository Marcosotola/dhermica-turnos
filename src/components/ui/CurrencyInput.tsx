'use client';

import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { formatArgentineCurrency, parseArgentineCurrency } from '@/lib/utils/currency';

interface CurrencyInputProps {
    label?: string;
    value: number | string;
    onChange: (value: number) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
    error?: string;
}

export function CurrencyInput({
    label,
    value,
    onChange,
    placeholder,
    required,
    className,
    error
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    // Update display value when prop value changes (e.g. on load)
    useEffect(() => {
        if (value === 0 || value === '0' || value === '') {
            if (displayValue !== '') setDisplayValue('');
        } else {
            const formatted = formatArgentineCurrency(value);
            // Only update if the parsed numeric value is different to avoid cursor jumping
            if (parseFloat(parseArgentineCurrency(formatted)) !== parseFloat(parseArgentineCurrency(displayValue))) {
                setDisplayValue(formatted);
            }
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;

        // Allow typing digits, dots and commas freely
        // We sanitize the input to only allow valid characters for Argentine format
        const sanitized = rawValue.replace(/[^\d.,]/g, '');
        setDisplayValue(sanitized);

        // Convert to number and notify parent
        const numericString = parseArgentineCurrency(sanitized);
        const numericValue = parseFloat(numericString);
        onChange(isNaN(numericValue) ? 0 : numericValue);
    };

    const handleBlur = () => {
        // Format properly on blur
        if (displayValue) {
            setDisplayValue(formatArgentineCurrency(parseArgentineCurrency(displayValue)));
        }
    };

    return (
        <Input
            label={label}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            required={required}
            className={className}
            error={error}
            type="text" // Change to text since we handle the formatting
            inputMode="decimal" // Better mobile keyboard
        />
    );
}
