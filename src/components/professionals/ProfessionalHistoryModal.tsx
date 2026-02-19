'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Professional } from '@/lib/types/professional';
import { Appointment } from '@/lib/types/appointment';
import { getAppointmentsByProfessionalId } from '@/lib/firebase/appointments';
import { Calendar, Clock, User, Clipboard, History, X, Search, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface ProfessionalHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    professional: Professional | null;
}

const ITEMS_PER_PAGE = 10;

export function ProfessionalHistoryModal({ isOpen, onClose, professional }: ProfessionalHistoryModalProps) {
    const [history, setHistory] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

    useEffect(() => {
        if (isOpen && professional) {
            loadHistory();
        } else {
            setHistory([]);
            setSearchTerm('');
            setVisibleCount(ITEMS_PER_PAGE);
        }
    }, [isOpen, professional]);

    const loadHistory = async () => {
        if (!professional) return;
        setLoading(true);
        try {
            const data = await getAppointmentsByProfessionalId(professional.id);
            setHistory(data);
        } catch (error) {
            console.error('Error loading professional history:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = useMemo(() => {
        if (!searchTerm) return history;
        const term = searchTerm.toLowerCase();
        return history.filter(apt =>
            apt.clientName.toLowerCase().includes(term) ||
            apt.treatment.toLowerCase().includes(term)
        );
    }, [history, searchTerm]);

    const visibleHistory = useMemo(() => {
        return filteredHistory.slice(0, visibleCount);
    }, [filteredHistory, visibleCount]);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    };

    if (!professional) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Historial: ${professional.name}`}
            size="lg"
        >
            <div className="pt-4 max-h-[70vh] flex flex-col">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 flex items-center gap-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <History className="w-5 h-5 text-blue-600" />
                        <div>
                            <p className="text-sm font-bold text-blue-900 leading-tight">Historial Completo</p>
                            <p className="text-xs text-blue-700">Incluye turnos nuevos y bases de datos históricas</p>
                        </div>
                    </div>

                    <div className="w-full md:w-64">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar cliente o servicio..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setVisibleCount(ITEMS_PER_PAGE); // Reset pagination on search
                                }}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-500 font-medium">Cargando historial...</p>
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                        {searchTerm ? (
                            <>
                                <Search className="w-12 h-12 text-gray-200 mb-3" />
                                <p className="text-gray-500 font-medium italic">No se encontraron resultados para "{searchTerm}"</p>
                            </>
                        ) : (
                            <>
                                <History className="w-12 h-12 text-gray-200 mb-3" />
                                <p className="text-gray-500 font-medium italic">No se encontraron turnos registrados</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="overflow-y-auto space-y-4 pr-2 custom-scrollbar flex-1">
                        {visibleHistory.map((apt) => {
                            // Extract date parts
                            const [year, month, day] = apt.date.split('-');
                            const formattedDate = apt.date.includes('-') ? `${day}/${month}/${year}` : apt.date;

                            return (
                                <div
                                    key={apt.id}
                                    className="bg-white border-2 border-gray-50 rounded-2xl p-4 hover:border-blue-100 transition-all shadow-sm hover:shadow-md"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-gray-100 p-2 rounded-lg">
                                                    <Calendar className="w-4 h-4 text-gray-600" />
                                                </div>
                                                <span className="font-black text-gray-900">{formattedDate}</span>
                                                <div className="flex items-center gap-1.5 ml-2 text-gray-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="text-sm font-bold">{apt.time}hs</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-teal-600" />
                                                <span className="font-bold text-gray-800">{apt.clientName}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <div className="bg-teal-50 px-3 py-1 rounded-full border border-teal-100 flex items-center gap-1.5">
                                                <Clipboard className="w-3 h-3 text-teal-600" />
                                                <span className="text-xs font-black text-teal-700 uppercase">{apt.treatment}</span>
                                            </div>
                                            {apt.price && (
                                                <span className="text-sm font-black text-blue-600">${apt.price.toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>

                                    {apt.notes && (
                                        <div className="mt-3 pt-3 border-t border-gray-50">
                                            <p className="text-xs text-gray-500 italic leading-relaxed line-clamp-2">
                                                {apt.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {visibleCount < filteredHistory.length && (
                            <div className="pt-4 pb-2 flex justify-center">
                                <Button
                                    variant="ghost"
                                    onClick={handleLoadMore}
                                    className="text-blue-600 hover:bg-blue-50 font-black flex items-center gap-2"
                                >
                                    <ChevronDown className="w-5 h-5" />
                                    Ver más ({filteredHistory.length - visibleCount} restantes)
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
