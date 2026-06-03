'use client';

import { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { GiftCard } from '@/lib/types/giftCard';
import { GiftCardTicket } from './GiftCardTicket';
import { downloadGiftCardPDF } from '@/lib/utils/downloadGiftCardPDF';
import { toast } from 'sonner';

interface GiftCardDownloadButtonProps {
    card: GiftCard;
    variant?: 'icon' | 'full';
    className?: string;
}

export function GiftCardDownloadButton({
    card,
    variant = 'icon',
    className = '',
}: GiftCardDownloadButtonProps) {
    const ticketRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        if (!ticketRef.current || downloading) return;
        setDownloading(true);
        try {
            await downloadGiftCardPDF(ticketRef.current, card);
            toast.success(`Gift card ${card.code} descargada`);
        } catch (err) {
            console.error('Error generando PDF:', err);
            toast.error('Error al generar el PDF');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <>
            {/* Ticket oculto en el DOM para captura — fuera del flujo visual */}
            <div
                style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: '-9999px',
                    zIndex: -1,
                    pointerEvents: 'none',
                }}
                aria-hidden="true"
            >
                <GiftCardTicket ref={ticketRef} card={card} />
            </div>

            {variant === 'icon' ? (
                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    title="Descargar gift card en PDF"
                    className={`p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 ${className}`}
                >
                    <Download className={`w-3.5 h-3.5 text-white/80 ${downloading ? 'animate-pulse' : ''}`} />
                </button>
            ) : (
                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50 ${className}`}
                >
                    <Download className={`w-3 h-3 ${downloading ? 'animate-pulse' : ''}`} />
                    {downloading ? 'Generando...' : 'Descargar PDF'}
                </button>
            )}
        </>
    );
}
