'use client';

import { useAuth } from '@/lib/contexts/AuthContext';

export function ContentWrapper({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    return (
        <div className={`flex-1 flex flex-col min-w-0 ${user ? 'lg:pl-64' : ''}`}>
            {children}
        </div>
    );
}
