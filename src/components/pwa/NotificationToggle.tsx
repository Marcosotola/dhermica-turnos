'use client';

import React from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { Switch } from '@/components/ui/Switch';
import { Bell, BellOff, Loader2 } from 'lucide-react';

export function NotificationToggle() {
    const { token, permission, requestPermission, loading } = useNotifications();

    const isEnabled = !!token;

    const handleToggle = async () => {
        if (!isEnabled) {
            await requestPermission();
        } else {
            // Logic to disable/remove token could be added here
            // For now, we just indicate it's enabled
        }
    };

    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                    {isEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-900">Notificaciones</p>
                    <p className="text-[10px] text-gray-500">
                        {isEnabled ? 'Activadas en este dispositivo' : 'Desactivadas'}
                    </p>
                </div>
            </div>

            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
            ) : (
                <Switch
                    checked={isEnabled}
                    onChange={handleToggle}
                    disabled={isEnabled} // For now, only allow turning ON
                />
            )}
        </div>
    );
}
