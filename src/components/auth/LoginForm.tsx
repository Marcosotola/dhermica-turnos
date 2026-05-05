'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { loginWithEmail, loginWithGoogle, resetPassword, setupRecaptcha, signInWithPhone } from '@/lib/firebase/auth';
import { toast } from 'sonner';
import { Mail, Lock, LogIn, Eye, EyeOff, Phone, ChevronLeft } from 'lucide-react';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { formatPhone } from '@/lib/firebase/users';
import { ConfirmationResult } from 'firebase/auth';

interface LoginFormProps {
    onToggleMode: () => void;
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [forgotPassword, setForgotPassword] = useState(false);
    const [loginMode, setLoginMode] = useState<'options' | 'email' | 'phone_number' | 'phone_otp'>('options');

    // Phone Auth State
    const [phoneNumber, setPhoneNumber] = useState('');
    const [countryCode, setCountryCode] = useState('+54');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [resendTimer, setResendTimer] = useState(0);

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

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneNumber) {
            toast.error('Ingresa tu número de teléfono.');
            return;
        }

        setLoading(true);
        try {
            const finalPhone = formatPhone(`${countryCode}${phoneNumber}`);
            const appVerifier = setupRecaptcha('recaptcha-container');
            const result = await signInWithPhone(finalPhone, appVerifier);
            setConfirmationResult(result);
            setLoginMode('phone_otp');
            setResendTimer(60);
            toast.success('Código enviado correctamente.');
        } catch (error: any) {
            console.error('Phone login error:', error);
            if (error.code === 'auth/invalid-phone-number') {
                toast.error('Número de teléfono inválido.');
            } else if (error.code === 'auth/too-many-requests') {
                toast.error('Demasiados intentos. Inténtalo más tarde.');
            } else {
                toast.error('Error al enviar el código. Revisa el número.');
            }
            // Reset reCAPTCHA container if it exists
            const container = document.getElementById('recaptcha-container');
            if (container) container.innerHTML = '';
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) {
            toast.error('Ingresa el código de 6 dígitos.');
            return;
        }

        setLoading(true);
        try {
            if (!confirmationResult) throw new Error('No confirmation result');
            await confirmationResult.confirm(otp);
            toast.success('¡Bienvenido de nuevo!');
        } catch (error: any) {
            console.error('OTP verification error:', error);
            if (error.code === 'auth/invalid-verification-code') {
                toast.error('Código incorrecto. Inténtalo de nuevo.');
            } else {
                toast.error('Error al verificar el código.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

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
                <h2 className="text-2xl font-bold text-gray-900">
                    {loginMode === 'phone_number' ? 'Ingresa tu Teléfono' :
                        loginMode === 'phone_otp' ? 'Verifica tu Teléfono' :
                            'Iniciar Sesión'}
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                    {loginMode === 'phone_otp' ? 'Ingresa el código de 6 dígitos que te enviamos.' : '¡Qué bueno verte de nuevo!'}
                </p>
            </div>

            <div id="recaptcha-container"></div>

            {loginMode === 'options' && (
                <div className="space-y-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 border-gray-200"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        Continuar con Google
                    </Button>

                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setLoginMode('phone_number')}
                        disabled={loading}
                        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 border-gray-200"
                    >
                        <Phone className="w-5 h-5 text-[#34baab]" />
                        Continuar con Teléfono
                    </Button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500 font-bold">O usa tu email</span>
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={() => setLoginMode('email')}
                        className="w-full py-4 rounded-xl font-bold bg-gray-100 hover:bg-gray-200 text-gray-900"
                    >
                        <Mail className="w-5 h-5 mr-2 inline" />
                        Entrar con Email
                    </Button>
                </div>
            )}

            {loginMode === 'email' && (
                <div className="space-y-4">
                    <button
                        onClick={() => setLoginMode('options')}
                        className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Volver
                    </button>
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
                </div>
            )}

            {loginMode === 'phone_number' && (
                <div className="space-y-4">
                    <button
                        onClick={() => setLoginMode('options')}
                        className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Volver
                    </button>
                    <form onSubmit={handleSendOtp} className="space-y-6">
                        <PhoneInput
                            label="Número de Teléfono"
                            countryCode={countryCode}
                            onCountryCodeChange={setCountryCode}
                            phoneNumber={phoneNumber}
                            onPhoneNumberChange={setPhoneNumber}
                            required
                        />
                        <Button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-bold">
                            {loading ? 'Enviando...' : 'Enviar Código'}
                        </Button>
                    </form>
                </div>
            )}

            {loginMode === 'phone_otp' && (
                <div className="space-y-4">
                    <button
                        onClick={() => setLoginMode('phone_number')}
                        className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Cambiar número
                    </button>
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <Input
                            label="Código de Verificación"
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="123456"
                            className="text-center text-2xl tracking-[1rem] font-black"
                            required
                        />
                        <Button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-bold">
                            {loading ? 'Verificando...' : 'Verificar y Entrar'}
                        </Button>

                        <div className="text-center">
                            {resendTimer > 0 ? (
                                <p className="text-sm text-gray-500">
                                    Reenviar código en {resendTimer}s
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    className="text-sm font-bold text-[#34baab] hover:underline"
                                >
                                    Reenviar código
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            <div className="pt-6 border-t border-gray-100">
                <p className="text-center text-sm text-gray-500">
                    ¿No tienes cuenta?{' '}
                    <button
                        onClick={onToggleMode}
                        type="button"
                        className="font-black text-[#34baab] hover:underline p-2"
                    >
                        Regístrate aquí
                    </button>
                </p>
            </div>
        </div>
    );
}
