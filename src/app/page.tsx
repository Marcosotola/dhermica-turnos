'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Landing, takeNextPath } from '@/components/landing/Landing';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && profile) {
      // Si entró desde "Reservar turno", vuelve ahí; si no, al panel
      router.push(takeNextPath() ?? '/dashboard');
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-pink-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34baab]"></div>
      </div>
    );
  }

  if (user && profile) {
    return null;
  }

  // Inició sesión (p. ej. con Google) pero le falta completar el perfil
  return <Landing completeProfile={!!(user && !profile)} />;
}
