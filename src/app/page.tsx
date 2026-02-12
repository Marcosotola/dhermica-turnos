'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Toaster } from 'sonner';
import { LayoutDashboard } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

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
            <div className="w-16 h-16 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <LayoutDashboard className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
              Dhermica
            </h1>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">
              Estética Unisex
            </p>
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
