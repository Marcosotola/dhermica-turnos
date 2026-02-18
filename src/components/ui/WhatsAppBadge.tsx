'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppBadgeProps {
    phoneNumber?: string;
    message?: string;
}

export function WhatsAppBadge({
    phoneNumber = '5493512021889',
    message = 'Hola! Me gustaría realizar una consulta.'
}: WhatsAppBadgeProps) {

    const handleClick = () => {
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <button
            onClick={handleClick}
            className="fixed bottom-24 right-6 z-[100] w-14 h-14 bg-[#25D366] text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 md:bottom-8 group overflow-hidden"
            aria-label="Contactar por WhatsApp"
        >
            {/* Background ripple effect or similar can be added here */}
            <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-150 transition-transform duration-500 rounded-full" />
            <MessageCircle className="w-8 h-8 relative z-10" />

            {/* Tooltip for desktop */}
            <span className="absolute right-full mr-3 px-3 py-1 bg-[#484450] text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden md:block">
                Escribinos por WhatsApp
            </span>
        </button>
    );
}
