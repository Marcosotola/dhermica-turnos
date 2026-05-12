'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Heart, Plus, Trash2, X, Upload, Sparkles, ImageIcon, Calendar } from 'lucide-react';
import { getImpactImages, uploadImpactImage, deleteImpactImage } from '@/lib/firebase/impact';
import { ImpactImage } from '@/lib/types/impact';
import { toast, Toaster } from 'sonner';
import { Button } from '@/components/ui/Button';

export default function ImpactPage() {
    const { user, profile } = useAuth();
    const [images, setImages] = useState<ImpactImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form states
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [description, setDescription] = useState('');

    const canManage = profile?.role === 'admin' || profile?.role === 'secretary' || profile?.role === 'professional' || profile?.role === 'promotor';

    useEffect(() => {
        loadImages();
    }, []);

    const loadImages = async () => {
        setLoading(true);
        try {
            const data = await getImpactImages();
            setImages(data);
        } catch (error) {
            console.error('Error loading images:', error);
            toast.error('Error al cargar la galería');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !description || !profile) return;

        setUploading(true);
        try {
            await uploadImpactImage(file, description, profile.fullName);
            toast.success('¡Imagen publicada con éxito!');
            setIsUploadModalOpen(false);
            setFile(null);
            setPreview(null);
            setDescription('');
            loadImages();
        } catch (error) {
            console.error('Error uploading:', error);
            toast.error('Error al subir la imagen');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (image: ImpactImage) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) return;

        try {
            // Note: storagePath needs to be in ImpactImage type if we want to delete from storage
            // I added it in the firebase helper, so let's assume it's there
            await deleteImpactImage(image.id, (image as any).storagePath);
            toast.success('Imagen eliminada');
            loadImages();
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error('Error al eliminar');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />
            
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-[#484450] rounded-[2.5rem] p-10 md:p-16 mb-12 shadow-xl text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Heart className="w-64 h-64" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black mb-6 text-white leading-tight tracking-tighter">
                        Un Momento para <span className="text-[#34baab]">Vos</span>,<br />
                        una Bendición para <span className="text-[#34baab]">Otros</span>
                    </h1>

                    <p className="text-lg md:text-xl opacity-90 font-light max-w-2xl mx-auto leading-relaxed">
                        Con cada tratamiento en Dhermica, estás apoyando nuestras misiones sociales. 
                        Aquí compartimos algunos de los momentos donde tu elección se convirtió en esperanza.
                    </p>
                    
                    {canManage && (
                        <button 
                            onClick={() => setIsUploadModalOpen(true)}
                            className="mt-8 bg-[#34baab] text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 mx-auto hover:scale-105 transition-transform shadow-lg"
                        >
                            <Plus className="w-5 h-5" /> Subir Momento
                        </button>
                    )}
                </div>

                {/* Gallery Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34baab]"></div>
                    </div>
                ) : images.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <ImageIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Aún no hay fotos en el álbum de impacto.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {images.map((image) => (
                            <div key={image.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 group hover:shadow-md transition-all">
                                <div className="aspect-[4/5] relative overflow-hidden">
                                    <img 
                                        src={image.imageUrl} 
                                        alt={image.description} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    {canManage && (
                                        <button 
                                            onClick={() => handleDelete(image)}
                                            className="absolute top-4 right-4 bg-red-500/80 text-white p-2 rounded-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(image.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                    </div>
                                    <p className="text-gray-700 leading-relaxed font-medium italic">
                                        "{image.description}"
                                    </p>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <span className="text-[10px] text-[#34baab] font-black uppercase tracking-wider">Misión Dhermica</span>
                                        <Heart className="w-4 h-4 text-[#34baab] fill-[#34baab]" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Subir Nuevo Momento</h3>
                                <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleUpload} className="space-y-6">
                                <div 
                                    onClick={() => document.getElementById('impact-file')?.click()}
                                    className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${preview ? 'border-[#34baab]/20' : 'border-gray-100 hover:border-[#34baab]/40 hover:bg-teal-50/30'}`}
                                >
                                    {preview ? (
                                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-6">
                                            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                <Upload className="w-8 h-8 text-[#34baab]" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-900">Elegir Fotografía</p>
                                            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-black">Click para explorar</p>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        id="impact-file" 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleFileChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Descripción del momento</label>
                                    <textarea 
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Ej: Entrega de alimentos en el comedor del barrio..."
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#34baab] focus:border-transparent text-gray-900 bg-white font-medium resize-none h-32 transition-all"
                                        required
                                    />
                                </div>

                                <Button 
                                    type="submit" 
                                    className="w-full py-4 rounded-2xl font-black text-lg shadow-lg shadow-teal-100"
                                    disabled={uploading || !file || !description}
                                >
                                    {uploading ? 'Publicando...' : 'Publicar Momento'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
