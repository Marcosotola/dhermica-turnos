'use client';

import React from 'react';

interface CheckboxProps {
    id: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    className?: string;
}

export function Checkbox({ id, checked, onCheckedChange, className = '' }: CheckboxProps) {
    return (
        <div className={`relative flex items-center justify-center w-5 h-5 rounded border ${checked ? 'bg-[#34baab] border-[#34baab]' : 'border-gray-300 bg-white'
            } ${className}`}>
            <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={(e) => onCheckedChange(e.target.checked)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {checked && (
                <svg
                    className="w-3.5 h-3.5 text-white pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                    ></path>
                </svg>
            )}
        </div>
    );
}
