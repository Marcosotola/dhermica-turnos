'use client';

import { useState } from 'react';
import { UserProfile } from '@/lib/types/user';
import { createUserProfile, formatPhone } from '@/lib/firebase/users';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/ui/PhoneInput';

interface CreateClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function CreateClientModal({ isOpen, onClose, onCreated }: CreateClientModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        birthDate: '',
        sex: 'female' as 'male' | 'female',
        email: '',
        hasTattoos: false,
        isPregnant: false,
        relevantMedicalInfo: '',
    });
    const [countryCode, setCountryCode] = useState('+54');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Generate manual ID and Email if not provided
            const timestamp = Date.now();
            const manualId = `manual_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

            // Use provided email or generate a placeholder
            const finalEmail = formData.email.trim() || `manual_${timestamp}@dhermica.internal`;

            const newProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
                uid: manualId,
                email: finalEmail,
                fullName: formData.fullName.trim(),
                phone: formatPhone(`${countryCode}${formData.phone}`),
                birthDate: formData.birthDate,
                sex: formData.sex,
                hasTattoos: formData.hasTattoos,
                isPregnant: formData.isPregnant,
                relevantMedicalInfo: formData.relevantMedicalInfo.trim(),
                role: 'client',
            };

            await createUserProfile(newProfile);
            toast.success('Cliente creado manualmente con éxito');
            onCreated();
            onClose();
        } catch (error) {
            console.error('Error creating manual client:', error);
            toast.error('Error al crear el cliente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#34baab]/10 rounded-xl flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-[#34baab]" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900">Nuevo Registro Manual</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                    <div className="space-y-4">
                        <Input
                            label="Nombre Completo"
                            placeholder="Ej: Juan Pérez"
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

                        <Input
                            label="Email (Opcional)"
                            type="email"
                            placeholder="cliente@ejemplo.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />

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
                                    <span className="text-sm font-medium text-gray-700">Tiene tatuajes</span>
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
                                        <span className="text-sm font-medium text-gray-700">Está embarazada</span>
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

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-[#34baab] hover:bg-[#2aa89a]"
                            disabled={loading}
                        >
                            {loading ? 'Creando...' : 'Crear Cliente'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
