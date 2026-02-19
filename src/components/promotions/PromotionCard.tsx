'use client';

import { Promotion } from '@/lib/types/promotion';
import { Edit2, Trash2, Tag, DollarSign } from 'lucide-react';
import Image from 'next/image';

interface PromotionCardProps {
    promotion: Promotion;
    isAdmin: boolean;
    onEdit?: (promotion: Promotion) => void;
    onDelete?: (id: string) => void;
}

export function PromotionCard({ promotion, isAdmin, onEdit, onDelete }: PromotionCardProps) {
    return (
        <div className="relative group bg-white rounded-[2.5rem] overflow-hidden shadow-lg border-2 border-gray-100 hover:border-[#34baab]/20 hover:shadow-2xl transition-all duration-500 h-full flex flex-col">
            {/* Image Container */}
            <div className="relative aspect-[16/10] md:aspect-[4/3] w-full overflow-hidden">
                <Image
                    src={promotion.imageUrl}
                    alt={promotion.title}
                    fill
                    priority
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Admin Actions */}
                {isAdmin && (
                    <div className="absolute top-4 right-4 flex gap-2 z-20">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(promotion); }}
                            className="p-2 bg-white text-[#34baab] rounded-xl hover:bg-[#34baab] hover:text-white transition-all shadow-lg border border-teal-50"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(promotion.id); }}
                            className="p-2 bg-white text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg border border-red-50"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Price Tag */}
                <div className="absolute bottom-4 left-4 bg-[#34baab] text-white px-4 py-2 rounded-2xl font-black shadow-lg flex items-center gap-1 animate-in slide-in-from-left-4 duration-500">
                    <DollarSign className="w-4 h-4" />
                    <span>{promotion.price}</span>
                </div>
            </div>

            {/* Content Container */}
            <div className="p-4 md:p-8 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center">
                        <Tag className="w-4 h-4 text-pink-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-pink-500">Promoción Especial</span>
                </div>

                <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-3 leading-tight group-hover:text-[#34baab] transition-colors">
                    {promotion.title}
                </h3>

                <p className="text-gray-500 font-medium leading-relaxed line-clamp-2 md:line-clamp-3 mb-4 md:mb-6 text-xs md:text-base">
                    {promotion.description}
                </p>

                <div className="mt-auto">
                    <div className="w-full bg-[#484450]/5 h-[1px] mb-6" />
                    <button className="w-full bg-gray-50 hover:bg-[#34baab] hover:text-white text-gray-900 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 text-[10px] md:text-sm">
                        Ver Detalles
                    </button>
                </div>
            </div>
        </div>
    );
}
