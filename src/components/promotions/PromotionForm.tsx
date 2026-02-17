'use client';

import { useState, useRef, useEffect } from 'react';
import { Promotion } from '@/lib/types/promotion';
import { X, Upload, DollarSign, Tag, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from 'sonner';

interface PromotionFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any, imageFile?: File) => Promise<void>;
    initialData?: Promotion;
}

export function PromotionForm({ isOpen, onClose, onSubmit, initialData }: PromotionFormProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title);
            setDescription(initialData.description);
            setPrice(initialData.price);
            setImagePreview(initialData.imageUrl);
        } else {
            setTitle('');
            setDescription('');
            setPrice('');
            setImageFile(null);
            setImagePreview(null);
        }
    }, [initialData, isOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('La imagen no debe superar los 5MB');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !price || (!imagePreview && !imageFile)) {
            toast.error('Por favor completa todos los campos obligatorios');
            return;
        }

        setLoading(true);
        try {
            await onSubmit({ title, description, price }, imageFile || undefined);
            onClose();
        } catch (error) {
            console.error('Error submitting promotion:', error);
            toast.error('Error al guardar la promoción');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-[#484450] p-8 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <Tag className="w-8 h-8 text-[#34baab]" />
                            {initialData ? 'Editar Promoción' : 'Nueva Promoción'}
                        </h2>
                        <p className="text-gray-300 font-medium mt-1">Completa los datos de la oferta.</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-8">
                        {/* Image Upload */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#484450] mb-4 block ml-1">
                                Imagen de la Promoción
                            </label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative aspect-video rounded-[2.5rem] border-4 border-dashed transition-all cursor-pointer overflow-hidden group
                                    ${imagePreview ? 'border-transparent' : 'border-gray-100 hover:border-[#34baab] bg-gray-50'}`}
                            >
                                {imagePreview ? (
                                    <>
                                        <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="bg-white text-[#484450] p-4 rounded-2xl font-black flex items-center gap-2">
                                                <ImageIcon className="w-5 h-5" /> Cambiar Imagen
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-[#34baab]">
                                        <div className="w-20 h-20 bg-white shadow-xl rounded-3xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                            <Upload className="w-10 h-10" />
                                        </div>
                                        <p className="font-black text-sm">Hacer clic para subir</p>
                                        <p className="text-xs font-medium">Recomendado: 1200x675 (16:9)</p>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>

                        {/* Title & Price */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#484450] ml-1">
                                    Título de la Promo
                                </label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ej: Pack Facial Deluxe"
                                    className="rounded-2xl border-gray-100 focus:border-[#34baab]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#484450] ml-1">
                                    Precio / Oferta
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="Ej: 15.000 o 2x1"
                                        className="pl-12 rounded-2xl border-gray-100 focus:border-[#34baab]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#484450] ml-1">
                                Descripción Detallada
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe qué incluye esta promoción..."
                                rows={4}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[2rem] focus:outline-none focus:ring-2 focus:ring-[#34baab]/20 focus:border-[#34baab] transition-all font-medium text-gray-700 resize-none"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-8 bg-gray-50 flex gap-4">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1 rounded-2xl font-black uppercase tracking-widest py-6 border-gray-200"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-[2] bg-[#34baab] hover:bg-[#2da698] text-white rounded-2xl font-black uppercase tracking-widest py-6 shadow-xl shadow-teal-500/20 active:scale-95 transition-all"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" /> Guardando...
                            </div>
                        ) : (
                            initialData ? 'Guardar Cambios' : 'Crear Promoción'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
