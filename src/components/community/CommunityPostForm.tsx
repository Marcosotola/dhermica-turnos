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
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (!profile) return;
        if (!imageFile) {
            toast.error('Debes subir una foto para compartir tu resultado');
            return;
        }

        setLoading(true);
        try {
            haptics.medium();
            // 1. Upload Image
            const imageUrl = await uploadCommunityImage(imageFile, profile.uid);

            // 2. Create Post
            await createCommunityPost({
                userId: profile.uid,
                userName: profile.fullName,
                userAvatar: user?.photoURL || undefined,
                content,
                imageUrl,
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

            {/* Image Upload Area */}
            <div
                onClick={() => !loading && fileInputRef.current?.click()}
                className={`relative aspect-square rounded-[2rem] border-4 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${imagePreview ? 'border-[#34baab]/20' : 'border-gray-100 hover:border-[#34baab]/40 hover:bg-teal-50/30'
                    }`}
            >
                {imagePreview ? (
                    <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Upload className="w-10 h-10 text-white" />
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-[#34baab]" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black text-gray-900">Toca para subir foto</p>
                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">JPG o PNG hasta 5MB</p>
                        </div>
                    </div>
                )}
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
