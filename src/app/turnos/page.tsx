'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppointmentTable } from '@/components/appointments/AppointmentTable';
import { AppointmentModal } from '@/components/appointments/AppointmentModal';
import { DeleteConfirmDialog } from '@/components/appointments/DeleteConfirmDialog';
import { DatePicker } from '@/components/appointments/DatePicker';
import { AppointmentSearch } from '@/components/appointments/AppointmentSearch';
import { useAppointments } from '@/lib/hooks/useAppointments';
import { useProfessionals } from '@/lib/hooks/useProfessionals';
import { Appointment } from '@/lib/types/appointment';
import { deleteAppointment } from '@/lib/firebase/appointments';
import { getTodayDate } from '@/lib/utils/time';
import { toast, Toaster } from 'sonner';
import { Calendar, Users, ArrowLeft, Plus, Search, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

function TurnosContent() {
    const searchParams = useSearchParams();
    const dateParam = searchParams.get('date');
    const actionParam = searchParams.get('action');

    const [selectedDate, setSelectedDate] = useState(dateParam || '');
    const [mounted, setMounted] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [defaultTime, setDefaultTime] = useState<string | undefined>();
    const [defaultProfessionalId, setDefaultProfessionalId] = useState<string | undefined>();
    const [deleting, setDeleting] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const { professionals } = useProfessionals();
    const { appointments, loading } = useAppointments(selectedDate, professionals);

    useEffect(() => {
        setMounted(true);
        if (dateParam) {
            setSelectedDate(dateParam);
        } else {
            setSelectedDate(getTodayDate());
        }
    }, [dateParam]);

    useEffect(() => {
        if (actionParam === 'datepicker') setIsDatePickerOpen(true);
        if (actionParam === 'search') setIsSearchOpen(true);
    }, [actionParam]);

    // Listen for BottomNav events
    useEffect(() => {
        const toggleDatePicker = () => {
            setIsDatePickerOpen(prev => !prev);
            setIsSearchOpen(false);
        };
        const toggleSearch = () => {
            setIsSearchOpen(prev => !prev);
            setIsDatePickerOpen(false);
        };
        const handleSetDate = (e: any) => {
            if (e.detail) {
                setSelectedDate(e.detail);
                setIsDatePickerOpen(false);
                setIsSearchOpen(false);
            }
        };

        window.addEventListener('toggle-datepicker', toggleDatePicker);
        window.addEventListener('toggle-search', toggleSearch);
        window.addEventListener('set-date', handleSetDate);

        return () => {
            window.removeEventListener('toggle-datepicker', toggleDatePicker);
            window.removeEventListener('toggle-search', toggleSearch);
            window.removeEventListener('set-date', handleSetDate);
        };
    }, []);

    const handleSearchSelect = (appointment: Appointment) => {
        setSelectedDate(appointment.date);
        setIsSearchOpen(false);
        toast.info(`Cargando turnos para el día ${appointment.date}`);
    };

    const handleCreateClick = (time: string, professionalId?: string) => {
        setSelectedAppointment(null);
        setDefaultTime(time);
        setDefaultProfessionalId(professionalId);
        setModalOpen(true);
    };

    const handleEditClick = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setDefaultTime(undefined);
        setDefaultProfessionalId(undefined);
        setModalOpen(true);
    };

    const handleDeleteClick = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedAppointment) return;

        setDeleting(true);
        try {
            await deleteAppointment(selectedAppointment.id);
            toast.success('Turno eliminado exitosamente');
            setDeleteDialogOpen(false);
            setSelectedAppointment(null);
        } catch (error) {
            console.error('Error deleting appointment:', error);
            toast.error('Error al eliminar el turno');
        } finally {
            setDeleting(false);
        }
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedAppointment(null);
        setDefaultTime(undefined);
        setDefaultProfessionalId(undefined);
    };

    const countsByProfessional = professionals.map(prof => ({
        name: prof.name,
        color: prof.color,
        count: appointments.filter(apt => apt.professionalId === prof.id).length
    })).filter(p => p.count > 0);

    return (
        <div className="min-h-screen bg-white md:bg-gray-50 pb-32">
            <Toaster position="top-center" richColors />

            <div className="container mx-auto px-4 py-4 md:py-8">
                {/* Header with Dark Background */}
                <div className="bg-[#484450] rounded-2xl p-6 md:p-8 mb-6 md:mb-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                            <Calendar className="w-7 h-7 md:w-8 md:h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                                Dhermica
                            </h1>
                            <p className="text-sm md:text-base font-bold text-gray-300 uppercase tracking-widest leading-none mt-1">
                                {mounted && selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                            </p>
                        </div>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        <AppointmentSearch onSelectAppointment={handleSearchSelect} />
                        <Link href="/profesionales">
                            <Button variant="ghost" className="text-white hover:bg-white/10 border border-white/20 px-8 py-6 rounded-xl font-bold transition-all">
                                <Users className="w-5 h-5 mr-3 text-[#34baab]" /> Profesionales
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Desktop Sidebar: Date Picker */}
                    <div className="hidden lg:block lg:w-80">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
                            <label className="block text-sm font-bold text-gray-700 mb-4">
                                Selecciona una fecha
                            </label>
                            <DatePicker value={selectedDate} onChange={setSelectedDate} />
                        </div>
                    </div>

                    {/* Main Content: Table */}
                    <div className="flex-1">
                        <div className="bg-white rounded-2xl shadow-xl md:shadow-lg overflow-hidden border border-gray-100 min-h-[400px]">
                            {isSearchOpen && (
                                <div className="p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-gray-900">Buscar Turno</h2>
                                        <button
                                            onClick={() => setIsSearchOpen(false)}
                                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                        >
                                            <Plus className="w-5 h-5 text-gray-400 rotate-45" />
                                        </button>
                                    </div>
                                    <AppointmentSearch variant="inline" onSelectAppointment={handleSearchSelect} />
                                    <p className="text-sm text-gray-400 mt-6 text-center italic">
                                        Escribe el nombre del cliente o tratamiento...
                                    </p>
                                </div>
                            )}

                            {!isSearchOpen && (loading ? (
                                <div className="flex flex-col items-center justify-center py-24">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#45a049] mb-4"></div>
                                    <p className="text-gray-500 animate-pulse font-medium">Cargando turnos...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Summary at top of table */}
                                    <div className="p-4 md:p-6 bg-gray-50/50 border-b border-gray-100 flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-[#34baab] animate-pulse" />
                                                <span className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest">
                                                    Resumen del Día
                                                </span>
                                            </div>
                                            <div className="bg-white px-4 py-1.5 rounded-xl shadow-sm border border-gray-100">
                                                <span className="text-xs text-gray-400 mr-2 uppercase font-bold tracking-tighter">Total:</span>
                                                <span className="text-lg font-black text-[#34baab] leading-none">{mounted ? appointments.length : 0}</span>
                                            </div>
                                        </div>

                                        {countsByProfessional.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100/50">
                                                {countsByProfessional.map(cp => (
                                                    <div key={cp.name} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cp.color }} />
                                                        <span className="text-xs font-bold text-[#484450]">{cp.name}:</span>
                                                        <span className="text-sm font-black text-[#34baab]">{cp.count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <AppointmentTable
                                        appointments={appointments}
                                        professionals={professionals}
                                        onCreateClick={handleCreateClick}
                                        onEditClick={handleEditClick}
                                        onDeleteClick={handleDeleteClick}
                                    />
                                </>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile DatePicker Drawer/Modal */}
            {isDatePickerOpen && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" onClick={() => setIsDatePickerOpen(false)} />
                    <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 animate-in slide-in-from-bottom duration-300">
                        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
                        <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Selecciona una fecha</h3>
                        <DatePicker
                            value={selectedDate}
                            onChange={(date) => {
                                setSelectedDate(date);
                                setIsDatePickerOpen(false);
                            }}
                        />
                        <Button
                            className="w-full mt-6 py-4 rounded-xl font-bold"
                            onClick={() => setIsDatePickerOpen(false)}
                        >
                            Cerrar
                        </Button>
                    </div>
                </>
            )}


            {/* Modals */}
            <AppointmentModal
                isOpen={modalOpen}
                onClose={handleModalClose}
                appointment={selectedAppointment || undefined}
                professionals={professionals}
                existingAppointments={appointments}
                defaultTime={defaultTime}
                defaultProfessionalId={defaultProfessionalId}
                date={selectedDate}
            />

            <DeleteConfirmDialog
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                description="¿Está seguro que desea eliminar este turno? Esta acción no se puede deshacer."
                itemName={selectedAppointment?.clientName}
                itemDetail={`${selectedAppointment?.treatment} - ${selectedAppointment?.date} ${selectedAppointment?.time}`}
                loading={deleting}
            />
        </div>
    );
}

export default function TurnosPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-24 min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#45a049] mb-4"></div>
                <p className="text-gray-500 font-medium">Cargando...</p>
            </div>
        }>
            <TurnosContent />
        </Suspense>
    );
}
