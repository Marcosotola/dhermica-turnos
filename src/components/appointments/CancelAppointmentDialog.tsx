'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle, Gift, XCircle, DollarSign, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Appointment } from '@/lib/types/appointment';
import { CancellationPolicy } from '@/lib/types/treatment';
import { getTreatmentById } from '@/lib/firebase/treatments';
import { formatArgentineCurrency } from '@/lib/utils/currency';

export type CreditAction = 'retain' | 'forfeit' | 'none';

// Returns hours until the appointment (negative = past)
function hoursUntilAppointment(date: string, time: string): number {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const aptDate = new Date(year, month - 1, day, hour, minute);
    return (aptDate.getTime() - Date.now()) / (1000 * 60 * 60);
}

interface PolicyStatus {
    policy: CancellationPolicy;
    hoursUntil: number;
    withinWindow: boolean; // true = within the forbidden window (too late to cancel without penalty)
}

interface CancelAppointmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (creditAction: CreditAction, notes?: string) => Promise<void>;
    appointment: Appointment | null;
    loading?: boolean;
}

export function CancelAppointmentDialog({
    isOpen,
    onClose,
    onConfirm,
    appointment,
    loading = false,
}: CancelAppointmentDialogProps) {
    const [policyStatus, setPolicyStatus] = useState<PolicyStatus | null>(null);
    const [policyLoading, setPolicyLoading] = useState(false);
    const [notes, setNotes] = useState('');
    const [creditAction, setCreditAction] = useState<CreditAction>('retain');

    useEffect(() => {
        if (!isOpen || !appointment) {
            setPolicyStatus(null);
            return;
        }

        const treatmentId = appointment.treatments?.[0]?.treatmentId;
        if (!treatmentId) return;

        let cancelled = false;
        setPolicyLoading(true);

        getTreatmentById(treatmentId).then(t => {
            if (cancelled || !t?.cancellationPolicy) return;
            const hoursUntil = hoursUntilAppointment(appointment.date, appointment.time);
            const withinWindow = hoursUntil < t.cancellationPolicy.hoursBeforeToCancel;
            const status: PolicyStatus = { policy: t.cancellationPolicy, hoursUntil, withinWindow };
            setPolicyStatus(status);
            // Pre-select action based on policy
            if (withinWindow && t.cancellationPolicy.forfeitDeposit) {
                setCreditAction('forfeit');
            }
        }).finally(() => {
            if (!cancelled) setPolicyLoading(false);
        });

        return () => { cancelled = true; };
    }, [isOpen, appointment]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setNotes('');
            setCreditAction('retain');
            setPolicyStatus(null);
        }
    }, [isOpen]);

    if (!appointment) return null;

    const totalPaid = (appointment.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const hasPayments = totalPaid > 0;

    const handleConfirm = async () => {
        await onConfirm(hasPayments ? creditAction : 'none', notes || undefined);
    };

    const dateFormatted = (() => {
        const parts = (appointment.date || '').split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : appointment.date;
    })();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cancelar Turno" size="sm">
            <div className="space-y-4">
                {/* Appointment info */}
                <div className="bg-gray-50 p-4 rounded-2xl space-y-1">
                    <p className="font-bold text-gray-900">{appointment.treatment}</p>
                    <p className="text-sm text-gray-500">{dateFormatted} — {appointment.time}hs</p>
                    {appointment.clientName && (
                        <p className="text-sm text-gray-500">{appointment.clientName}</p>
                    )}
                </div>

                {/* Cancellation policy warning */}
                {!policyLoading && policyStatus && (
                    policyStatus.withinWindow ? (
                        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-red-800">
                                    Cancelación fuera de plazo
                                </p>
                                <p className="text-xs text-red-600 mt-0.5">
                                    Este tratamiento requiere cancelar con al menos{' '}
                                    <strong>{policyStatus.policy.hoursBeforeToCancel}hs</strong> de anticipación.
                                    {policyStatus.hoursUntil > 0
                                        ? ` Faltan solo ${Math.round(policyStatus.hoursUntil)}hs para el turno.`
                                        : ' El turno ya pasó.'}
                                    {policyStatus.policy.forfeitDeposit && ' La seña corresponde perderse por política.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                            <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-green-800">
                                    Dentro del plazo permitido
                                </p>
                                <p className="text-xs text-green-600 mt-0.5">
                                    La cancelación se realiza con más de{' '}
                                    <strong>{policyStatus.policy.hoursBeforeToCancel}hs</strong> de anticipación.
                                    La seña puede retenerse como crédito sin penalidad.
                                </p>
                            </div>
                        </div>
                    )
                )}

                {hasPayments ? (
                    <>
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                            <DollarSign className="w-5 h-5 text-amber-500 shrink-0" />
                            <p className="text-sm font-bold text-amber-800">
                                Seña/adelanto registrado:{' '}
                                <span className="text-amber-600">$ {formatArgentineCurrency(totalPaid)}</span>
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-bold text-gray-700">¿Qué hacemos con la seña?</p>

                            <label
                                className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-colors ${
                                    creditAction === 'retain'
                                        ? 'border-[#34baab] bg-[#34baab]/5'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="creditAction"
                                    value="retain"
                                    checked={creditAction === 'retain'}
                                    onChange={() => setCreditAction('retain')}
                                    className="mt-0.5 accent-[#34baab]"
                                />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Gift className="w-4 h-4 text-amber-500" />
                                        <span className="font-bold text-sm text-gray-900">Retener como crédito</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        El dinero queda a favor del cliente para futuros turnos.
                                    </p>
                                </div>
                            </label>

                            <label
                                className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-colors ${
                                    creditAction === 'forfeit'
                                        ? 'border-red-400 bg-red-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="creditAction"
                                    value="forfeit"
                                    checked={creditAction === 'forfeit'}
                                    onChange={() => setCreditAction('forfeit')}
                                    className="mt-0.5 accent-red-500"
                                />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-red-400" />
                                        <span className="font-bold text-sm text-gray-900">Seña perdida (política)</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        El cliente pierde la seña por política de cancelación.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                        <p className="text-sm text-red-700">
                            Se eliminará el turno. No hay señas o pagos registrados.
                        </p>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Observaciones (opcional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none text-gray-700 focus:outline-none focus:border-[#34baab]"
                        rows={2}
                        placeholder="Ej: Cliente canceló por viaje..."
                    />
                </div>

                <div className="flex gap-3 pt-1">
                    <Button variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
                        Volver
                    </Button>
                    <Button variant="danger" onClick={handleConfirm} disabled={loading || policyLoading} className="flex-1">
                        {loading ? 'Cancelando...' : 'Confirmar Cancelación'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
