'use client';

import { useState } from 'react';
import { useRentals } from '@/lib/hooks/useRentals';
import { Rental } from '@/lib/types/rental';
import { deleteRental } from '@/lib/firebase/rentals';
import { RentalTable } from '@/components/rentals/RentalTable';
import { RentalModal } from '@/components/rentals/RentalModal';
import { DeleteConfirmDialog } from '@/components/appointments/DeleteConfirmDialog';
import { Plus, ArrowLeft, Truck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { toast, Toaster } from 'sonner';

export default function AlquileresPage() {
    const { rentals, loading } = useRentals();
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleCreateClick = () => {
        setSelectedRental(null);
        setModalOpen(true);
    };

    const handleEditClick = (rental: Rental) => {
        setSelectedRental(rental);
        setModalOpen(true);
    };

    const handleDeleteClick = (rental: Rental) => {
        setSelectedRental(rental);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedRental) return;

        setDeleting(true);
        try {
            await deleteRental(selectedRental.id);
            toast.success('Alquiler eliminado exitosamente');
            setDeleteDialogOpen(false);
            setSelectedRental(null);
        } catch (error) {
            console.error('Error deleting rental:', error);
            toast.error('Error al eliminar el alquiler');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Toaster position="top-center" richColors />

            <div className="container mx-auto px-4 py-4 md:py-8">
                {/* Header */}
                <div className="bg-[#484450] rounded-2xl p-6 md:p-8 mb-4 shadow-lg flex items-center justify-between transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                            <Truck className="w-7 h-7 md:w-8 md:h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                                Alquileres
                            </h1>
                            <p className="text-sm md:text-base font-bold text-gray-300 uppercase tracking-widest leading-none mt-1">
                                Gestión de Equipos
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions below header */}
                <div className="max-w-5xl mx-auto mb-6 flex justify-end">
                    <Button
                        onClick={handleCreateClick}
                        className="bg-[#45a049] hover:bg-[#3d8b40] text-white px-5 py-3 rounded-xl font-bold shadow-md transform active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Alquiler
                    </Button>
                </div>

                {/* Main Content */}
                <div className="max-w-5xl mx-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34baab] mb-4"></div>
                            <p className="text-gray-500 font-medium">Cargando alquileres...</p>
                        </div>
                    ) : (
                        <RentalTable
                            rentals={rentals}
                            onEdit={handleEditClick}
                            onDelete={handleDeleteClick}
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            <RentalModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                rental={selectedRental || undefined}
            />

            <DeleteConfirmDialog
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Alquiler"
                description={`¿Estás seguro de que deseas eliminar el alquiler de "${selectedRental?.machine}" para ${selectedRental?.clientName}? Esta acción no se puede deshacer.`}
                loading={deleting}
            />
        </div>
    );
}
