'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase/config';
import { useAuth } from '@/lib/contexts/AuthContext';
import { updateUserProfile } from '@/lib/firebase/users';
import { toast } from 'sonner';

const waitForServiceWorkerActivation = (registration: ServiceWorkerRegistration): Promise<ServiceWorker> => {
    return new Promise((resolve) => {
        if (registration.active) {
            resolve(registration.active);
            return;
        }

        const worker = registration.installing || registration.waiting;
        if (worker?.state === 'activated') {
            resolve(worker);
            return;
        }

        const stateChangeListener = () => {
            if (worker?.state === 'activated') {
                worker.removeEventListener('statechange', stateChangeListener);
                resolve(worker);
            }
        };

        if (worker) {
            worker.addEventListener('statechange', stateChangeListener);
        } else {
            // Fallback for edge cases
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker?.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated') resolve(newWorker);
                });
            });
        }
    });
};

export function useNotifications() {
    const { user, profile } = useAuth();
    const [token, setToken] = useState<string | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [loading, setLoading] = useState(false);

    const requestPermission = useCallback(async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) return false;

        if (!process.env.NEXT_PUBLIC_VAPID_KEY) {
            console.error('FCM Error: NEXT_PUBLIC_VAPID_KEY is not defined in environment variables.');
            toast.error('Error de configuración: Clave VAPID faltante.');
            return false;
        }

        try {
            setLoading(true);
            const status = await Notification.requestPermission();
            setPermission(status);

            if (status === 'granted') {
                const msg = await messaging();
                if (msg) {
                    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

                    // Wait for the service worker to become active to avoid AbortError: Subscription failed - no active Service Worker
                    await waitForServiceWorkerActivation(registration);

                    const currentToken = await getToken(msg, {
                        vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
                        serviceWorkerRegistration: registration
                    });

                    if (currentToken) {
                        setToken(currentToken);
                        if (user) {
                            const currentTokens = profile?.fcmTokens || [];
                            if (!currentTokens.includes(currentToken)) {
                                await updateUserProfile(user.uid, {
                                    fcmTokens: [...currentTokens, currentToken],
                                    notificationsEnabled: true
                                });
                            }
                        }
                        toast.success('¡Notificaciones activadas!', {
                            description: 'Tu dispositivo ha sido vinculado correctamente.'
                        });
                        return true;
                    }
                }
            } else if (status === 'denied') {
                toast.error('Notificaciones bloqueadas', {
                    description: 'Debes habilitarlas manualmente desde la configuración de tu navegador.'
                });
            }
            return status === 'granted';
        } catch (error: any) {
            console.error('FCM Error in requestPermission:', error);
            if (error?.message?.includes('messaging/failed-service-worker-registration')) {
                toast.error('Error de Service Worker', {
                    description: 'No se pudo registrar el servicio de notificaciones.'
                });
            }
            return false;
        } finally {
            setLoading(false);
        }
    }, [user, profile]);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }

        const initMessaging = async () => {
            if (!user || permission !== 'granted') return;

            try {
                const msg = await messaging();
                if (!msg) return;

                onMessage(msg, (payload) => {
                    // console.log('FCM: Message received', payload);
                });

                if (!token && process.env.NEXT_PUBLIC_VAPID_KEY) {
                    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

                    // Wait for the service worker to become active
                    await waitForServiceWorkerActivation(registration);

                    const currentToken = await getToken(msg, {
                        vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
                        serviceWorkerRegistration: registration
                    });

                    if (currentToken) {
                        setToken(currentToken);
                        const currentTokens = profile?.fcmTokens || [];
                        if (!currentTokens.includes(currentToken)) {
                            try {
                                await updateUserProfile(user.uid, {
                                    fcmTokens: [...currentTokens, currentToken],
                                    notificationsEnabled: true
                                });
                            } catch (dbError) {
                                console.error('FCM: Firestore update FAILED:', dbError);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('FCM: Error initializing messaging:', e);
            }
        };

        initMessaging();
    }, [user, permission, token, profile]);

    return {
        token,
        permission,
        requestPermission,
        loading
    };
}
