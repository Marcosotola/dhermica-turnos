'use client';

import { useState } from 'react';
import { UserProfile } from '@/lib/types/user';
import { updateUserProfile, createUserProfile, formatPhone } from '@/lib/firebase/users';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { X, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useNotifications } from '@/lib/hooks/useNotifications';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserProfile;
    onUpdate: () => void;
    isNewUser?: boolean;
}

export function EditProfileModal({ isOpen, onClose, user, onUpdate, isNewUser = false }: EditProfileModalProps) {
    const [loading, setLoading] = useState(false);
    const { requestPermission } = useNotifications();
    const [formData, setFormData] = useState(() => {
        let phoneDisplay = user.phone || '';
        if (phoneDisplay.startsWith('+')) {
            const code = phoneDisplay.startsWith('+598') ? '+598' :
                phoneDisplay.startsWith('+54') ? '+54' :
                    phoneDisplay.startsWith('+56') ? '+56' :
                        phoneDisplay.startsWith('+55') ? '+55' :
                            phoneDisplay.startsWith('+34') ? '+34' :
                                phoneDisplay.startsWith('+1') ? '+1' : '';
            if (code) {
                phoneDisplay = phoneDisplay.substring(code.length);
            }
        }
        return {
            fullName: user.fullName || '',
            phone: phoneDisplay,
            birthDate: user.birthDate || '',
            hasTattoos: user.hasTattoos || false,
            sex: user.sex || 'female',
            isPregnant: user.isPregnant || false,
            relevantMedicalInfo: user.relevantMedicalInfo || '',
            wantNotifications: user.notificationsEnabled ?? true,
        };
    });

    const [countryCode, setCountryCode] = useState(() => {
        if (user.phone?.startsWith('+598')) return '+598';
        if (user.phone?.startsWith('+56')) return '+56';
        if (user.phone?.startsWith('+55')) return '+55';
        if (user.phone?.startsWith('+34')) return '+34';
        if (user.phone?.startsWith('+1')) return '+1';
        return '+54';
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const finalPhone = formatPhone(`${countryCode}${formData.phone}`);

            if (isNewUser) {
                // Create new profile
                await createUserProfile({
                    ...user,
                    ...formData,
                    phone: finalPhone,
                    notificationsEnabled: formData.wantNotifications,
                    role: 'client' // Default role
                });

                // Request push notification permission if requested
                if (formData.wantNotifications) {
                    await requestPermission();
                }

                toast.success('¡Registro completado! Bienvenido.');
            } else {
                // Update existing
                await updateUserProfile(user.uid, {
                    ...formData,
                    phone: finalPhone,
                    notificationsEnabled: formData.wantNotifications,
                });

                // Request push notification permission if requested
                if (formData.wantNotifications) {
                    await requestPermission();
                }

                toast.success('Perfil actualizado correctamente');
            }
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Error al guardar el perfil');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-black text-gray-900">
                        {isNewUser ? 'Completa tu Registro' : 'Editar Mis Datos'}
                    </h2>
                    {!isNewUser && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <Input
                            label="Nombre Completo"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            required
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <PhoneInput
                                label="Teléfono (WhatsApp)"
                                countryCode={countryCode}
                                onCountryCodeChange={setCountryCode}
                                phoneNumber={formData.phone}
                                onPhoneNumberChange={(number) => setFormData({ ...formData, phone: number })}
                                required
                            />
                            <Input
                                type="date"
                                label="Fecha de Nacimiento"
                                value={formData.birthDate}
                                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                                required
                            />
                        </div>

                        <Select
                            label="Sexo Biológico"
                            value={formData.sex}
                            onChange={(e) => setFormData({
                                ...formData,
                                sex: e.target.value as 'male' | 'female',
                                isPregnant: e.target.value === 'male' ? false : formData.isPregnant
                            })}
                            options={[
                                { value: 'female', label: 'Femenino' },
                                { value: 'male', label: 'Masculino' }
                            ]}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.hasTattoos}
                                        onChange={(e) => setFormData({ ...formData, hasTattoos: e.target.checked })}
                                        className="w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">¿Tiene tatuajes?</span>
                                </label>
                            </div>
                            {formData.sex === 'female' && (
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isPregnant}
                                            onChange={(e) => setFormData({ ...formData, isPregnant: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">¿Está embarazada?</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Información Médica Relevante
                        </label>
                        <textarea
                            value={formData.relevantMedicalInfo}
                            onChange={(e) => setFormData({ ...formData, relevantMedicalInfo: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent min-h-[100px] resize-none"
                            placeholder="Alergias, enfermedades crónicas, medicación..."
                        />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <Checkbox
                            id="modal-notifications"
                            checked={formData.wantNotifications}
                            onCheckedChange={(checked) => setFormData({ ...formData, wantNotifications: !!checked })}
                        />
                        <div className="flex flex-col">
                            <label htmlFor="modal-notifications" className="text-sm font-bold text-gray-700 leading-none">
                                Habilitar notificaciones
                            </label>
                            <p className="text-[10px] text-gray-500 mt-1">Recibe recordatorios de tus turnos y promociones.</p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        {!isNewUser && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="flex-1"
                                disabled={loading}
                            >
                                Cancelar
                            </Button>
                        )}
                        <Button
                            type="submit"
                            className="flex-1 bg-[#34baab] hover:bg-[#2aa89a]"
                            disabled={loading}
                        >
                            {loading ? 'Guardando...' : (isNewUser ? 'Completar Registro' : 'Guardar Cambios')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
