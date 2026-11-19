'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, initializeRecaptchaConfig } from 'firebase/auth';
import { onAuthChange, logout as firebaseLogout } from '@/lib/firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfile } from '@/lib/firebase/users';
import { UserProfile } from '@/lib/types/user';
import { Professional } from '@/lib/types/professional';
import { getProfessionalById, getProfessionalByUserId } from '@/lib/firebase/professionals';

/**
 * "Ver como profesional": admin/secretaria navegan toda la app tal cual la ve un profesional.
 * Es solo de presentación — la sesión de Firebase sigue siendo la del admin (mismos permisos
 * en Firestore), lo único que cambia es el `profile` que reciben las pantallas.
 */
export interface ViewAsProfessional {
    professionalId: string;
    userId?: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    /** Perfil efectivo: el del profesional mientras "ver como" está activo, si no el real. */
    profile: UserProfile | null;
    /** Perfil real del usuario logueado, sin importar el modo "ver como". */
    realProfile: UserProfile | null;
    viewAs: ViewAsProfessional | null;
    startViewAs: (prof: ViewAsProfessional) => void;
    stopViewAs: () => void;
    /** Ficha (colección professionals) del profesional efectivo; null si el perfil no es profesional. */
    ownProfessional: Professional | null;
    ownProfessionalLoading: boolean;
    loading: boolean;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const VIEW_AS_KEY = 'dhermica_view_as';

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    realProfile: null,
    viewAs: null,
    startViewAs: () => { },
    stopViewAs: () => { },
    ownProfessional: null,
    ownProfessionalLoading: false,
    loading: true,
    logout: async () => { },
    refreshProfile: async () => { },
});

function readStoredViewAs(): ViewAsProfessional | null {
    try {
        const raw = sessionStorage.getItem(VIEW_AS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewAs, setViewAs] = useState<ViewAsProfessional | null>(null);
    const [viewAsProfile, setViewAsProfile] = useState<UserProfile | null>(null);
    const [viewAsLoading, setViewAsLoading] = useState(false);

    useEffect(() => {
        initializeRecaptchaConfig(auth).catch(() => {});

        // Se guarda por pestaña (sessionStorage) para que sobreviva a recargas y navegación
        setViewAs(readStoredViewAs());

        const unsubscribe = onAuthChange(async (firebaseUser) => {
            setLoading(true); // Always set loading to true when state changes
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    const userProfile = await getUserProfile(firebaseUser.uid);
                    setProfile(userProfile);
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    setProfile(null);
                }
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const canViewAs = profile?.role === 'admin' || profile?.role === 'secretary';
    const viewAsActive = !!viewAs && canViewAs;

    // Cargar el perfil del profesional que se está viendo
    useEffect(() => {
        if (!viewAsActive || !viewAs || !profile) {
            setViewAsProfile(null);
            return;
        }

        let cancelled = false;
        setViewAsLoading(true);

        const fallback: UserProfile = {
            ...profile,
            uid: viewAs.userId || viewAs.professionalId,
            fullName: viewAs.name,
            role: 'professional',
        };

        (async () => {
            let result = fallback;
            if (viewAs.userId) {
                try {
                    const p = await getUserProfile(viewAs.userId);
                    if (p) result = { ...p, role: 'professional' };
                } catch (error) {
                    console.error('Error cargando el perfil del profesional:', error);
                }
            }
            if (!cancelled) {
                setViewAsProfile(result);
                setViewAsLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [viewAsActive, viewAs?.professionalId, viewAs?.userId, profile?.uid]);

    const effectiveProfile = viewAsActive ? viewAsProfile : profile;

    // Ficha del profesional efectivo (para permisos como canManageOwnAppointments)
    const [ownProfessional, setOwnProfessional] = useState<Professional | null>(null);
    const [ownProfessionalLoading, setOwnProfessionalLoading] = useState(false);

    useEffect(() => {
        if (effectiveProfile?.role !== 'professional' || !user) {
            setOwnProfessional(null);
            setOwnProfessionalLoading(false);
            return;
        }
        let cancelled = false;
        setOwnProfessionalLoading(true);
        const load = viewAsActive && viewAs
            ? getProfessionalById(viewAs.professionalId)
            : getProfessionalByUserId(user.uid);
        load
            .then(p => { if (!cancelled) setOwnProfessional(p); })
            .catch(error => {
                console.error('Error cargando la ficha del profesional:', error);
                if (!cancelled) setOwnProfessional(null);
            })
            .finally(() => { if (!cancelled) setOwnProfessionalLoading(false); });
        return () => { cancelled = true; };
    }, [effectiveProfile?.role, effectiveProfile?.uid, user?.uid, viewAsActive, viewAs?.professionalId]);

    const startViewAs = (prof: ViewAsProfessional) => {
        try { sessionStorage.setItem(VIEW_AS_KEY, JSON.stringify(prof)); } catch { }
        setViewAs(prof);
    };

    const stopViewAs = () => {
        try { sessionStorage.removeItem(VIEW_AS_KEY); } catch { }
        setViewAs(null);
        setViewAsProfile(null);
    };

    const logout = async () => {
        stopViewAs();
        await firebaseLogout();
        setUser(null);
        setProfile(null);
    };

    const refreshProfile = async () => {
        if (user) {
            try {
                const userProfile = await getUserProfile(user.uid);
                setProfile(userProfile);
            } catch (error) {
                console.error('Error refreshing user profile:', error);
            }
        }
    };

    const effectiveLoading = loading || (viewAsActive && (viewAsLoading || !viewAsProfile));

    return (
        <AuthContext.Provider value={{
            user,
            profile: effectiveProfile,
            realProfile: profile,
            viewAs: viewAsActive ? viewAs : null,
            startViewAs,
            stopViewAs,
            ownProfessional,
            ownProfessionalLoading,
            loading: effectiveLoading,
            logout,
            refreshProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
