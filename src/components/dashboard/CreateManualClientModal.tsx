'use client';

import { useState } from 'react';
import { UserProfile } from '@/lib/types/user';
import { createManualUserProfile } from '@/lib/firebase/users';
import { toast } from 'sonner';
import { 
    X, 
    User, 
    Phone as PhoneIcon, 
    Mail, 
    Calendar, 
    Heart, 
    Save, 
    Check,
    AlertCircle,
    Info
} from 'lucide-react';
import { Input } from '../ui/Input';
import { PhoneInput } from '../ui/PhoneInput';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface CreateManualClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function CreateManualClientModal({ isOpen, onClose, onCreated }: CreateManualClientModalProps) {
    const [loading, setLoading] = useState(false);
    const [countryCode, setCountryCode] = useState('+54');
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        birthDate: '',
        sex: 'female' as 'male' | 'female',
        hasTattoos: false,
        isPregnant: false,
        relevantMedicalInfo: '',
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.firstName || !formData.lastName || !formData.phone) {
            toast.error('Nombre, Apellido y Teléfono son obligatorios');
            return;
        }

        setLoading(true);
        try {
            await createManualUserProfile({
                firstName: formData.firstName,
                lastName: formData.lastName,
                fullName: `${formData.firstName} ${formData.lastName}`.trim(),
                email: formData.email.toLowerCase(),
                phone: formData.phone,
                birthDate: formData.birthDate,
                sex: formData.sex,
                hasTattoos: formData.hasTattoos,
                isPregnant: formData.isPregnant,
                relevantMedicalInfo: formData.relevantMedicalInfo,
                role: 'client',
            });

            toast.success('Cliente creado correctamente');
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-24 sm:pb-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-[#484450] p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#34baab] rounded-xl shadow-lg">
                            <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-widest">Nuevo Cliente Manual</h2>
                            <p className="text-xs text-gray-400 font-medium">Registro de clientes asistido por administración</p>
                        </div>
                    </div>
                    <button
                        aria-label="Cerrar"
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {/* Basic Info Section */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Info className="w-4 h-4 text-[#34baab]" />
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Datos Básicos</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Nombre"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                placeholder="Ej: María"
                                required
                            />
                            <Input
                                label="Apellido"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                placeholder="Ej: González"
                                required
                            />
                            <PhoneInput
                                label="WhatsApp"
                                countryCode={countryCode}
                                onCountryCodeChange={setCountryCode}
                                phoneNumber={formData.phone.replace(countryCode, '').replace('+', '')}
                                onPhoneNumberChange={(num) => setFormData({ ...formData, phone: `${countryCode}${num}` })}
                                required
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="ejemplo@correo.com"
                            />
                        </div>
                    </div>

                    {/* Personal Info Section */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-4 h-4 text-[#34baab]" />
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Información Personal</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Fecha de Nacimiento"
                                type="date"
                                value={formData.birthDate}
                                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                            />
                            <Select
                                label="Sexo"
                                value={formData.sex}
                                onChange={(e) => setFormData({ ...formData, sex: e.target.value as 'male' | 'female' })}
                                options={[
                                    { value: 'female', label: 'Femenino' },
                                    { value: 'male', label: 'Masculino' },
                                ]}
                            />
                        </div>
                    </div>

                    {/* Medical / Status Section */}
                    <div className="mb-8 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Heart className="w-4 h-4 text-[#34baab]" />
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Perfil de Salud</h3>
                        </div>

                        <div className="flex flex-wrap gap-6 mb-6">
                            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setFormData({ ...formData, hasTattoos: !formData.hasTattoos })}>
                                <div className={`w-12 h-6 rounded-full transition-all relative ${formData.hasTattoos ? 'bg-[#34baab]' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.hasTattoos ? 'left-7' : 'left-1'}`} />
                                </div>
                                <span className="text-sm font-bold text-gray-700">¿Tiene Tatuajes?</span>
                            </div>

                            {formData.sex === 'female' && (
                                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setFormData({ ...formData, isPregnant: !formData.isPregnant })}>
                                    <div className={`w-12 h-6 rounded-full transition-all relative ${formData.isPregnant ? 'bg-pink-500' : 'bg-gray-300'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isPregnant ? 'left-7' : 'left-1'}`} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">¿Embarazada?</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="manual-medical-info" className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
                                Información Médica Relevante
                            </label>
                            <textarea
                                id="manual-medical-info"
                                value={formData.relevantMedicalInfo}
                                onChange={(e) => setFormData({ ...formData, relevantMedicalInfo: e.target.value })}
                                className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#34baab]/20 focus:border-[#34baab] transition-all min-h-25 text-sm"
                                placeholder="Alergias, enfermedades, cirugías recientes, etc..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 py-4"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-4 bg-[#34baab] hover:bg-[#2da698] text-white"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <Save className="w-5 h-5" />
                                    <span>Crear Cliente</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
