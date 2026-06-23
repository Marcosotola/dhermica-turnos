'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { getProfessionals, createProfessional } from '@/lib/firebase/professionals';
import { getUsersByRole } from '@/lib/firebase/users';
import { Professional } from '@/lib/types/professional';
import { UserProfile } from '@/lib/types/user';
import { Plus, ArrowLeft, Users, ChevronRight, Search } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function ProfesionalesPage() {
    const router = useRouter();
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [professionalUsers, setProfessionalUsers] = useState<UserProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [color, setColor] = useState('#6366f1');
    const [order, setOrder] = useState(0);
    const [legacyCollectionName, setLegacyCollectionName] = useState('');
    const [serviceCommissionMode, setServiceCommissionMode] = useState<'percentage' | 'fixed'>('percentage');
    const [serviceCommissionPercentage, setServiceCommissionPercentage] = useState(0);
    const [productCommissionPercentage, setProductCommissionPercentage] = useState(0);

    useEffect(() => {
        loadProfessionals();
    }, []);

    const loadProfessionals = async () => {
        setLoading(true);
        try {
            const data = await getProfessionals();
            setProfessionals(data);
        } catch (error) {
            console.error('Error loading professionals:', error);
            toast.error('Error al cargar profesionales');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = async () => {
        setSelectedUser(null);
        setSearchQuery('');
        setShowSuggestions(false);
        setColor('#6366f1');
        setOrder(professionals.length);
        setLegacyCollectionName('');
        setServiceCommissionMode('percentage');
        setServiceCommissionPercentage(0);
        setProductCommissionPercentage(0);
        setModalOpen(true);
        try {
            const users = await getUsersByRole('professional');
            const linkedUserIds = new Set(professionals.map(p => p.userId).filter(Boolean));
            setProfessionalUsers(users.filter(u => !linkedUserIds.has(u.uid)));
        } catch {
            toast.error('Error al cargar usuarios profesionales');
        }
    };

    const filteredUsers = searchQuery.trim()
        ? professionalUsers.filter(u =>
            u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : professionalUsers;

    const handleSelectUser = (user: UserProfile) => {
        setSelectedUser(user);
        setSearchQuery(user.fullName || user.email);
        setShowSuggestions(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) {
            toast.error('Seleccioná un usuario profesional');
            return;
        }
        setSubmitting(true);
        try {
            await createProfessional({
                name: selectedUser.fullName || selectedUser.email,
                userId: selectedUser.uid,
                color,
                order,
                active: true,
                legacyCollectionName,
                serviceCommissionMode,
                serviceCommissionPercentage,
                productCommissionPercentage,
            });
            toast.success('Profesional creado');
            setModalOpen(false);
            loadProfessionals();
        } catch (error) {
            console.error('Error creating professional:', error);
            toast.error('Error al guardar');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />

            {/* Header */}
            <div className="bg-[#484450] text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex items-center gap-2 mb-6 text-gray-400 hover:text-white transition-colors group px-4 py-2 bg-white/5 rounded-xl border border-white/10 w-fit"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Volver</span>
                    </button>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-4">
                                <div className="p-3 bg-violet-500/20 rounded-2xl border border-violet-500/30">
                                    <Users className="w-8 h-8 text-violet-400" />
                                </div>
                                Gestión de Profesionales
                            </h1>
                            <p className="text-gray-300 font-medium">Gestiona el equipo y accede al panel individual de cada profesional.</p>
                        </div>
                        <Button
                            onClick={handleOpenModal}
                            className="bg-[#34baab] hover:bg-[#2aa89a] border-none rounded-2xl py-4 px-8 shadow-lg shadow-[#34baab]/20 transform hover:-translate-y-1 transition-all font-black uppercase tracking-widest text-xs"
                        >
                            <Plus className="w-5 h-5 mr-2" /> Nuevo Profesional
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34baab]" />
                    </div>
                ) : professionals.length === 0 ? (
                    <div className="bg-white rounded-[32px] border border-dashed border-gray-200 p-16 text-center shadow-sm">
                        <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-medium italic">No hay profesionales registrados.</p>
                        <button
                            type="button"
                            onClick={handleOpenModal}
                            className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#34baab] hover:underline"
                        >
                            + Agregar el primero
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {professionals.map((prof) => (
                            <div
                                key={prof.id}
                                onClick={() => router.push(`/profesionales/${prof.id}`)}
                                className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group"
                            >
                                <div className="h-1.5" style={{ backgroundColor: prof.color }} />
                                <div className="p-6">
                                    <div className="flex items-center gap-4 mb-5">
                                        <div
                                            className="w-14 h-14 rounded-[18px] flex items-center justify-center text-2xl font-black text-white shadow-lg flex-shrink-0"
                                            style={{ backgroundColor: prof.color }}
                                        >
                                            {prof.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-gray-900 text-lg truncate group-hover:text-[#34baab] transition-colors">
                                                {prof.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${prof.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {prof.active ? 'Activo' : 'Inactivo'}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                    Pos. #{prof.order}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {(prof.serviceCommissionPercentage || prof.productCommissionPercentage) ? (
                                        <div className="grid grid-cols-2 gap-3 mb-5">
                                            <div className="bg-violet-50 rounded-2xl p-3">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Servicios</p>
                                                <p className="text-xl font-black text-violet-500">{prof.serviceCommissionPercentage ?? 0}%</p>
                                            </div>
                                            <div className="bg-blue-50 rounded-2xl p-3">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Productos</p>
                                                <p className="text-xl font-black text-blue-500">{prof.productCommissionPercentage ?? 0}%</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-5 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Sin comisiones configuradas</p>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        {prof.legacyCollectionName ? (
                                            <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 truncate max-w-[120px]">
                                                {prof.legacyCollectionName}
                                            </span>
                                        ) : (
                                            <span />
                                        )}
                                        <div className="flex items-center gap-1 text-[10px] text-[#34baab] font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                            Ver Panel <ChevronRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Nuevo Profesional"
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="relative">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Profesional</label>
                        <div className="relative">
                            <Input
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setSelectedUser(null);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                placeholder="Buscar usuario con rol profesional..."
                                className="pl-9"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                        {showSuggestions && !selectedUser && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                {filteredUsers.length === 0 ? (
                                    <p className="px-4 py-3 text-sm text-gray-400">
                                        {professionalUsers.length === 0
                                            ? 'No hay usuarios con rol profesional disponibles'
                                            : 'Sin resultados'}
                                    </p>
                                ) : (
                                    filteredUsers.map(user => (
                                        <button
                                            key={user.uid}
                                            type="button"
                                            onClick={() => handleSelectUser(user)}
                                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                        >
                                            <p className="text-sm font-bold text-gray-900">{user.fullName}</p>
                                            <p className="text-[11px] text-gray-400">{user.email}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                        {selectedUser && (
                            <div className="mt-2 flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-900">{selectedUser.fullName}</p>
                                    <p className="text-[11px] text-gray-400">{selectedUser.email}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setSelectedUser(null); setSearchQuery(''); }}
                                    className="text-gray-400 hover:text-red-400 text-xs font-bold"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Color Identificador</label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-12 h-10 p-1 cursor-pointer"
                                />
                                <Input
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    placeholder="#000000"
                                    className="flex-1"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Orden</label>
                            <Input
                                type="number"
                                value={order}
                                onChange={(e) => setOrder(parseInt(e.target.value))}
                                min={0}
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Colección Legacy (Opcional)</label>
                        <Input
                            value={legacyCollectionName}
                            onChange={(e) => setLegacyCollectionName(e.target.value)}
                            placeholder="Ej: turnosLuciana"
                        />
                    </div>
                    <div className="pt-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Modo comisión servicios</label>
                        <div className="bg-gray-100 p-0.5 rounded-lg flex w-fit mb-3">
                            <button
                                type="button"
                                onClick={() => setServiceCommissionMode('percentage')}
                                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${serviceCommissionMode === 'percentage' ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-400'}`}
                            >
                                Porcentaje
                            </button>
                            <button
                                type="button"
                                onClick={() => setServiceCommissionMode('fixed')}
                                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${serviceCommissionMode === 'fixed' ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-400'}`}
                            >
                                Precio fijo
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {serviceCommissionMode === 'percentage' && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Comisión Servicios (%)</label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={serviceCommissionPercentage || ''}
                                            onChange={(e) => setServiceCommissionPercentage(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                            min={0} max={100} step={0.5}
                                            placeholder="Ej: 50"
                                            className="pl-9 font-bold"
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500 font-black">%</div>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Comisión Productos (%)</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={productCommissionPercentage || ''}
                                        onChange={(e) => setProductCommissionPercentage(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                        min={0} max={100} step={0.5}
                                        placeholder="Ej: 10"
                                        className="pl-9 font-bold"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 font-black">%</div>
                                </div>
                            </div>
                        </div>
                        {serviceCommissionMode === 'fixed' && (
                            <p className="text-[11px] text-gray-400 mt-2">Los precios por servicio se configuran después de crear el profesional, desde su página de configuración.</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-[#45a049] hover:bg-[#3d8b40] text-white" disabled={submitting}>
                            {submitting ? 'Guardando...' : 'Crear Profesional'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
