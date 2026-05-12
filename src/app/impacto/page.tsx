'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Heart, Plus, Trash2, X, Upload, Sparkles, ImageIcon, Calendar, Maximize2, Edit2 } from 'lucide-react';
import { getImpactImages, uploadImpactImage, deleteImpactImage, updateImpactDescription } from '@/lib/firebase/impact';
import { ImpactImage } from '@/lib/types/impact';
import { toast, Toaster } from 'sonner';
import { Button } from '@/components/ui/Button';

export default function ImpactPage() {
    const { user, profile } = useAuth();
    const [images, setImages] = useState<ImpactImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<ImpactImage | null>(null);
    const [editingImage, setEditingImage] = useState<ImpactImage | null>(null);

    // Form states
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [editDescription, setEditDescription] = useState('');

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

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingImage || !editDescription) return;

        setUploading(true);
        try {
            await updateImpactDescription(editingImage.id, editDescription);
            toast.success('Descripción actualizada');
            setIsEditModalOpen(false);
            setEditingImage(null);
            setEditDescription('');
            loadImages();
        } catch (error) {
            console.error('Error updating:', error);
            toast.error('Error al actualizar');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, image: ImpactImage) => {
        e.stopPropagation();
        if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) return;

        try {
            await deleteImpactImage(image.id, (image as any).storagePath);
            toast.success('Imagen eliminada');
            loadImages();
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error('Error al eliminar');
        }
    };

    const openEditModal = (e: React.MouseEvent, image: ImpactImage) => {
        e.stopPropagation();
        setEditingImage(image);
        setEditDescription(image.description);
        setIsEditModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />
            
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-[#484450] rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-16 mb-8 md:mb-12 shadow-xl text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Heart className="w-48 h-48 md:w-64 md:h-64" />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black mb-4 md:mb-6 text-white leading-tight tracking-tighter">
                        Un Momento para <span className="text-[#34baab]">Vos</span>,<br className="md:hidden" />
                        una Bendición para <span className="text-[#34baab]">Otros</span>
                    </h1>
                    <p className="text-sm md:text-xl opacity-90 font-light max-w-2xl mx-auto leading-relaxed">
                        Con cada tratamiento en Dhermica, estás apoyando nuestras misiones sociales. 
                        Aquí compartimos algunos de los momentos donde tu elección se convirtió en esperanza.
                    </p>
                    
                    {canManage && (
                        <button 
                            onClick={() => setIsUploadModalOpen(true)}
                            className="mt-6 md:mt-8 bg-[#34baab] text-white px-6 md:px-8 py-2.5 md:py-3 rounded-2xl font-bold flex items-center gap-2 mx-auto hover:scale-105 transition-transform shadow-lg text-sm md:text-base"
                        >
                            <Plus className="w-4 h-4 md:w-5 md:h-5" /> Subir Momento
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8">
                        {images.map((image) => (
                            <div 
                                key={image.id} 
                                onClick={() => setSelectedImage(image)}
                                className="bg-white rounded-2xl md:rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 group hover:shadow-md transition-all cursor-pointer relative"
                            >
                                <div className="aspect-square md:aspect-[4/5] relative overflow-hidden">
                                    <img 
                                        src={image.imageUrl} 
                                        alt={image.description} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                        <Maximize2 className="text-white w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    {canManage && (
                                        <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col gap-2 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => handleDelete(e, image)}
                                                className="bg-red-500 text-white p-1.5 md:p-2 rounded-lg md:rounded-xl backdrop-blur-sm hover:bg-red-600"
                                            >
                                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                                            </button>
                                            <button 
                                                onClick={(e) => openEditModal(e, image)}
                                                className="bg-white text-gray-900 p-1.5 md:p-2 rounded-lg md:rounded-xl backdrop-blur-sm hover:bg-gray-100 border border-gray-100"
                                            >
                                                <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 md:p-6">
                                    <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5 md:mb-3">
                                        <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                        {new Date(image.date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                                    </div>
                                    <p className="text-gray-700 leading-tight md:leading-relaxed font-medium italic text-[10px] md:text-base line-clamp-2 md:line-clamp-none">
                                        "{image.description}"
                                    </p>
                                    <div className="mt-2 md:mt-4 pt-2 md:pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <span className="text-[7px] md:text-[10px] text-[#34baab] font-black uppercase tracking-wider">Impacto</span>
                                        <Heart className="w-2.5 h-2.5 md:w-4 md:h-4 text-[#34baab] fill-[#34baab]" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300"
                    onClick={() => setSelectedImage(null)}
                >
                    <button className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                    
                    <div className="max-w-4xl w-full flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
                        <img 
                            src={selectedImage.imageUrl} 
                            alt={selectedImage.description} 
                            className="max-h-[70vh] w-auto rounded-2xl shadow-2xl"
                        />
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl w-full text-white text-center">
                            <p className="text-xl font-medium italic leading-relaxed">
                                "{selectedImage.description}"
                            </p>
                            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-white/60 font-bold uppercase tracking-widest">
                                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(selectedImage.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                <span className="w-1 h-1 bg-white/20 rounded-full" />
                                <span className="text-[#34baab]">Misión Dhermica</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Editar Descripción</h3>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="aspect-video rounded-2xl overflow-hidden mb-4 border border-gray-100">
                                    <img src={editingImage?.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Descripción del momento</label>
                                    <textarea 
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#34baab] focus:border-transparent text-gray-900 bg-white font-medium resize-none h-32 transition-all"
                                        required
                                    />
                                </div>

                                <Button 
                                    type="submit" 
                                    className="w-full py-4 rounded-2xl font-black text-lg shadow-lg shadow-teal-100"
                                    disabled={uploading || !editDescription}
                                >
                                    {uploading ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
