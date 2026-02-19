'use client';

import { Treatment } from "@/lib/types/treatment";
import { Sparkles, ChevronRight, Edit2, Trash2 } from "lucide-react";

interface TreatmentCardProps {
    treatment: Treatment;
    isAdmin?: boolean;
    onEdit?: (treatment: Treatment) => void;
    onDelete?: (id: string) => void;
    onClick?: (treatment: Treatment) => void;
}

export function TreatmentCard({ treatment, isAdmin, onEdit, onDelete, onClick }: TreatmentCardProps) {
    const minPrice = treatment.prices.length > 0
        ? Math.min(...treatment.prices.map(p => p.price))
        : 0;

    return (
        <div
            onClick={() => onClick?.(treatment)}
            className="group relative bg-white rounded-2xl md:rounded-[2.5rem] border-2 border-gray-100 shadow-lg hover:shadow-2xl hover:border-[#34baab]/20 hover:-translate-y-1 transition-all p-3 md:p-6 cursor-pointer overflow-hidden"
        >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-teal-50/50 rounded-full -mr-8 -mt-8 md:-mr-12 md:-mt-12 group-hover:scale-110 transition-transform" />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2 md:mb-4">
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-[#34baab] rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-teal-100">
                        <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                    {isAdmin && (
                        <div className="flex gap-1 md:gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit?.(treatment); }}
                                className="p-1.5 md:p-2 bg-gray-50 text-gray-400 hover:text-[#34baab] hover:bg-teal-50 rounded-lg md:rounded-xl transition-all"
                            >
                                <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete?.(treatment.id); }}
                                className="p-1.5 md:p-2 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg md:rounded-xl transition-all"
                            >
                                <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="mb-2 md:mb-4">
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#34baab] bg-teal-50 px-2 md:px-3 py-0.5 md:py-1 rounded-full mb-1 md:mb-3 inline-block">
                        {treatment.category}
                    </span>
                    <h3 className="text-sm md:text-xl font-black text-gray-900 leading-tight group-hover:text-[#34baab] transition-colors line-clamp-2 min-h-[2.5rem] md:min-h-0">
                        {treatment.name}
                    </h3>
                </div>

                <p className="text-[10px] md:text-sm text-gray-500 line-clamp-1 md:line-clamp-2 mb-3 md:mb-6 font-medium">
                    {treatment.shortDescription}
                </p>

                <div className="flex items-center justify-between border-t border-gray-50 pt-2 md:pt-4">
                    <div className="flex flex-col">
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-wider text-gray-400">Desde</span>
                        <span className="text-sm md:text-lg font-black text-gray-900">${minPrice.toLocaleString()}</span>
                    </div>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-[#34baab] group-hover:text-white transition-all text-gray-400">
                        <ChevronRight className="w-4 h-4 md:w-5 h-5" />
                    </div>
                </div>
            </div>
        </div>
    );
}
