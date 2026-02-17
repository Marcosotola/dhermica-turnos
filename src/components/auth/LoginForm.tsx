'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { loginWithEmail, loginWithGoogle, resetPassword } from '@/lib/firebase/auth';
import { toast } from 'sonner';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
    onToggleMode: () => void;
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [forgotPassword, setForgotPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await loginWithEmail(email, password);
            toast.success('¡Bienvenido de nuevo!');
        } catch (error: any) {
            console.error('Login error:', error);
            toast.error('Error al iniciar sesión. Revisa tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
            toast.success('¡Bienvenido con Google!');
        } catch (error: any) {
            if (error.code === 'auth/cancelled-popup-request') {
                console.log('Google login popup was cancelled by a new request or closed.');
                return;
            }
            console.error('Google login error:', error);
            toast.error('Error al iniciar sesión con Google.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error('Ingresa tu email para recuperar la contraseña.');
            return;
        }
        setLoading(true);
        try {
            await resetPassword(email);
            toast.success('Email de recuperación enviado. Revisa tu bandeja de entrada.');
            setForgotPassword(false);
        } catch (error: any) {
            console.error('Reset password error:', error);
            toast.error('Error al enviar el email de recuperación.');
        } finally {
            setLoading(false);
        }
    };

    if (forgotPassword) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Recuperar Contraseña</h2>
                    <p className="text-sm text-gray-500 mt-2">Te enviaremos un email para restablecerla.</p>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-4">
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        required
                    />
                    <Button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-bold">
                        {loading ? 'Enviando...' : 'Enviar Email'}
                    </Button>
                    <button
                        type="button"
                        onClick={() => setForgotPassword(false)}
                        className="w-full text-center text-sm font-bold text-[#34baab] hover:underline"
                    >
                        Volver al inicio de sesión
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
                <p className="text-sm text-gray-500 mt-2">¡Qué bueno verte de nuevo!</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                />
                <div className="space-y-1 relative">
                    <Input
                        label="Contraseña"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setForgotPassword(true)}
                        className="text-xs font-bold text-[#34baab] hover:underline block text-right w-full mt-1"
                    >
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>

                <Button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-bold">
                    {loading ? 'Entrando...' : 'Entrar'}
                </Button>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500 font-bold">O continúa con</span>
                </div>
            </div>

            <Button
                type="button"
                variant="secondary"
                onClick={handleGoogleLogin}
                className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 border-gray-200"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Google
            </Button>

            <p className="text-center text-sm text-gray-500">
                ¿No tienes cuenta?{' '}
                <button
                    onClick={onToggleMode}
                    className="font-bold text-[#34baab] hover:underline"
                >
                    Regístrate aquí
                </button>
            </p>
        </div>
    );
}
