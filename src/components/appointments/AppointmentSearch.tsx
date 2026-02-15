'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Search, X, Loader2, Calendar } from 'lucide-react';
import { Appointment } from '@/lib/types/appointment';
import { searchAppointmentsByClient } from '@/lib/firebase/appointments';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { formatDate } from '@/lib/utils/time';

interface AppointmentSearchProps {
    onSelectAppointment?: (appointment: Appointment) => void;
    variant?: 'dropdown' | 'inline';
}

export function AppointmentSearch({ onSelectAppointment, variant = 'dropdown' }: AppointmentSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const debouncedQuery = useDebounce(query, 500);

    useEffect(() => {
        if (debouncedQuery.length < 3) {
            setResults([]);
            return;
        }

        const performSearch = async () => {
            setLoading(true);
            try {
                const data = await searchAppointmentsByClient(debouncedQuery);
                setResults(data);
                setIsOpen(true);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        };

        performSearch();
    }, [debouncedQuery]);

    return (
        <div className="relative w-full max-w-md">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                    placeholder="Buscar por cliente o tratamiento..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10 pr-10 h-12 text-lg shadow-sm border-gray-200 focus:border-[#45a049] focus:ring-[#45a049]"
                    onFocus={() => query.length >= 3 && setIsOpen(true)}
                />
                {query && (
                    <button
                        onClick={() => {
                            setQuery('');
                            setResults([]);
                            setIsOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {isOpen && (results.length > 0 || loading) && (
                <div className={`${variant === 'dropdown'
                    ? 'absolute top-full left-0 right-0 mt-2 shadow-xl border border-gray-100'
                    : 'relative mt-4 border-t border-gray-100'
                    } bg-white rounded-xl z-30 overflow-hidden flex flex-col md:max-h-[500px] max-h-[45vh]`}
                >
                    <div className="overflow-y-auto flex-1 p-2">
                        {loading ? (
                            <div className="p-8 text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-[#45a049] mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Buscando...</p>
                            </div>
                        ) : (
                            results.map((apt) => (
                                <div
                                    key={apt.id}
                                    onClick={() => {
                                        onSelectAppointment?.(apt);
                                        setIsOpen(false);
                                        setQuery('');
                                    }}
                                    className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-b last:border-0"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-gray-900">{apt.clientName}</p>
                                            <p className="text-sm text-gray-600">{apt.treatment}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 text-xs text-[#45a049] font-semibold bg-green-50 px-2 py-1 rounded">
                                                <Calendar className="w-3 h-3" />
                                                {(() => {
                                                    const [year, month, day] = apt.date.split('-');
                                                    return `${day}/${month}/${year}`;
                                                })()}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{apt.time} hs</p>
                                        </div>
                                    </div>
                                    {apt.notes && (
                                        <p className="text-xs text-gray-400 mt-1 italic truncate">"{apt.notes}"</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {isOpen && query.length >= 3 && results.length === 0 && !loading && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-6 text-center text-gray-500">
                    No se encontraron turnos para "{query}"
                </div>
            )}
        </div>
    );
}
