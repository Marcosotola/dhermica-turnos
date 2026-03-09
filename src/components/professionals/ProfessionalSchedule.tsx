'use client';

import { useState, useEffect } from 'react';
import { Professional } from '@/lib/types/professional';
import { getTreatments } from '@/lib/firebase/treatments';
import { updateProfessional } from '@/lib/firebase/professionals';
import { Treatment } from '@/lib/types/treatment';
import {
    Clock,
    Calendar,
    Save,
    Plus,
    Trash2,
    Check,
    X,
    AlertCircle,
    Coffee
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

interface ProfessionalScheduleProps {
    professional: Professional;
    onUpdate: () => void;
}

const DAYS = [
    { id: '0', name: 'Domingo' },
    { id: '1', name: 'Lunes' },
    { id: '2', name: 'Martes' },
    { id: '3', name: 'Miércoles' },
    { id: '4', name: 'Jueves' },
    { id: '5', name: 'Viernes' },
    { id: '6', name: 'Sábado' },
];

export function ProfessionalSchedule({ professional, onUpdate }: ProfessionalScheduleProps) {
    const [submitting, setSubmitting] = useState(false);
    const [treatments, setTreatments] = useState<Treatment[]>([]);

    // Form states
    const [workingHours, setWorkingHours] = useState(professional.workingHours || {});
    const [selectedServices, setSelectedServices] = useState<string[]>(professional.services || []);
    const [exceptions, setExceptions] = useState(professional.exceptions || []);

    useEffect(() => {
        getTreatments().then(setTreatments);
    }, []);

    const handleToggleDay = (dayId: string) => {
        const current = workingHours[dayId] || { start: '09:00', end: '18:00', enabled: false };
        setWorkingHours({
            ...workingHours,
            [dayId]: { ...current, enabled: !current.enabled }
        });
    };

    const handleTimeChange = (dayId: string, field: 'start' | 'end' | 'lunchStart' | 'lunchEnd', value: string) => {
        const current = workingHours[dayId] || { start: '09:00', end: '18:00', enabled: true };
        setWorkingHours({
            ...workingHours,
            [dayId]: { ...current, [field]: value }
        });
    };

    const handleToggleService = (serviceName: string) => {
        if (selectedServices.includes(serviceName)) {
            setSelectedServices(selectedServices.filter(s => s !== serviceName));
        } else {
            setSelectedServices([...selectedServices, serviceName]);
        }
    };

    const handleAddException = () => {
        setExceptions([...exceptions, { date: new Date().toISOString().split('T')[0], type: 'absence', note: '' }]);
    };

    const handleRemoveException = (index: number) => {
        setExceptions(exceptions.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            await updateProfessional(professional.id, {
                workingHours,
                services: selectedServices,
                exceptions
            });
            toast.success('Configuración de agenda guardada');
            onUpdate();
        } catch (error) {
            console.error('Error saving schedule:', error);
            toast.error('Error al guardar la configuración');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header with Save Button */}
            <div className="flex items-center justify-between sticky top-0 bg-gray-50/80 backdrop-blur-md py-4 z-10 -mx-4 px-4 border-b border-gray-200/50 mb-6">
                <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Configuración de Agenda</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Define horarios y especialidades para auto-agendado</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={submitting}
                    className="bg-[#34baab] hover:bg-[#2aa89a] border-none rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 h-12 shadow-lg shadow-[#34baab]/20"
                >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar Cambios
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Working Hours */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-violet-50 rounded-2xl flex items-center justify-center">
                                <Clock className="w-5 h-5 text-violet-500" />
                            </div>
                            <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Horarios Semanales</h4>
                        </div>

                        <div className="space-y-4">
                            {DAYS.map(day => {
                                const config = workingHours[day.id] || { start: '09:00', end: '18:00', enabled: false };
                                return (
                                    <div key={day.id} className={`p-5 rounded-[28px] border transition-all ${config.enabled ? 'bg-gray-50 border-gray-100' : 'bg-white border-dashed border-gray-200 opacity-60'}`}>
                                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                                            <div className="flex items-center gap-4 min-w-[140px]">
                                                <button
                                                    onClick={() => handleToggleDay(day.id)}
                                                    className={`w-12 h-6 rounded-full relative transition-colors ${config.enabled ? 'bg-[#34baab]' : 'bg-gray-200'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.enabled ? 'left-7' : 'left-1'}`} />
                                                </button>
                                                <span className="font-black text-gray-900 text-sm uppercase tracking-tight">{day.name}</span>
                                            </div>

                                            {config.enabled && (
                                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Entrada</label>
                                                        <Input
                                                            type="time"
                                                            value={config.start}
                                                            onChange={(e) => handleTimeChange(day.id, 'start', e.target.value)}
                                                            className="bg-white border-none rounded-xl h-10 text-xs font-bold"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Salida</label>
                                                        <Input
                                                            type="time"
                                                            value={config.end}
                                                            onChange={(e) => handleTimeChange(day.id, 'end', e.target.value)}
                                                            className="bg-white border-none rounded-xl h-10 text-xs font-bold"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                            <Coffee className="w-2 h-2" /> Inicio Almuerzo
                                                        </label>
                                                        <Input
                                                            type="time"
                                                            value={config.lunchStart || ''}
                                                            onChange={(e) => handleTimeChange(day.id, 'lunchStart', e.target.value)}
                                                            className="bg-white border-none rounded-xl h-10 text-xs font-bold"
                                                            placeholder="Opional"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                            <Coffee className="w-2 h-2" /> Fin Almuerzo
                                                        </label>
                                                        <Input
                                                            type="time"
                                                            value={config.lunchEnd || ''}
                                                            onChange={(e) => handleTimeChange(day.id, 'lunchEnd', e.target.value)}
                                                            className="bg-white border-none rounded-xl h-10 text-xs font-bold"
                                                            placeholder="Opional"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {!config.enabled && (
                                                <div className="flex-1 text-right">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">No Laboral</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Exceptions */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-amber-500" />
                                </div>
                                <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Excepciones y Ausencias</h4>
                            </div>
                            <Button
                                onClick={handleAddException}
                                variant="ghost"
                                className="text-amber-600 hover:bg-amber-50 font-black uppercase tracking-widest text-[10px]"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Agregar Fecha
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {exceptions.map((ex, i) => (
                                <div key={i} className="flex flex-col md:flex-row items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                                    <Input
                                        type="date"
                                        value={ex.date}
                                        onChange={(e) => {
                                            const newEx = [...exceptions];
                                            newEx[i].date = e.target.value;
                                            setExceptions(newEx);
                                        }}
                                        className="bg-white border-none rounded-xl md:w-48 font-bold text-xs"
                                    />
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <select
                                            value={ex.type}
                                            onChange={(e) => {
                                                const newEx = [...exceptions];
                                                newEx[i].type = e.target.value as any;
                                                setExceptions(newEx);
                                            }}
                                            className="bg-white border-none rounded-xl px-4 py-2 h-10 text-xs font-bold focus:ring-2 focus:ring-[#34baab]/20 outline-none w-full"
                                        >
                                            <option value="absence">Ausencia / Vacaciones</option>
                                            <option value="extra">Horas Extra</option>
                                        </select>
                                        <Input
                                            placeholder="Nota (ej: Médico, Feriado...)"
                                            value={ex.note || ''}
                                            onChange={(e) => {
                                                const newEx = [...exceptions];
                                                newEx[i].note = e.target.value;
                                                setExceptions(newEx);
                                            }}
                                            className="bg-white border-none rounded-xl font-medium text-xs w-full"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 bg-white/50 p-2 rounded-2xl border border-gray-100/50">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center">Rango Horario (Opcional)</label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="time"
                                                    value={ex.start || ''}
                                                    onChange={(e) => {
                                                        const newEx = [...exceptions];
                                                        newEx[i].start = e.target.value;
                                                        setExceptions(newEx);
                                                    }}
                                                    className="bg-white border-none rounded-lg h-8 text-[10px] font-bold w-20"
                                                />
                                                <span className="text-gray-300 text-[10px]">-</span>
                                                <Input
                                                    type="time"
                                                    value={ex.end || ''}
                                                    onChange={(e) => {
                                                        const newEx = [...exceptions];
                                                        newEx[i].end = e.target.value;
                                                        setExceptions(newEx);
                                                    }}
                                                    className="bg-white border-none rounded-lg h-8 text-[10px] font-bold w-20"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveException(i)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {exceptions.length === 0 && (
                                <p className="text-center text-gray-400 font-medium py-8 italic border-2 border-dashed border-gray-100 rounded-[32px]">
                                    No hay excepciones registradas.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Specialties / Treatments */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 sticky top-28">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-[#34baab]/10 rounded-2xl flex items-center justify-center">
                                <Check className="w-5 h-5 text-[#34baab]" />
                            </div>
                            <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Especialidades</h4>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">Selecciona los servicios que realiza este profesional</p>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {treatments.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => handleToggleService(t.name)}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${selectedServices.includes(t.name)
                                        ? 'bg-[#34baab]/5 border-[#34baab] shadow-sm'
                                        : 'bg-white border-gray-100 hover:border-gray-200'
                                        }`}
                                >
                                    <div>
                                        <p className={`text-xs font-black uppercase tracking-tight transition-colors ${selectedServices.includes(t.name) ? 'text-[#34baab]' : 'text-gray-900'}`}>{t.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">{t.category}</p>
                                    </div>
                                    {selectedServices.includes(t.name) && (
                                        <div className="bg-[#34baab] rounded-full p-1 shadow-md shadow-[#34baab]/20">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-50">
                            <div className="flex items-start gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] text-blue-600 font-medium leading-relaxed italic">
                                    Esta configuración determinará qué servicios se ofrecen cuando el cliente elija a este profesional en el sistema de auto-agendado.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f8fafc;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}

const Loader2 = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);
