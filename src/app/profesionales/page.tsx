'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
    getProfessionals,
    createProfessional,
    updateProfessional,
    toggleProfessionalStatus,
    deleteProfessional
} from '@/lib/firebase/professionals';
import { Professional } from '@/lib/types/professional';
import { Plus, Edit2, Check, X, Shield, ShieldOff, Palette, ArrowLeft, Trash2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';

export default function ProfesionalesPage() {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
    const [professionalToDelete, setProfessionalToDelete] = useState<Professional | null>(null);

    // Form states
    const [name, setName] = useState('');
    const [color, setColor] = useState('#6366f1');
    const [order, setOrder] = useState(0);
    const [legacyCollectionName, setLegacyCollectionName] = useState('');
    const [submitting, setSubmitting] = useState(false);

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

    const handleOpenModal = (prof?: Professional) => {
        if (prof) {
            setEditingProfessional(prof);
            setName(prof.name);
            setColor(prof.color);
            setOrder(prof.order);
            setLegacyCollectionName(prof.legacyCollectionName || '');
        } else {
            setEditingProfessional(null);
            setName('');
            setColor('#6366f1');
            setOrder(professionals.length);
            setLegacyCollectionName('');
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingProfessional) {
                await updateProfessional(editingProfessional.id, { name, color, order, legacyCollectionName });
                toast.success('Profesional actualizado');
            } else {
                await createProfessional({ name, color, order, active: true, legacyCollectionName });
                toast.success('Profesional creado');
            }
            setModalOpen(false);
            loadProfessionals();
        } catch (error) {
            console.error('Error saving professional:', error);
            toast.error('Error al guardar');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await toggleProfessionalStatus(id, !currentStatus);
            toast.success(currentStatus ? 'Profesional desactivado' : 'Profesional activado');
            loadProfessionals();
        } catch (error) {
            console.error('Error toggling status:', error);
            toast.error('Error al cambiar estado');
        }
    };

    const handleDeleteClick = (prof: Professional) => {
        setProfessionalToDelete(prof);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!professionalToDelete) return;

        setSubmitting(true);
        try {
            await deleteProfessional(professionalToDelete.id);
            toast.success('Profesional eliminado correctamente');
            setDeleteDialogOpen(false);
            setProfessionalToDelete(null);
            loadProfessionals();
        } catch (error) {
            console.error('Error deleting professional:', error);
            toast.error('Error al eliminar el profesional');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-24 md:pb-8">
            <Toaster position="top-center" richColors />

            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Gestión de Profesionales</h1>
                        <p className="text-gray-600">Configura quiénes aparecen en la tabla de turnos</p>
                    </div>
                    <Button onClick={() => handleOpenModal()} className="bg-[#45a049] hover:bg-[#3d8b40] text-white shadow-md">
                        <Plus className="w-4 h-4 mr-2" /> Nuevo Profesional
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#45a049]"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-md overflow-x-auto">
                        <table className="w-full border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-[#f2f2f2] text-[#484450] border-b">
                                    <th className="px-6 py-4 text-left font-semibold w-20">#</th>
                                    <th className="px-6 py-4 text-left font-semibold text-xs uppercase tracking-wider">Profesional</th>
                                    <th className="px-6 py-4 text-left font-semibold text-xs uppercase tracking-wider">Colección Legacy</th>
                                    <th className="px-6 py-4 text-left font-semibold text-xs uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-right font-semibold text-xs uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {professionals.map((prof) => (
                                    <tr key={prof.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600 font-medium">#{prof.order}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-4 h-4 rounded-full shadow-sm"
                                                    style={{ backgroundColor: prof.color }}
                                                />
                                                <span className="font-semibold text-gray-900">{prof.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                            {prof.legacyCollectionName || <span className="text-gray-300">Ninguna</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${prof.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {prof.active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleStatus(prof.id, prof.active)}
                                                    className={`p-2 rounded-lg transition-colors ${prof.active ? 'hover:bg-red-50 text-red-600' : 'hover:bg-green-50 text-green-600'
                                                        }`}
                                                    title={prof.active ? 'Desactivar' : 'Activar'}
                                                >
                                                    {prof.active ? <ShieldOff className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(prof)}
                                                    className="p-2 hover:bg-gray-100 rounded-lg text-blue-600 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(prof)}
                                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {professionals.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                                            No hay profesionales registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingProfessional ? 'Editar Profesional' : 'Nuevo Profesional'}
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre del profesional"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Color Identificador</label>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Orden de Visualización</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Colección Legacy (Opcional)</label>
                        <Input
                            value={legacyCollectionName}
                            onChange={(e) => setLegacyCollectionName(e.target.value)}
                            placeholder="Ej: turnosLuciana"
                        />
                        <p className="text-xs text-gray-500 mt-1">Nombre de la colección en Firebase de donde extraer datos históricos.</p>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-[#45a049] hover:bg-[#3d8b40] text-white" disabled={submitting}>
                            {submitting ? 'Guardando...' : 'Guardar Profesional'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Confirmation Dialog */}
            <Modal
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                title="Eliminar Profesional"
                size="sm"
            >
                <div className="pt-4">
                    <p className="text-gray-600 mb-6">
                        ¿Estás seguro de que deseas eliminar a <span className="font-bold text-gray-900">{professionalToDelete?.name}</span>? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={submitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleConfirmDelete}
                            disabled={submitting}
                        >
                            {submitting ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
