'use client';

import { Product } from '@/lib/types/product';
import { X, ShoppingBag, DollarSign, Package, Clock, Sparkles, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

interface ProductDetailProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    isAdmin?: boolean;
    onEdit?: (product: Product) => void;
    onDelete?: (id: string) => void;
    onSell?: (product: Product) => void;
}

export function ProductDetail({ isOpen, onClose, product, isAdmin, onEdit, onDelete, onSell }: ProductDetailProps) {
    const [activeImage, setActiveImage] = useState(0);

    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#484450]/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col md:flex-row max-h-[90vh]">
                {/* Image Gallery Side */}
                <div className="md:w-1/2 bg-gray-50 p-6 flex flex-col gap-4">
                    <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-inner bg-white border border-gray-100">
                        {product.images.length > 0 ? (
                            <Image
                                src={product.images[activeImage]}
                                alt={product.name}
                                fill
                                className="object-cover animate-in fade-in zoom-in-95 duration-500"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-20 h-20 text-gray-200" />
                            </div>
                        )}

                        {/* Status Tag */}
                        <div className="absolute top-4 left-4">
                            <span className="px-3 py-1 bg-[#34baab] text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg">
                                Disponible
                            </span>
                        </div>
                    </div>

                    {/* Thumbnails */}
                    {product.images.length > 1 && (
                        <div className="flex gap-4 justify-center">
                            {product.images.map((img, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveImage(i)}
                                    className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shadow-sm ${i === activeImage ? 'border-[#34baab] scale-110 shadow-teal-100' : 'border-transparent hover:border-gray-200'}`}
                                >
                                    <Image src={img} alt={`Thumb ${i}`} fill className="object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content Side */}
                <div className="md:w-1/2 p-8 flex flex-col relative overflow-y-auto">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1 px-2 bg-teal-50 rounded-lg">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#34baab]">Dhermica Products</span>
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 leading-tight mb-4">
                            {product.name}
                        </h2>
                        <div className="flex items-center gap-4 text-2xl font-black text-[#484450]">
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 rounded-2xl">
                                <DollarSign className="w-6 h-6 text-[#34baab]" />
                                <span>{product.price.toLocaleString('es-AR')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4 text-[#34baab]" /> Descripción del Producto
                            </h4>
                            <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                                <p className="text-gray-600 font-medium leading-relaxed">
                                    {product.description}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-teal-50/30 rounded-2xl border border-teal-50">
                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Calidad</p>
                                <p className="font-bold text-[#34baab] flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Profesional
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Actualizado</p>
                                <p className="font-bold text-gray-600 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {new Date(product.updatedAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3">
                        {isAdmin && (
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <button
                                    onClick={() => { onEdit?.(product); onClose(); }}
                                    className="flex items-center justify-center gap-2 bg-teal-50 text-[#34baab] py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#34baab] hover:text-white transition-all border border-teal-100"
                                >
                                    <Edit2 className="w-4 h-4" /> Editar
                                </button>
                                <button
                                    onClick={() => { onDelete?.(product.id); onClose(); }}
                                    className="flex items-center justify-center gap-2 bg-red-50 text-red-500 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-100"
                                >
                                    <Trash2 className="w-4 h-4" /> Borrar
                                </button>
                            </div>
                        )}
                        {onSell && (
                            <button
                                onClick={() => { onSell(product); onClose(); }}
                                className="w-full bg-[#34baab] hover:bg-[#2aa89a] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-teal-900/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <DollarSign className="w-5 h-5" /> Registrar Venta
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-full bg-[#484450] hover:bg-[#3d3944] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
                        >
                            Cerrar Detalles
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
