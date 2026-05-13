'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Toaster } from 'sonner';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    // If user is logged in AND has a profile, go to dashboard
    if (!loading && user && profile) {
      router.push('/dashboard');
    }
    // If user is logged in BUT NO profile, force register mode to complete profile
    if (!loading && user && !profile) {
      setAuthMode('register');
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-pink-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34baab]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
      <Toaster position="top-center" richColors />

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 backdrop-blur-sm bg-white/90">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 mb-4 flex items-center justify-center">
              <img src="/logo.png" alt="Dhermica Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">
              Dhermica
            </h1>
          </div>

          <div className="flex mb-8 p-1 bg-gray-100 rounded-2xl">
            <button
              onClick={() => setAuthMode('login')}
              disabled={!!(user && !profile)} // Can't switch back to login if completing profile
              className={`flex-1 py-3 text-sm font-black uppercase tracking-wider rounded-xl transition-all ${authMode === 'login'
                  ? 'bg-white text-[#34baab] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-3 text-sm font-black uppercase tracking-wider rounded-xl transition-all ${authMode === 'register'
                  ? 'bg-white text-[#34baab] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Crear Cuenta
            </button>
          </div>

          {authMode === 'login' ? (
            <LoginForm onToggleMode={() => setAuthMode('register')} />
          ) : (
            <RegisterForm onToggleMode={() => setAuthMode('login')} />
          )}
        </div>
      </div>
    </div>
  );
}
