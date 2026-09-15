'use client';

import { useState, useEffect, useCallback } from 'react';
import { Professional } from '@/lib/types/professional';
import { Attendance } from '@/lib/types/attendance';
import { createAttendance, deleteAttendance, getAttendancesByProfessional } from '@/lib/firebase/attendances';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCurrencyWithSymbol } from '@/lib/utils/currency';
import { getTodayDate } from '@/lib/utils/time';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'sonner';
import { CalendarPlus, Trash2, CalendarCheck2 } from 'lucide-react';

interface ProfessionalAttendanceProps {
    professional: Professional;
}

function formatDate(d: string): string {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
}

export function ProfessionalAttendance({ professional }: ProfessionalAttendanceProps) {
    const { profile } = useAuth();
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(getTodayDate());
    const [amount, setAmount] = useState(professional.dailyRate || 0);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchAttendances = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAttendancesByProfessional(professional.id);
            setAttendances(data);
        } catch {
            toast.error('Error al cargar la asistencia');
        } finally {
            setLoading(false);
        }
    }, [professional.id]);

    useEffect(() => { fetchAttendances(); }, [fetchAttendances]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date) { toast.error('Elegí una fecha'); return; }
        if (!amount || amount <= 0) { toast.error('Ingresá un monto válido'); return; }
        setSaving(true);
        try {
            await createAttendance({
                professionalId: professional.id,
                date,
                amount,
                createdBy: profile?.uid,
            });
            toast.success('Asistencia registrada');
            setDate(getTodayDate());
            setAmount(professional.dailyRate || 0);
            fetchAttendances();
        } catch {
            toast.error('Error al registrar la asistencia');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await deleteAttendance(id);
            toast.success('Asistencia eliminada');
            fetchAttendances();
        } catch {
            toast.error('Error al eliminar');
        } finally {
            setDeletingId(null);
        }
    };

    const totalAccrued = attendances.reduce((s, a) => s + (a.amount || 0), 0);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-1">Registrar asistencia</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">Cargá los días trabajados de {professional.name}</p>

                <form onSubmit={handleAdd} className="flex flex-col sm:flex-row items-end gap-3">
                    <div className="w-full sm:w-auto">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fecha</label>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                    </div>
                    <div className="w-full sm:w-auto">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monto ($)</label>
                        <Input
                            type="number"
                            value={amount || ''}
                            onChange={(e) => setAmount(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            min={0}
                            required
                        />
                    </div>
                    <Button type="submit" disabled={saving} className="bg-[#34baab] hover:bg-[#2aa89a] text-white border-none font-black uppercase tracking-widest text-[10px] w-full sm:w-auto">
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        {saving ? 'Guardando...' : 'Registrar'}
                    </Button>
                </form>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-1">Historial</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{attendances.length} días registrados</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total acumulado</p>
                        <p className="text-xl font-black text-[#34baab]">{formatCurrencyWithSymbol(totalAccrued)}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34baab]" />
                    </div>
                ) : attendances.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <CalendarCheck2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                        <p className="text-sm font-medium">Todavía no hay asistencias cargadas</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        {attendances.map(a => (
                            <div key={a.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100">
                                <span className="text-sm font-bold text-gray-800">{formatDate(a.date)}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-gray-900">{formatCurrencyWithSymbol(a.amount)}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(a.id)}
                                        disabled={deletingId === a.id}
                                        className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 border border-red-200 transition-colors disabled:opacity-50"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
