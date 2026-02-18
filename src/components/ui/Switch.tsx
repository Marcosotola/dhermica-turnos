'use client';

import React from 'react';

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    ariaLabel?: string;
}

export function Switch({ checked, onChange, disabled = false, ariaLabel }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`
                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2
                ${checked ? 'bg-violet-600' : 'bg-gray-200'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <span
                aria-hidden="true"
                className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                    transition duration-200 ease-in-out
                    ${checked ? 'translate-x-5' : 'translate-x-0'}
                `}
            />
        </button>
    );
}
