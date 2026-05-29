'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/lib/hooks/useNotifications';

const DISMISSED_KEY = 'notification_prompt_dismissed';
const PENDING_KEY = 'show_notification_prompt';

export function NotificationPermissionModal() {
    const [show, setShow] = useState(false);
    const [activated, setActivated] = useState(false);
    const { requestPermission, permission, loading } = useNotifications();

    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;

        if (permission === 'granted' || permission === 'denied') return;

        const isDismissed = localStorage.getItem(DISMISSED_KEY) === 'true';
        const isPendingFromRegistration = localStorage.getItem(PENDING_KEY) === 'new_registration';

        if (isPendingFromRegistration || (!isDismissed && permission === 'default')) {
            // Small delay so the dashboard loads first
            const timer = setTimeout(() => setShow(true), 1200);
            return () => clearTimeout(timer);
        }
    }, [permission]);

    const handleActivate = async () => {
        localStorage.removeItem(PENDING_KEY);
        const granted = await requestPermission();
        if (granted) {
            setActivated(true);
            setTimeout(() => setShow(false), 2000);
        } else {
            setShow(false);
        }
    };

    const handleDismiss = () => {
        localStorage.removeItem(PENDING_KEY);
        localStorage.setItem(DISMISSED_KEY, 'true');
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 sm:items-center">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-end -mb-2">
                    <button
                        onClick={handleDismiss}
                        className="text-gray-300 hover:text-gray-500 transition-colors p-1"
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {activated ? (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-1">¡Listo!</h2>
                        <p className="text-gray-500 text-sm">Vas a recibir recordatorios de tus turnos.</p>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-[#34baab]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Bell className="w-8 h-8 text-[#34baab]" />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 mb-2">
                                Activar notificaciones
                            </h2>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Recibí recordatorios de tus turnos y promociones especiales de Dhermica directamente en tu dispositivo.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={handleActivate}
                                disabled={loading}
                                className="w-full py-4 rounded-xl font-bold"
                            >
                                {loading ? 'Activando...' : '🔔 Activar notificaciones'}
                            </Button>
                            <button
                                onClick={handleDismiss}
                                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 font-medium py-2 transition-colors"
                            >
                                Ahora no
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
