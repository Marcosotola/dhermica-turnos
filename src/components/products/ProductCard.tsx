'use client';

import { Product } from '@/lib/types/product';
import { ShoppingBag, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

interface ProductCardProps {
    product: Product;
    isAdmin: boolean;
    onEdit?: (product: Product) => void;
    onDelete?: (id: string) => void;
    onClick?: (product: Product) => void;
    priority?: boolean;
}

export function ProductCard({ product, isAdmin, onEdit, onDelete, onClick, priority }: ProductCardProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    };

    return (
        <div
            onClick={() => onClick?.(product)}
            className="group relative bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-lg hover:shadow-2xl hover:border-[#34baab]/20 hover:-translate-y-1 transition-all cursor-pointer overflow-hidden flex flex-col h-full"
        >
            {/* Image Section */}
            <div className="relative aspect-square overflow-hidden bg-gray-50">
                {product.images.length > 0 ? (
                    <>
                        <Image
                            src={product.images[currentImageIndex]}
                            alt={product.name}
                            fill
                            priority={priority}
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {product.images.length > 1 && (
                            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={prevImage}
                                    className="p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-800 hover:bg-white transition-all shadow-sm"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={nextImage}
                                    className="p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-800 hover:bg-white transition-all shadow-sm"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {/* Dot indicator */}
                        {product.images.length > 1 && (
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {product.images.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'bg-[#34baab] w-3' : 'bg-white/60'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-gray-200" />
                    </div>
                )}

                {/* Tags */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="px-3 py-1 bg-[#34baab] text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-teal-900/10">
                        Producto
                    </span>
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                    <div className="absolute top-4 right-4 flex gap-2 z-20">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(product); }}
                            className="p-2 bg-white text-[#34baab] rounded-xl hover:bg-[#34baab] hover:text-white transition-all shadow-lg border border-teal-50"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(product.id); }}
                            className="p-2 bg-white text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg border border-red-50"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-5 flex flex-col flex-1">
                <div className="mb-4">
                    <h3 className="text-lg font-black text-gray-900 leading-tight group-hover:text-[#34baab] transition-colors line-clamp-2 min-h-[3rem]">
                        {product.name}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2 font-medium">
                        {product.description}
                    </p>
                </div>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Precio</span>
                        <span className="text-xl font-black text-[#484450]">
                            ${product.price.toLocaleString('es-AR')}
                        </span>
                    </div>
                    <div className="p-3 bg-teal-50 rounded-2xl group-hover:bg-[#34baab] transition-all">
                        <ShoppingBag className="w-5 h-5 text-[#34baab] group-hover:text-white transition-colors" />
                    </div>
                </div>
            </div>
        </div>
    );
}
