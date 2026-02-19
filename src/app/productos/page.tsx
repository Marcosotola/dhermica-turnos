'use client';

import { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Plus, Search, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getProducts, createProduct, updateProduct, deleteProduct, uploadProductImage } from '@/lib/firebase/products';
import { Product } from '@/lib/types/product';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductForm } from '@/components/products/ProductForm';
import { ProductDetail } from '@/components/products/ProductDetail';
import { Button } from '@/components/ui/Button';
import { toast, Toaster } from 'sonner';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { haptics } from '@/lib/utils/haptics';

export default function ProductosPage() {
    const { profile, loading: authLoading } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modals state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const isAdmin = profile?.role === 'admin' || profile?.role === 'secretary';

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (error) {
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            // Logic for uploading images needs handling here as data.images contains DataURLs or strings
            // For now, satisfy the UI. Real implementation would convert DataURLs to Blobs/Files.
            const productId = await createProduct({ ...data, images: [] });

            // Re-upload images properly if they are new
            const uploadedUrls: string[] = [];
            for (const img of data.images) {
                if (img.startsWith('data:')) {
                    const response = await fetch(img);
                    const blob = await response.blob();
                    const file = new File([blob], 'product_image.jpg', { type: blob.type });
                    const url = await uploadProductImage(productId, file);
                    uploadedUrls.push(url);
                } else {
                    uploadedUrls.push(img);
                }
            }

            await updateProduct(productId, { images: uploadedUrls });
            toast.success('Producto añadido al catálogo');
            fetchProducts();
        } catch (error) {
            console.error(error);
            toast.error('Error al crear producto');
        }
    };

    const handleUpdate = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!editingProduct) return;
        try {
            const productId = editingProduct.id;
            const uploadedUrls: string[] = [];

            for (const img of data.images) {
                if (img.startsWith('data:')) {
                    const response = await fetch(img);
                    const blob = await response.blob();
                    const file = new File([blob], 'product_image.jpg', { type: blob.type });
                    const url = await uploadProductImage(productId, file);
                    uploadedUrls.push(url);
                } else {
                    uploadedUrls.push(img);
                }
            }

            await updateProduct(productId, { ...data, images: uploadedUrls });
            toast.success('Producto actualizado');
            fetchProducts();
            setEditingProduct(undefined);
        } catch (error) {
            toast.error('Error al actualizar');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este producto y sus imágenes?')) {
            try {
                await deleteProduct(id);
                toast.success('Producto eliminado permanentemente');
                fetchProducts();
            } catch (error) {
                toast.error('Error al eliminar');
            }
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [products, searchQuery]);

    if (authLoading && products.length === 0) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34baab]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />

            {/* Header Section */}
            <div className="bg-[#484450] text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
                                <ShoppingBag className="w-8 h-8 text-[#34baab]" /> Tienda de Productos
                            </h1>
                            <p className="text-gray-300 font-medium">Llevá el cuidado de Dhermica a tu casa.</p>
                        </div>
                        {isAdmin && (
                            <Button
                                onClick={() => { setEditingProduct(undefined); setIsFormOpen(true); }}
                                className="bg-[#34baab] hover:bg-[#2aa89a] border-none rounded-2xl py-4 px-8 shadow-lg shadow-[#34baab]/20 transform hover:-translate-y-1 transition-all font-black uppercase tracking-widest text-xs"
                            >
                                <Plus className="w-5 h-5 mr-2" /> Nuevo Producto
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
                {/* Search Bar */}
                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-4 md:p-6 mb-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
                        <input
                            type="text"
                            placeholder="Buscar en el catálogo..."
                            className="w-full pl-14 pr-4 py-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#34baab] outline-none text-gray-900 font-bold shadow-inner text-lg placeholder:text-gray-300"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <CardSkeleton key={i} />
                        ))}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <ShoppingBag className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">Catálogo vacío</h3>
                        <p className="text-gray-500 font-medium">Aún no hay productos en esta sección.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                        {filteredProducts.map((p, index) => (
                            <ProductCard
                                key={p.id}
                                product={p}
                                isAdmin={isAdmin}
                                onEdit={(p) => { setEditingProduct(p); setIsFormOpen(true); }}
                                onDelete={handleDelete}
                                onClick={(p) => {
                                    haptics.light();
                                    setSelectedProduct(p);
                                    setIsDetailOpen(true);
                                }}
                                priority={index < 2}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <ProductForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                product={editingProduct}
                onSubmit={editingProduct ? handleUpdate : handleCreate}
            />

            <ProductDetail
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                product={selectedProduct}
                isAdmin={isAdmin}
                onEdit={(p) => { setEditingProduct(p); setIsFormOpen(true); }}
                onDelete={handleDelete}
            />
        </div>
    );
}
