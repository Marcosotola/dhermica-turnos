'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { registerWithEmail, loginWithGoogle } from '@/lib/firebase/auth';
import { createUserProfile, formatPhone } from '@/lib/firebase/users';
import { toast } from 'sonner';
import { UserProfile } from '@/lib/types/user';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { Checkbox } from '@/components/ui/Checkbox';
import { PhoneInput } from '@/components/ui/PhoneInput';

interface RegisterFormProps {
    onToggleMode: () => void;
}

export function RegisterForm({ onToggleMode }: RegisterFormProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const { requestPermission } = useNotifications();
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
            toast.success('¡Bienvenido con Google!');
        } catch (error: any) {
            if (error.code === 'auth/cancelled-popup-request') return;
            console.error('Google login error:', error);
            toast.error('Error al registrarse con Google.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Crear Cuenta</h2>
                <p className="text-sm text-gray-500 mt-2">Paso {step} de 2</p>
            </div>

            {step === 1 && (
                <>
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

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500 font-bold">O regístrate con email</span>
                        </div>
                    </div>
                </>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
                {step === 1 ? (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
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
                ) : (
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
                                required
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
                )}
            </form>

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
