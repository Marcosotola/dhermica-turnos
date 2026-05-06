'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { registerWithEmail, loginWithGoogle, setupRecaptcha, signInWithPhone } from '@/lib/firebase/auth';
import { createUserProfile, formatPhone } from '@/lib/firebase/users';
import { toast } from 'sonner';
import { UserProfile } from '@/lib/types/user';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { Checkbox } from '@/components/ui/Checkbox';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Phone, Mail, ChevronLeft } from 'lucide-react';
import { ConfirmationResult } from 'firebase/auth';
import { useAuth } from '@/lib/contexts/AuthContext';

interface RegisterFormProps {
    onToggleMode: () => void;
}

export function RegisterForm({ onToggleMode }: RegisterFormProps) {
    const [step, setStep] = useState(1);
    const [authOption, setAuthOption] = useState<'options' | 'email' | 'phone_number' | 'phone_otp'>('options');
    const [loading, setLoading] = useState(false);
    const { requestPermission } = useNotifications();
    const { user: currentUser } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        firstName: '',
        lastName: '',
        birthDate: '',
        phone: '',
        hasTattoos: false,
        sex: 'female',
        isPregnant: false,
        relevantMedicalInfo: '',
        wantNotifications: true,
    });
    const [countryCode, setCountryCode] = useState('+54');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [resendTimer, setResendTimer] = useState(0);

    const handleNext = () => {
        if (step === 1) {
            if (!formData.email || !formData.password || !formData.confirmPassword) {
                toast.error('Completa todos los campos básicos.');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                toast.error('Las contraseñas no coinciden.');
                return;
            }
            if (formData.password.length < 6) {
                toast.error('La contraseña debe tener al menos 6 caracteres.');
                return;
            }
            setStep(2);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Create user in Firebase Auth
            const userCredential = await registerWithEmail(formData.email, formData.password);
            const user = userCredential.user;

            // 2. Create user profile in Firestore
            const finalPhone = formatPhone(`${countryCode}${formData.phone}`);

            const fullName = `${formData.firstName} ${formData.lastName}`.trim();

            await createUserProfile({
                uid: user.uid,
                email: formData.email,
                fullName: fullName,
                firstName: formData.firstName,
                lastName: formData.lastName,
                birthDate: formData.birthDate,
                phone: finalPhone,
                hasTattoos: formData.hasTattoos,
                sex: formData.sex as 'male' | 'female',
                isPregnant: formData.sex === 'male' ? false : formData.isPregnant,
                relevantMedicalInfo: formData.relevantMedicalInfo,
                role: 'client', // Default role
                notificationsEnabled: formData.wantNotifications,
            });

            // 3. Request push notification permission if requested
            if (formData.wantNotifications) {
                await requestPermission();
            }

            toast.success('¡Cuenta creada exitosamente!');
        } catch (error: any) {
            console.error('Registration error:', error);
            if (error.code === 'auth/email-already-in-use') {
                toast.error('El email ya está en uso.');
            } else {
                toast.error('Error al crear la cuenta. Inténtalo de nuevo.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
            toast.success('¡Autenticado con Google!');
            // After Google login, AuthContext will update 'user'. 
            // If they don't have a profile, we stay in RegisterForm but move to step 2.
            setStep(2);
        } catch (error: any) {
            if (error.code === 'auth/cancelled-popup-request') return;
            console.error('Google login error:', error);
            toast.error('Error al registrarse con Google.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.phone) {
            toast.error('Ingresa tu número de teléfono.');
            return;
        }

        setLoading(true);
        try {
            const finalPhone = formatPhone(`${countryCode}${formData.phone}`);
            const appVerifier = setupRecaptcha('recaptcha-container-register');
            const result = await signInWithPhone(finalPhone, appVerifier);
            setConfirmationResult(result);
            setAuthOption('phone_otp');
            setResendTimer(60);
            toast.success('Código enviado correctamente.');
        } catch (error: any) {
            console.error('Phone register error:', error);
            toast.error('Error al enviar el código. Revisa el número.');
            const container = document.getElementById('recaptcha-container-register');
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
            toast.success('¡Teléfono verificado!');
            setStep(2);
        } catch (error: any) {
            console.error('OTP verification error:', error);
            toast.error('Código incorrecto o expirado.');
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

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Crear Cuenta</h2>
                <p className="text-sm text-gray-500 mt-2">Paso {step} de 2</p>
            </div>

            {step === 1 && (
                <div className="space-y-6">
                    <div id="recaptcha-container-register"></div>

                    {authOption === 'options' && (
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
                                onClick={() => setAuthOption('phone_number')}
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
                                onClick={() => setAuthOption('email')}
                                className="w-full py-4 rounded-xl font-bold bg-[#484450] hover:bg-[#3a3642] text-white flex items-center justify-center gap-2 shadow-md shadow-[#484450]/20 transition-all"
                            >
                                <Mail className="w-5 h-5" />
                                Registrarse con Email
                            </Button>
                        </div>
                    )}

                    {authOption === 'email' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <button
                                onClick={() => setAuthOption('options')}
                                className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Volver
                            </button>
                            <Input
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="tu@email.com"
                                required
                            />
                            <Input
                                label="Contraseña"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                required
                            />
                            <Input
                                label="Confirmar Contraseña"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                placeholder="••••••••"
                                required
                            />
                            <Button type="button" onClick={handleNext} className="w-full py-4 rounded-xl font-bold">
                                Continuar
                            </Button>
                        </div>
                    )}

                    {authOption === 'phone_number' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <button
                                onClick={() => setAuthOption('options')}
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
                                    phoneNumber={formData.phone}
                                    onPhoneNumberChange={(num) => setFormData({ ...formData, phone: num })}
                                    required
                                />
                                <Button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-bold">
                                    {loading ? 'Enviando...' : 'Enviar Código'}
                                </Button>
                            </form>
                        </div>
                    )}

                    {authOption === 'phone_otp' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <button
                                onClick={() => setAuthOption('phone_number')}
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
                                    {loading ? 'Verificando...' : 'Verificar y Continuar'}
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
                </div>
            )}
            {step === 2 && (
                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Nombre"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                placeholder="Ej: Juan"
                                required
                            />
                            <Input
                                label="Apellido"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                placeholder="Ej: Pérez"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Fecha de Nacimiento"
                                type="date"
                                value={formData.birthDate}
                                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                            />
                            <PhoneInput
                                label="WhatsApp"
                                countryCode={countryCode}
                                onCountryCodeChange={setCountryCode}
                                phoneNumber={formData.phone}
                                onPhoneNumberChange={(number) => setFormData({ ...formData, phone: number })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Sexo Biológico"
                                value={formData.sex}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    sex: e.target.value,
                                    isPregnant: e.target.value === 'male' ? false : formData.isPregnant
                                })}
                                options={[
                                    { value: 'female', label: 'Femenino' },
                                    { value: 'male', label: 'Masculino' }
                                ]}
                            />
                            <Select
                                label="¿Posee tatuajes?"
                                value={formData.hasTattoos ? 'true' : 'false'}
                                onChange={(e) => setFormData({ ...formData, hasTattoos: e.target.value === 'true' })}
                                options={[
                                    { value: 'false', label: 'No' },
                                    { value: 'true', label: 'Sí' }
                                ]}
                            />
                        </div>

                        {formData.sex === 'female' && (
                            <Select
                                label="¿Embarazo?"
                                value={formData.isPregnant ? 'true' : 'false'}
                                onChange={(e) => setFormData({ ...formData, isPregnant: e.target.value === 'true' })}
                                options={[
                                    { value: 'false', label: 'No' },
                                    { value: 'true', label: 'Sí' }
                                ]}
                            />
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Alergias o Enfermedades (opcional)
                            </label>
                            <textarea
                                value={formData.relevantMedicalInfo}
                                onChange={(e) => setFormData({ ...formData, relevantMedicalInfo: e.target.value })}
                                placeholder="Describe cualquier información relevante para tus tratamientos..."
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34baab] focus:border-transparent resize-none text-gray-900 bg-white"
                            />
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <Checkbox
                                id="notifications"
                                checked={formData.wantNotifications}
                                onCheckedChange={(checked) => setFormData({ ...formData, wantNotifications: !!checked })}
                            />
                            <div className="flex flex-col">
                                <label htmlFor="notifications" className="text-sm font-bold text-gray-700">
                                    Habilitar notificaciones
                                </label>
                                <p className="text-xs text-gray-500">Recibe recordatorios de tus turnos y promociones especiales.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setStep(1)}
                                className="flex-1 py-4 rounded-xl font-bold"
                            >
                                Atrás
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="flex-2 py-4 rounded-xl font-bold"
                            >
                                {loading ? 'Creando...' : 'Finalizar Registro'}
                            </Button>
                        </div>
                    </div>
                </form>
            )}

            <div className="pt-6 border-t border-gray-100">
                <p className="text-center text-sm text-gray-500">
                    ¿Ya tienes cuenta?{' '}
                    <button
                        onClick={onToggleMode}
                        type="button"
                        className="font-black text-[#34baab] hover:underline p-2"
                    >
                        Inicia sesión aquí
                    </button>
                </p>
            </div>
        </div>
    );
}
