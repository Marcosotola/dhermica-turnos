'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Professional, ProfessionalPrice } from '@/lib/types/professional';
import { updateProfessional, toggleProfessionalStatus, deleteProfessional } from '@/lib/firebase/professionals';
import { Treatment } from '@/lib/types/treatment';
import { getTreatments } from '@/lib/firebase/treatments';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Save, Trash2, Shield, ShieldOff, ChevronDown, ChevronRight } from 'lucide-react';

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
    const [serviceCommissionMode, setServiceCommissionMode] = useState<'percentage' | 'fixed'>(professional.serviceCommissionMode || 'percentage');
    const [serviceCommissionPercentage, setServiceCommissionPercentage] = useState(professional.serviceCommissionPercentage || 0);
    const [productCommissionPercentage, setProductCommissionPercentage] = useState(professional.productCommissionPercentage || 0);
    const [professionalPrices, setProfessionalPrices] = useState<ProfessionalPrice[]>(professional.professionalPrices || []);

    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [expandedTreatments, setExpandedTreatments] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (serviceCommissionMode === 'fixed') {
            getTreatments().then(setTreatments);
        }
    }, [serviceCommissionMode]);

    const getProfessionalPrice = (treatmentId: string, zone?: string, gender?: string): number | undefined => {
        return professionalPrices.find(
            p => p.treatmentId === treatmentId && p.zone === zone && (p.gender || 'both') === (gender || 'both')
        )?.price;
    };

    const setProfessionalPrice = (treatmentId: string, treatmentName: string, zone: string | undefined, gender: string | undefined, price: number) => {
        setProfessionalPrices(prev => {
            const idx = prev.findIndex(
                p => p.treatmentId === treatmentId && p.zone === zone && (p.gender || 'both') === (gender || 'both')
            );
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], price };
                return updated;
            }
            return [...prev, { treatmentId, treatmentName, zone, gender: gender as ProfessionalPrice['gender'], price }];
        });
    };

    const toggleTreatmentExpanded = (id: string) => {
        setExpandedTreatments(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateProfessional(professional.id, {
                name,
                color,
                order,
                legacyCollectionName,
                serviceCommissionMode,
                serviceCommissionPercentage,
                productCommissionPercentage,
                professionalPrices: serviceCommissionMode === 'fixed' ? professionalPrices : [],
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

                        <div className="mb-4">
                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Modo de comisión por servicios</label>
                            <div className="bg-gray-100 p-0.5 rounded-lg flex mt-1 w-fit">
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
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {serviceCommissionMode === 'percentage' && (
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
                            )}
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

                        {serviceCommissionMode === 'fixed' && (
                            <div className="mt-6">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">
                                    Precios del profesional por servicio
                                </p>
                                <p className="text-[11px] text-gray-400 mb-4">
                                    Ingresá el monto que cobra el profesional por cada servicio. El local cobra el precio del catálogo al cliente.
                                </p>
                                {treatments.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">Cargando tratamientos...</p>
                                ) : (
                                    <div className="space-y-2">
                                        {treatments.map(treatment => (
                                            <div key={treatment.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleTreatmentExpanded(treatment.id)}
                                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {expandedTreatments.has(treatment.id) ? (
                                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                                        )}
                                                        <span className="text-sm font-bold text-gray-900">{treatment.name}</span>
                                                        <span className="text-[10px] text-gray-400 uppercase">{treatment.category}</span>
                                                    </div>
                                                    {treatment.prices.some(tp => getProfessionalPrice(treatment.id, tp.zone, tp.gender) !== undefined) && (
                                                        <span className="text-[10px] font-bold text-violet-500 uppercase">Configurado</span>
                                                    )}
                                                </button>
                                                {expandedTreatments.has(treatment.id) && (
                                                    <div className="px-4 pb-3 space-y-2 border-t border-gray-50">
                                                        {treatment.prices.map((tp, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 pt-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[11px] text-gray-500">
                                                                        {tp.zone || 'General'}
                                                                        {tp.gender && tp.gender !== 'both' ? ` · ${tp.gender === 'male' ? 'Hombre' : 'Mujer'}` : ''}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-300">
                                                                        Precio cliente: ${tp.price.toLocaleString('es-AR')}
                                                                    </p>
                                                                </div>
                                                                <div className="relative w-32">
                                                                    <Input
                                                                        type="number"
                                                                        value={getProfessionalPrice(treatment.id, tp.zone, tp.gender) ?? ''}
                                                                        onChange={(e) => setProfessionalPrice(
                                                                            treatment.id,
                                                                            treatment.name,
                                                                            tp.zone,
                                                                            tp.gender,
                                                                            e.target.value === '' ? 0 : parseFloat(e.target.value)
                                                                        )}
                                                                        min={0}
                                                                        placeholder="Precio prof."
                                                                        className="pl-6 text-sm font-bold"
                                                                    />
                                                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-violet-500 font-black text-xs">$</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
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
