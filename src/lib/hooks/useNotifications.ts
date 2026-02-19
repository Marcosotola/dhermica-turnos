'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase/config';
import { useAuth } from '@/lib/contexts/AuthContext';
import { updateUserProfile } from '@/lib/firebase/users';
import { toast } from 'sonner';

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
            // console.log('FCM: Requesting permission...');
            const status = await Notification.requestPermission();
            setPermission(status);

            if (status === 'granted') {
                // console.log('FCM: Permission granted. Initializing messaging...');
                const msg = await messaging();
                if (msg) {
                    // console.log('FCM: Registering service worker explicitly...');
                    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

                    // console.log('FCM: Fetching token with VAPID key...');
                    const currentToken = await getToken(msg, {
                        vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
                        serviceWorkerRegistration: registration
                    });

                    if (currentToken) {
                        // console.log('FCM: Token obtained:', currentToken);
                        setToken(currentToken);
                        if (user) {
                            // console.log('FCM: Updating user profile with new token...');
                            // Update user profile with the new token
                            const currentTokens = profile?.fcmTokens || [];
                            if (!currentTokens.includes(currentToken)) {
                                await updateUserProfile(user.uid, {
                                    fcmTokens: [...currentTokens, currentToken],
                                    notificationsEnabled: true
                                });
                                // console.log('FCM: Profile updated successfully.');
                            } else {
                                // console.log('FCM: Token already exists in profile.');
                            }
                        }
                        toast.success('¡Notificaciones activadas!', {
                            description: 'Tu dispositivo ha sido vinculado correctamente.'
                        });
                        return true;
                    } else {
                        // console.warn('FCM: No token returned from getToken.');
                    }
                }
            } else if (status === 'denied') {
                // console.warn('FCM: Permission denied by user.');
                toast.error('Notificaciones bloqueadas', {
                    description: 'Debes habilitarlas manualmente desde la configuración de tu navegador (en el ícono del candado junto a la URL).'
                });
            }
            return status === 'granted';
        } catch (error: any) {
            console.error('FCM Error in requestPermission:', error);
            if (error?.message?.includes('messaging/failed-service-worker-registration')) {
                toast.error('Error de Service Worker', {
                    description: 'No se pudo registrar el servicio de notificaciones. Intenta recargar la página o limpiar la caché.'
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

                // 1. Setup Foreground Listener
                onMessage(msg, (payload) => {
                    // console.log('FCM: Foreground message received (Toast disabled to avoid duplication):', payload);
                    /* 
                    const targetUrl = payload.data?.url || '/';
                    toast.info(payload.notification?.title || 'Notificación', {
                        description: payload.notification?.body,
                        action: {
                            label: 'Ver',
                            onClick: () => {
                                if (targetUrl) window.location.href = targetUrl;
                            }
                        }
                    });
                    */
                });

                // 2. Token Refresh/Save Logic
                if (!token && process.env.NEXT_PUBLIC_VAPID_KEY) {
                    // console.log('FCM: Refreshing token...');
                    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                    const currentToken = await getToken(msg, {
                        vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
                        serviceWorkerRegistration: registration
                    });

                    if (currentToken) {
                        setToken(currentToken);
                        const currentTokens = profile?.fcmTokens || [];
                        // console.log('FCM: Current profile tokens:', currentTokens);

                        if (!currentTokens.includes(currentToken)) {
                            // console.log('FCM: Token is new (UID:', user.uid, ')');
                            try {
                                await updateUserProfile(user.uid, {
                                    fcmTokens: [...currentTokens, currentToken],
                                    notificationsEnabled: true
                                });
                                // console.log('FCM: Firestore profile updated.');
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
