'use client';

import { Promotion } from '@/lib/types/promotion';
import { Edit2, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface PromotionCardProps {
    promotion: Promotion;
    isAdmin: boolean;
    onEdit?: (promotion: Promotion) => void;
    onDelete?: (id: string) => void;
    onClick?: (promotion: Promotion) => void;
}

export function PromotionCard({ promotion, isAdmin, onEdit, onDelete, onClick }: PromotionCardProps) {
    return (
        <div
            onClick={() => onClick?.(promotion)}
            style={{ isolation: 'isolate' }}
            className="group bg-white rounded-[2rem] overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
        >
            {/* ── IMAGE ── */}
            <div className="relative w-full bg-gray-100" style={{ aspectRatio: '9/14' }}>
                <Image
                    src={promotion.imageUrl}
                    alt={promotion.title || 'Promoción'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 50vw, 33vw"
                    unoptimized
                />

                {/* Admin buttons — column, top-right corner */}
                {isAdmin && (
                    <div
                        className="absolute top-3 right-3 flex flex-col gap-2"
                        style={{ zIndex: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit?.(promotion); }}
                            className="w-10 h-10 bg-white text-[#484450] rounded-xl shadow-lg flex items-center justify-center hover:bg-[#34baab] hover:text-white transition-colors active:scale-90"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(promotion.id); }}
                            className="w-10 h-10 bg-white text-red-500 rounded-xl shadow-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors active:scale-90"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* ── INFO — below the image ── */}
            {(promotion.title || promotion.price) && (
                <div className="px-4 py-3 flex flex-col gap-1 bg-white">
                    {promotion.title && (
                        <h3 className="text-[14px] font-black text-[#484450] leading-snug line-clamp-2">
                            {promotion.title}
                        </h3>
                    )}
                    {promotion.price && (
                        <span className="text-[#34baab] font-black text-base leading-none">
                            <span className="text-[11px] font-semibold mr-0.5">$</span>
                            {promotion.price}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
