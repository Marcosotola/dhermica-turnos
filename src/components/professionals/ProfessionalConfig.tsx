'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Professional } from '@/lib/types/professional';
import { updateProfessional, toggleProfessionalStatus, deleteProfessional } from '@/lib/firebase/professionals';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Save, Trash2, Shield, ShieldOff } from 'lucide-react';

interface ProfessionalConfigProps {
    professional: Professional;
    onUpdate: () => void;
}

export function ProfessionalConfig({ professional, onUpdate }: ProfessionalConfigProps) {
    const router = useRouter();

    const [name, setName] = useState(professional.name);
    const [color, setColor] = useState(professional.color);
    const [order, setOrder] = useState(professional.order);
    const [legacyCollectionName, setLegacyCollectionName] = useState(professional.legacyCollectionName || '');
    const [serviceCommissionPercentage, setServiceCommissionPercentage] = useState(professional.serviceCommissionPercentage || 0);
    const [productCommissionPercentage, setProductCommissionPercentage] = useState(professional.productCommissionPercentage || 0);

    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateProfessional(professional.id, {
                name,
                color,
                order,
                legacyCollectionName,
                serviceCommissionPercentage,
                productCommissionPercentage,
            });
            toast.success('Configuración guardada');
            onUpdate();
        } catch {
            toast.error('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async () => {
        setToggling(true);
        try {
            await toggleProfessionalStatus(professional.id, !professional.active);
            toast.success(professional.active ? 'Profesional desactivado' : 'Profesional activado');
            onUpdate();
        } catch {
            toast.error('Error al cambiar estado');
        } finally {
            setToggling(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteProfessional(professional.id);
            toast.success('Profesional eliminado');
            router.push('/profesionales');
        } catch {
            toast.error('Error al eliminar');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Datos y Comisiones */}
            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-1">Datos del Profesional</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-8">Información general y comisiones</p>

                <form onSubmit={handleSave} className="space-y-5">
                    <div>
                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Nombre</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Color Identificador</label>
                            <div className="flex gap-2 mt-1">
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
                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Orden en Tablero</label>
                            <Input
                                type="number"
                                value={order}
                                onChange={(e) => setOrder(parseInt(e.target.value))}
                                min={0}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Colección Legacy (Opcional)</label>
                        <Input
                            value={legacyCollectionName}
                            onChange={(e) => setLegacyCollectionName(e.target.value)}
                            placeholder="Ej: turnosLuciana"
                            className="mt-1"
                        />
                        <p className="text-[10px] text-gray-400 font-bold mt-1">Nombre de la colección Firebase para datos históricos.</p>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">Comisiones</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Servicios (%)</label>
                                <div className="relative mt-1">
                                    <Input
                                        type="number"
                                        value={serviceCommissionPercentage || ''}
                                        onChange={(e) => setServiceCommissionPercentage(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        placeholder="Ej: 50"
                                        className="pl-9 font-bold"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500 font-black text-sm">%</div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Productos (%)</label>
                                <div className="relative mt-1">
                                    <Input
                                        type="number"
                                        value={productCommissionPercentage || ''}
                                        onChange={(e) => setProductCommissionPercentage(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        placeholder="Ej: 10"
                                        className="pl-9 font-bold"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 font-black text-sm">%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100">
                        <Button
                            type="submit"
                            className="bg-[#34baab] hover:bg-[#2aa89a] text-white border-none font-black uppercase tracking-widest text-[10px]"
                            disabled={saving}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Estado */}
            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-1">Estado</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">
                    El profesional está actualmente{' '}
                    <span className={`font-black ${professional.active ? 'text-green-500' : 'text-red-500'}`}>
                        {professional.active ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                </p>
                <button
                    onClick={handleToggleStatus}
                    disabled={toggling}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                        professional.active
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-100'
                    }`}
                >
                    {professional.active ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    {toggling ? 'Procesando...' : professional.active ? 'Desactivar Profesional' : 'Activar Profesional'}
                </button>
            </div>

            {/* Zona de Peligro */}
            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-red-100 shadow-sm">
                <h3 className="text-xl font-black text-red-600 uppercase tracking-tight mb-1">Zona de Peligro</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">
                    Esta acción es irreversible. Todos los datos del profesional serán eliminados.
                </p>
                <button
                    onClick={() => setDeleteDialogOpen(true)}
                    className="flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                    Eliminar Profesional
                </button>
            </div>

            <Modal
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                title="Eliminar Profesional"
                size="sm"
            >
                <div className="pt-4">
                    <p className="text-gray-600 mb-6">
                        ¿Estás seguro de que deseas eliminar a{' '}
                        <span className="font-bold text-gray-900">{professional.name}</span>?
                        Esta acción no se puede deshacer.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                            Cancelar
                        </Button>
                        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                            {deleting ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
