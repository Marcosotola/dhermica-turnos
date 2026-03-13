'use client';

import { useState, useRef, useEffect } from 'react';
import { Promotion } from '@/lib/types/promotion';
import { X, Upload, DollarSign, Type, AlignLeft, Loader2, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface PromotionFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any, imageFile?: File) => Promise<void>;
    initialData?: Promotion;
}

export function PromotionForm({ isOpen, onClose, onSubmit, initialData }: PromotionFormProps) {
    const [title, setTitle]               = useState('');
    const [description, setDescription]  = useState('');
    const [price, setPrice]              = useState('');
    const [imageFile, setImageFile]      = useState<File | null>(null);
    const [imagePreview, setImagePreview]= useState<string | null>(null);
    const [loading, setLoading]          = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title || '');
            setDescription(initialData.description || '');
            setPrice(initialData.price || '');
            setImagePreview(initialData.imageUrl || null);
            setImageFile(null);
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
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen no debe superar los 5 MB');
            return;
        }
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!imagePreview && !imageFile) {
            toast.error('Seleccioná una imagen para la promoción');
            return;
        }
        setLoading(true);
        try {
            await onSubmit({ title, description, price }, imageFile ?? undefined);
            onClose();
        } catch {
            toast.error('Error al guardar la promoción');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        /* Dark backdrop */
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ paddingBottom: '96px' }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal card — compact, scrollable internally */}
            <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100dvh - 120px)' }}>

                {/* Header */}
                <div className="flex-none flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <h2 className="text-lg font-black text-[#484450]">
                        {initialData ? 'Editar Promoción' : 'Nueva Promoción'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-90"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                    {/* IMAGE AREA */}
                    <div className="space-y-2">
                        {imagePreview ? (
                            /* Preview + change button */
                            <div className="space-y-2">
                                <div className="relative w-full rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: '4/5' }}>
                                    <Image
                                        src={imagePreview}
                                        alt="Vista previa"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                </div>
                                {/* Explicit "change image" button — always visible on mobile */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#34baab] text-gray-400 hover:text-[#34baab] font-black text-sm flex items-center justify-center gap-2 transition-colors active:scale-95"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    Cambiar imagen
                                </button>
                            </div>
                        ) : (
                            /* Upload area */
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-14 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#34baab] bg-gray-50 hover:bg-[#34baab]/5 text-gray-400 hover:text-[#34baab] flex flex-col items-center justify-center gap-3 transition-colors active:scale-95"
                            >
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center border border-gray-100">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <p className="font-black text-base">Subir imagen</p>
                                    <p className="text-xs font-medium opacity-60 mt-0.5">Formato vertical · Máx 5 MB</p>
                                </div>
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>

                    {/* FIELDS */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Información opcional</p>

                        <div className="relative">
                            <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Título (ej: Pack Facial)"
                                className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50 text-[#484450] font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#34baab]/30 focus:border-[#34baab] transition-all text-[16px]"
                            />
                        </div>

                        <div className="relative">
                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                            <input
                                type="text"
                                inputMode="numeric"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="Precio (ej: 15.000)"
                                className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50 text-[#484450] font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#34baab]/30 focus:border-[#34baab] transition-all text-[16px]"
                            />
                        </div>

                        <div className="relative">
                            <AlignLeft className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-300 pointer-events-none" />
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Descripción corta..."
                                rows={2}
                                className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50 text-[#484450] font-medium placeholder:text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-[#34baab]/30 focus:border-[#34baab] transition-all text-[16px]"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-none px-6 py-4 border-t border-gray-100 bg-white flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-2xl border-2 border-gray-100 font-black text-sm text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-[2] py-3.5 rounded-2xl bg-[#34baab] hover:bg-[#2da698] disabled:opacity-60 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-teal-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
                            : initialData ? 'Guardar' : 'Crear'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
