'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CalendarCheck, Loader2, ShieldCheck, ChevronLeft, Clock, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { getPendingBookingById } from '@/lib/firebase/pendingBookings';
import { PendingBooking } from '@/lib/types/pendingBooking';
import { formatArgentineCurrency } from '@/lib/utils/currency';

export default function PagoPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const { id } = useParams<{ id: string }>();

    const [booking, setBooking] = useState<PendingBooking | null>(null);
    const [loadingBooking, setLoadingBooking] = useState(true);
    const [creatingPayment, setCreatingPayment] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !user) router.push('/');
    }, [user, loading, router]);

    useEffect(() => {
        if (!id) return;
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
                }
            })
            .catch(() => setError('Error al cargar la reserva.'))
            .finally(() => setLoadingBooking(false));
    }, [id, user]);

    const handlePagar = async () => {
        setCreatingPayment(true);
        try {
            const res = await fetch('/api/payments/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pendingBookingId: id }),
            });
            const data = await res.json();
            if (data.initPoint) {
                window.location.href = data.initPoint;
            } else {
                setError('No se pudo iniciar el pago. Intentá de nuevo.');
            }
        } catch {
            setError('Error al conectar con el sistema de pago.');
        } finally {
            setCreatingPayment(false);
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
                <div className="bg-[#34baab]/5 border border-[#34baab]/20 rounded-2xl p-5 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-[#34baab]" />
                        <h2 className="font-black text-gray-900 uppercase tracking-widest text-xs">Seña a abonar ahora</h2>
                    </div>
                    <p className="text-3xl font-black text-[#34baab]">{formatArgentineCurrency(booking.depositAmount)}</p>
                    <p className="text-xs text-gray-500">
                        El saldo restante ({formatArgentineCurrency(booking.totalEstimatedPrice - booking.depositAmount)}) se abona el día del turno.
                    </p>
                </div>

                {/* Política de cancelación */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-700 space-y-1">
                    <p className="font-bold">Política de cancelación</p>
                    <p>• Si cancelás con <strong>más de 24 horas</strong> de anticipación, la seña queda como crédito a tu favor.</p>
                    <p>• Si cancelás con <strong>menos de 24 horas</strong>, la seña se pierde.</p>
                </div>

                {/* Botón de pago */}
                <button
                    onClick={handlePagar}
                    disabled={creatingPayment}
                    className="w-full bg-[#009EE3] hover:bg-[#0081C3] disabled:opacity-60 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                    {creatingPayment ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Conectando con MercadoPago...</>
                    ) : (
                        <><ShieldCheck className="w-5 h-5" /> Pagar seña con MercadoPago</>
                    )}
                </button>

                <p className="text-center text-xs text-gray-400">
                    Pago seguro procesado por MercadoPago
                </p>
            </div>
        </div>
    );
}
