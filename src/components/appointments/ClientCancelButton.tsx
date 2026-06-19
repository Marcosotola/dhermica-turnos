'use client';

import { useState } from 'react';
import { XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cancelAppointment } from '@/lib/firebase/appointments';
import { createClientCredit } from '@/lib/firebase/clientCredits';
import { Appointment } from '@/lib/types/appointment';

interface Props {
    appointment: Appointment;
    clientId: string;
    clientName: string;
    onCancelled: () => void;
}

const HOURS_THRESHOLD = 24;

function hoursUntilAppointment(date: string, time: string): number {
    const [h, m] = time.split(':').map(Number);
    const aptDate = new Date(date);
    aptDate.setHours(h, m, 0, 0);
    return (aptDate.getTime() - Date.now()) / (1000 * 60 * 60);
}

export function ClientCancelButton({ appointment, clientId, clientName, onCancelled }: Props) {
    const [confirming, setConfirming] = useState(false);
    const [loading, setLoading] = useState(false);

    const hoursLeft = hoursUntilAppointment(appointment.date, appointment.time);
    const keepDeposit = hoursLeft >= HOURS_THRESHOLD;
    const depositPaid = (appointment.payments || []).reduce((s, p) => s + p.amount, 0);

    const handleCancel = async () => {
        setLoading(true);
        try {
            await cancelAppointment(appointment.id);

            if (depositPaid > 0) {
                await createClientCredit({
                    clientId,
                    clientName,
                    amount: depositPaid,
                    reason: 'cancelled_appointment',
                    status: keepDeposit ? 'available' : 'forfeited',
                    sourceAppointmentId: appointment.id,
                    sourceAppointmentDate: appointment.date,
                    sourceTreatmentName: appointment.treatment,
                    notes: keepDeposit
                        ? 'Cancelación con más de 24 horas de anticipación. Seña disponible como crédito.'
                        : 'Cancelación con menos de 24 horas de anticipación. Seña perdida.',
                });
            }

            toast.success(
                keepDeposit
                    ? 'Turno cancelado. Tu seña quedó como crédito para usar en otro turno.'
                    : 'Turno cancelado. La seña no puede devolverse por cancelar con menos de 24 horas.',
                { duration: 6000 }
            );
            onCancelled();
        } catch (err) {
            console.error('[ClientCancelButton] Error:', err);
            toast.error('No se pudo cancelar el turno. Intentá de nuevo.');
        } finally {
            setLoading(false);
            setConfirming(false);
        }
    };

    if (!confirming) {
        return (
            <button
                onClick={() => setConfirming(true)}
                className="mt-2 text-[11px] text-red-400 hover:text-red-600 font-bold flex items-center gap-1 transition-colors"
            >
                <XCircle className="w-3.5 h-3.5" /> Cancelar turno
            </button>
        );
    }

    return (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 animate-in slide-in-from-top-2">
            <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs text-red-700 space-y-1">
                    <p className="font-bold">¿Confirmás la cancelación?</p>
                    {depositPaid > 0 ? (
                        keepDeposit ? (
                            <p>Cancelás con más de 24 horas de anticipación. Tu seña de <strong>${depositPaid.toLocaleString('es-AR')}</strong> quedará como <strong>crédito a tu favor</strong> para usar en otro turno.</p>
                        ) : (
                            <p>Cancelás con <strong>menos de 24 horas</strong>. La seña de <strong>${depositPaid.toLocaleString('es-AR')}</strong> <strong>se pierde</strong> según la política de cancelación.</p>
                        )
                    ) : (
                        <p>El turno será cancelado.</p>
                    )}
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    Sí, cancelar
                </button>
                <button
                    onClick={() => setConfirming(false)}
                    disabled={loading}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-lg transition-colors"
                >
                    No, mantener
                </button>
            </div>
        </div>
    );
}
