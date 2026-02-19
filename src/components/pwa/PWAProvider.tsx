'use client';

import React, { useState, useEffect } from 'react';
import { usePWA } from '@/lib/hooks/usePWA';
import { AndroidInstallModal } from './AndroidInstallModal';
import { IOSInstallModal } from './IOSInstallModal';

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const { isInstallable, isIOS, isStandalone, installApp } = usePWA();
    const [showModal, setShowModal] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Show modal after 3 seconds if installable/iOS and not standalone
        if ((isInstallable || isIOS) && !isStandalone && !dismissed) {
            const timer = setTimeout(() => {
                setShowModal(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isInstallable, isIOS, isStandalone, dismissed]);

    useEffect(() => {
        // Register Service Worker
        if ('serviceWorker' in navigator && window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(
                    (registration) => {
                        // console.log('SW registered: ', registration);
                    },
                    (registrationError) => {
                        console.error('SW registration failed: ', registrationError);
                    }
                );
            });
        }
    }, []);

    const handleInstall = async () => {
        await installApp();
        setShowModal(false);
    };

    const handleClose = () => {
        setShowModal(false);
        setDismissed(true);
        // Persist dismissed state for 30 days
        const expiry = new Date().getTime() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('pwa-prompt-dismissed', JSON.stringify({ dismissed: true, expiry }));
    };

    useEffect(() => {
        const saved = localStorage.getItem('pwa-prompt-dismissed');
        if (saved) {
            try {
                const { dismissed, expiry } = JSON.parse(saved);
                if (dismissed && new Date().getTime() < expiry) {
                    setDismissed(true);
                } else {
                    localStorage.removeItem('pwa-prompt-dismissed');
                }
            } catch (e) {
                localStorage.removeItem('pwa-prompt-dismissed');
            }
        }
    }, []);

    return (
        <>
            {children}
            {showModal && isInstallable && !isIOS && (
                <AndroidInstallModal onInstall={handleInstall} onClose={handleClose} />
            )}
            {showModal && isIOS && !isStandalone && (
                <IOSInstallModal onClose={handleClose} />
            )}
        </>
    );
}
