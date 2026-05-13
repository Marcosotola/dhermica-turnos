'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Professional, Exception } from '@/lib/types/professional';
import { Treatment } from '@/lib/types/treatment';
import { getTreatments } from '@/lib/firebase/treatments';
import { Check, X, ShieldAlert, Sparkles, Calendar, Clock } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (exception: Exception) => void;
    exception: Exception | null;
    professionalName: string;
    professionalServices: string[]; // All treatments in the system to choose from
}

export function ExceptionModal({ isOpen, onClose, onSave, exception, professionalName }: Props) {
    const [formData, setFormData] = useState<Exception>({
        date: new Date().toISOString().split('T')[0],
        type: 'absence',
        note: '',
    });
    const [treatments, setTreatments] = useState<Treatment[]>([]);

    useEffect(() => {
        if (isOpen && exception) {
            setFormData(exception);
        }
    }, [isOpen, exception]);

    useEffect(() => {
        getTreatments().then(setTreatments);
    }, []);

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gestionar Excepción: ${professionalName}`}>
            <div className="space-y-6 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha</label>
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="rounded-2xl font-bold"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#34baab]/20 outline-none appearance-none cursor-pointer"
                        >
                            <option value="absence">🚫 Ausencia / Vacaciones</option>
                            <option value="extra">✨ Horas / Días Extra</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nota Interna</label>
                    <Input
                        placeholder="Ej: Médico, Feriado..."
                        value={formData.note || ''}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        className="rounded-2xl font-medium"
                    />
                </div>

                <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Rango Horario (Opcional)
                    </label>
                    <div className="flex items-center gap-3">
                        <Input
                            type="time"
                            value={formData.start || ''}
                            onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                            className="bg-white border-none rounded-xl h-11 text-sm font-bold"
                        />
                        <span className="text-gray-300">-</span>
                        <Input
                            type="time"
                            value={formData.end || ''}
                            onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                            className="bg-white border-none rounded-xl h-11 text-sm font-bold"
                        />
                    </div>
                    <p className="text-[9px] text-gray-400 italic">* Dejar vacío para todo el día</p>
                </div>

                {formData.type === 'extra' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tratamientos Habilitados</label>
                        <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-1">
                            {treatments.map(t => {
                                const isSelected = (formData.services || []).includes(t.name);
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            const current = formData.services || [];
                                            const next = isSelected ? current.filter(s => s !== t.name) : [...current, t.name];
                                            setFormData({ ...formData, services: next });
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all border ${isSelected
                                            ? 'bg-[#34baab] text-white border-[#34baab] shadow-sm'
                                            : 'bg-white text-gray-500 border-gray-100 hover:border-[#34baab]/30'
                                        }`}
                                    >
                                        {t.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={onClose} className="flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancelar</Button>
                    <Button onClick={handleSave} className="flex-1 rounded-2xl bg-[#34baab] hover:bg-[#2da395] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-[#34baab]/20">Guardar</Button>
                </div>
            </div>
        </Modal>
    );
}
