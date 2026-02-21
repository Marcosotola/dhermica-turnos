'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Image as ImageIcon, X, Upload, CheckCircle2 } from 'lucide-react';
import { uploadCommunityImage, createCommunityPost } from '@/lib/firebase/community';
import { getTreatments } from '@/lib/firebase/treatments';
import { Treatment } from '@/lib/types/treatment';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'sonner';
import { haptics } from '@/lib/utils/haptics';

interface CommunityPostFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export function CommunityPostForm({ onSuccess, onCancel }: CommunityPostFormProps) {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState('');
    const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null]);
    const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeIndexRef = useRef<number>(0);

    useEffect(() => {
        loadTreatments();
    }, []);

    const loadTreatments = async () => {
        const data = await getTreatments();
        setTreatments(data);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('La imagen es muy pesada (máx 5MB)');
                return;
            }

            const index = activeIndexRef.current;
            const newFiles = [...imageFiles];
            newFiles[index] = file;
            setImageFiles(newFiles);

            const reader = new FileReader();
            reader.onloadend = () => {
                const newPreviews = [...imagePreviews];
                newPreviews[index] = reader.result as string;
                setImagePreviews(newPreviews);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = (index: number) => {
        const newFiles = [...imageFiles];
        newFiles[index] = null;
        setImageFiles(newFiles);

        const newPreviews = [...imagePreviews];
        newPreviews[index] = null;
        setImagePreviews(newPreviews);
    };

    const triggerFileInput = (index: number) => {
        activeIndexRef.current = index;
        fileInputRef.current?.click();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        const validFiles = imageFiles.filter(f => f !== null) as File[];
        if (validFiles.length === 0) {
            toast.error('Debes subir al menos una foto para compartir tu resultado');
            return;
        }

        setLoading(true);
        try {
            haptics.medium();
            // 1. Upload Images
            const uploadPromises = validFiles.map(file => uploadCommunityImage(file, profile.uid));
            const imageUrls = await Promise.all(uploadPromises);

            // 2. Create Post
            await createCommunityPost({
                userId: profile.uid,
                userName: profile.fullName,
                userAvatar: user?.photoURL || undefined,
                content,
                imageUrls,
                imageUrl: imageUrls[0], // Keep first one for legacy support
                treatmentId: selectedTreatmentId || undefined,
                likes: [],
            });

            toast.success('¡Tu resultado se ha compartido en la comunidad!');
            onSuccess();
        } catch (error) {
            console.error('Error creating post:', error);
            toast.error('Hubo un error al publicar tu post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center">
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Compartir Resultado</h3>
                <p className="text-sm text-gray-500 font-medium">Inspira a otros con tu experiencia en Dhermica</p>
            </div>

            {/* Multi Image Upload Area */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
                {[0, 1, 2].map((index) => (
                    <div
                        key={index}
                        onClick={() => !loading && triggerFileInput(index)}
                        className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${imagePreviews[index] ? 'border-[#34baab]/20' : 'border-gray-100 hover:border-[#34baab]/40 hover:bg-teal-50/30'
                            }`}
                    >
                        {imagePreviews[index] ? (
                            <>
                                <img src={imagePreviews[index]!} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <Upload className="w-6 h-6 text-white" />
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeImage(index);
                                    }}
                                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-1 p-2">
                                <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                                    <ImageIcon className="w-4 h-4 text-[#34baab]" />
                                </div>
                                <div className="text-center">
                                    <p className="text-[8px] md:text-[10px] font-black text-gray-900 uppercase">Foto {index + 1}</p>
                                    <p className="text-[7px] text-gray-400 uppercase font-black tracking-widest mt-0.5">Subir</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                />
            </div>

            <div className="space-y-4">
                <Select
                    label="¿Sobre qué tratamiento es?"
                    value={selectedTreatmentId}
                    onChange={(e) => setSelectedTreatmentId(e.target.value)}
                    options={[
                        { value: '', label: 'Seleccionar un tratamiento (opcional)' },
                        ...treatments.map(t => ({ value: t.id, label: t.name }))
                    ]}
                />

                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">Tu Comentario</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Contanos qué te pareció el resultado..."
                        rows={4}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#34baab] focus:border-transparent text-gray-900 bg-white font-medium resize-none transition-all"
                        required
                    />
                </div>
            </div>

            <div className="flex gap-4">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 py-4 rounded-2xl font-bold"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                    className="flex-2 py-4 rounded-2xl font-bold shadow-lg shadow-teal-100"
                >
                    {loading ? 'Publicando...' : 'Publicar'}
                </Button>
            </div>
        </form>
    );
}
