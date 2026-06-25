'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CalendarCheck, Loader2, ShieldCheck, ChevronLeft, Clock, DollarSign, Gift, Mail } from 'lucide-react';
import Link from 'next/link';
import { getPendingBookingById } from '@/lib/firebase/pendingBookings';
import { PendingBooking } from '@/lib/types/pendingBooking';
import { formatArgentineCurrency } from '@/lib/utils/currency';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

export default function PagoPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const { id } = useParams<{ id: string }>();

    const [booking, setBooking] = useState<PendingBooking | null>(null);
    const [loadingBooking, setLoadingBooking] = useState(true);
    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const [creatingPayment, setCreatingPayment] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [payerEmail, setPayerEmail] = useState('');
    const [mpInitialized, setMpInitialized] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push('/');
    }, [user, loading, router]);

    useEffect(() => {
        if (!id || !user) return;
        getPendingBookingById(id)
            .then(b => {
                if (!b || b.clientId !== user?.uid) {
                    setError('Reserva no encontrada o no tenés acceso.');
                } else if (b.status === 'confirmed') {
                    router.push('/mis-turnos');
                } else if (b.status === 'expired') {
                    setError('Esta reserva expiró. Por favor iniciá una nueva desde el chat.');
                } else {
                    setBooking(b);
                    setPayerEmail(profile?.email || user?.email || '');
                }
            })
            .catch(() => setError('Error al cargar la reserva.'))
            .finally(() => setLoadingBooking(false));
    }, [id, user, profile]);

    const handlePrepararPago = async () => {
        setCreatingPayment(true);
        try {
            const res = await fetch('/api/payments/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pendingBookingId: id, payerEmail }),
            });
            const data = await res.json();
            if (data.preferenceId) {
                if (!mpInitialized) {
                    initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!, { locale: 'es-AR' });
                    setMpInitialized(true);
                }
                setPreferenceId(data.preferenceId);
            } else {
                setError('No se pudo iniciar el pago. Intentá de nuevo.');
            }
        } catch {
            setError('Error al conectar con el sistema de pago.');
        } finally {
            setCreatingPayment(false);
        }
    };

    const handleConfirmarGratis = async () => {
        setConfirming(true);
        try {
            const res = await fetch('/api/booking/confirm-free', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pendingBookingId: id, clientId: user!.uid }),
            });
            const data = await res.json();
            if (data.confirmed) {
                router.push(`/reservar/pago/${id}/confirmado`);
            } else {
                setError(data.error || 'Error al confirmar la reserva.');
            }
        } catch {
            setError('Error al confirmar la reserva.');
        } finally {
            setConfirming(false);
        }
    };

    if (loading || loadingBooking) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[#34baab]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
                <p className="text-red-500 font-medium mb-4">{error}</p>
                <Link href="/reservar" className="text-[#34baab] font-bold underline">
                    Iniciar nueva reserva
                </Link>
            </div>
        );
    }

    if (!booking) return null;

    const totalDurationH = Math.floor(booking.totalDurationMinutes / 60);
    const totalDurationM = booking.totalDurationMinutes % 60;
    const durationLabel = totalDurationH > 0
        ? `${totalDurationH}h${totalDurationM > 0 ? ` ${totalDurationM}min` : ''}`
        : `${totalDurationM}min`;

    const bd = booking.depositBreakdown;
    const giftCardAmount = bd?.giftCardAmount || 0;
    const creditAmount = bd?.clientCreditAmount || 0;
    const mpAmount = bd?.mercadopagoAmount ?? booking.depositAmount;
    const usesBalance = giftCardAmount > 0 || creditAmount > 0;
    const freeConfirm = mpAmount === 0;

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
                <Link href="/reservar" className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <p className="font-bold text-gray-900">Confirmá tu reserva</p>
            </div>

            <div className="max-w-md mx-auto px-4 pt-6 space-y-4">

                {/* Resumen de turnos */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                    <h2 className="font-black text-gray-900 uppercase tracking-widest text-xs">Tu reserva</h2>

                    {booking.slots.map((slot, i) => (
                        <div key={i} className="border-l-4 border-[#34baab] pl-4 space-y-1">
                            <p className="font-bold text-gray-900 text-sm">
                                {slot.treatmentNames.join(' + ')}
                                {slot.zones.filter(Boolean).length > 0 && (
                                    <span className="font-normal text-gray-500"> · {slot.zones.join(', ')}</span>
                                )}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {slot.date} a las {slot.time}
                            </p>
                        </div>
                    ))}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-500">Duración total</span>
                        <span className="font-bold text-gray-700">{durationLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Precio estimado</span>
                        <span className="font-bold text-gray-700">{formatArgentineCurrency(booking.totalEstimatedPrice)}</span>
                    </div>
                </div>

                {/* Seña a pagar */}
                <div className="bg-[#34baab]/5 border border-[#34baab]/20 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-[#34baab]" />
                        <h2 className="font-black text-gray-900 uppercase tracking-widest text-xs">Seña</h2>
                    </div>

                    {usesBalance && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Total seña</span>
                                <span className="font-medium text-gray-700">{formatArgentineCurrency(booking.depositAmount)}</span>
                            </div>
                            {giftCardAmount > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-1 text-teal-600">
                                        <Gift className="w-3.5 h-3.5" /> Gift card aplicada
                                    </span>
                                    <span className="font-medium text-teal-600">- {formatArgentineCurrency(giftCardAmount)}</span>
                                </div>
                            )}
                            {creditAmount > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-1 text-teal-600">
                                        <Gift className="w-3.5 h-3.5" /> Crédito aplicado
                                    </span>
                                    <span className="font-medium text-teal-600">- {formatArgentineCurrency(creditAmount)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between pt-1 border-t border-[#34baab]/20">
                                <span className="font-bold text-gray-800 text-sm">A pagar ahora</span>
                                <span className="font-black text-2xl text-[#34baab]">{formatArgentineCurrency(mpAmount)}</span>
                            </div>
                        </div>
                    )}

                    {!usesBalance && (
                        <p className="text-3xl font-black text-[#34baab]">{formatArgentineCurrency(mpAmount)}</p>
                    )}

                    {!freeConfirm && (
                        <p className="text-xs text-gray-500">
                            El saldo restante ({formatArgentineCurrency(booking.totalEstimatedPrice - booking.depositAmount)}) se abona el día del turno.
                        </p>
                    )}
                </div>

                {/* Política de cancelación */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-700 space-y-1">
                    <p className="font-bold">Política de cancelación</p>
                    <p>• Si cancelás con <strong>más de 24 horas</strong> de anticipación, la seña queda como crédito a tu favor.</p>
                    <p>• Si cancelás con <strong>menos de 24 horas</strong>, la seña se pierde.</p>
                </div>

                {/* Campo de email de MercadoPago (solo si hay que pagar algo) */}
                {!freeConfirm && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <p className="font-bold text-gray-900 text-sm">Email para MercadoPago</p>
                        </div>
                        <p className="text-xs text-gray-400">
                            Si tu cuenta de MercadoPago tiene un email diferente al de la app, cambialo acá.
                        </p>
                        <input
                            type="email"
                            value={payerEmail}
                            onChange={e => setPayerEmail(e.target.value)}
                            placeholder="tu@email.com"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#34baab]"
                        />
                    </div>
                )}

                {/* Botón de acción */}
                {freeConfirm ? (
                    <button
                        type="button"
                        onClick={handleConfirmarGratis}
                        disabled={confirming}
                        className="w-full bg-[#34baab] hover:bg-[#2aa89a] disabled:opacity-60 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg"
                    >
                        {confirming ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Confirmando...</>
                        ) : (
                            <><CalendarCheck className="w-5 h-5" /> Confirmar turno (saldo cubierto)</>
                        )}
                    </button>
                ) : preferenceId ? (
                    <div className="w-full">
                        <Wallet initialization={{ preferenceId, redirectMode: 'self' }} />
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handlePrepararPago}
                        disabled={creatingPayment}
                        className="w-full bg-[#009EE3] hover:bg-[#0081C3] disabled:opacity-60 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg"
                    >
                        {creatingPayment ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Preparando pago...</>
                        ) : (
                            <><ShieldCheck className="w-5 h-5" /> Pagar {formatArgentineCurrency(mpAmount)} con MercadoPago</>
                        )}
                    </button>
                )}

                <p className="text-center text-xs text-gray-400">
                    {freeConfirm ? 'El turno se confirmará automáticamente al presionar el botón.' : 'Pago seguro procesado por MercadoPago'}
                </p>
            </div>
        </div>
    );
}
