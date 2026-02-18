'use client';

import React, { useEffect } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useAuth } from '@/lib/contexts/AuthContext';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { token } = useNotifications();
    const { user, profile } = useAuth();

    // The useNotifications hook already handles token refresh and profile update internally
    // when a user is logged in. This provider ensures the hook is active globally.

    useEffect(() => {
        if (user && token && profile) {
            console.log('Push notifications active for user:', user.email);
        }
    }, [user, token, profile]);

    return <>{children}</>;
}
