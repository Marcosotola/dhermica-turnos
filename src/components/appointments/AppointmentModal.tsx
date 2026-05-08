'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Appointment, DURATION_OPTIONS, AppointmentStatus, Payment, SelectedTreatment } from '@/lib/types/appointment';
import { TreatmentSelectorSheet } from './TreatmentSelectorSheet';
import { Plus, Trash2, CreditCard, CheckCircle2, Clock, XCircle, ChevronDown, Save, Phone, Sparkles, Gift } from 'lucide-react';
import { Professional } from '@/lib/types/professional';
import { UserProfile } from '@/lib/types/user';
import { getAllUsers, createManualUserProfile } from '@/lib/firebase/users';
import { capitalizeName } from '@/lib/utils/time';
import { Search, UserPlus, User, BadgeDollarSign } from 'lucide-react';
import { validateAppointment, checkOverlap } from '@/lib/utils/validation';
import { createAppointment, updateAppointment } from '@/lib/firebase/appointments';
import { GiftCard } from '@/lib/types/giftCard';
import { getGiftCardsByClient, updateGiftCardStatus } from '@/lib/firebase/giftCards';
import { ClientCredit } from '@/lib/types/clientCredit';
import { getClientCredits, useCredit } from '@/lib/firebase/clientCredits';
import { formatArgentineCurrency } from '@/lib/utils/currency';
import { toast } from 'sonner';
import { PhoneInput } from '../ui/PhoneInput';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment?: Appointment;
    professionals: Professional[];
    existingAppointments: Appointment[];
    defaultTime?: string;
    defaultProfessionalId?: string;
    date: string;
}

export function AppointmentModal({
    isOpen,
    onClose,
    appointment,
    professionals,
    existingAppointments,
    defaultTime,
    defaultProfessionalId,
    date,
}: AppointmentModalProps) {
    const [formData, setFormData] = useState({
        clientName: '',
        clientFirstName: '',
        clientLastName: '',
        clientId: '',
        clientPhone: '',
        clientEmail: '',
        clientBirthDate: '',
        hasTattoos: false,
        isPregnant: false,
        relevantMedicalInfo: '',
        sex: 'female' as 'male' | 'female',
        treatment: '',
        time: defaultTime || '',
        duration: 1,
        professionalId: defaultProfessionalId || '',
        notes: '',
        price: 0,
        status: 'pending' as AppointmentStatus,
        payments: [] as Payment[],
        commissionPercentageOverride: undefined as number | undefined,
    });
    const [useCustomCommission, setUseCustomCommission] = useState(false);
    const [newPayment, setNewPayment] = useState({
        amount: 0,
        method: 'cash' as Payment['method'],
        label: 'Pago Total',
        bankAccount: 'cuenta1' as 'cuenta1' | 'cuenta2',
        date: new Date().toLocaleDateString('en-CA') // Default to today
    });
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [activeGiftCards, setActiveGiftCards] = useState<GiftCard[]>([]);
    const [selectedGiftCardId, setSelectedGiftCardId] = useState<string>('');
    const [activeCredits, setActiveCredits] = useState<ClientCredit[]>([]);
    const [selectedCreditId, setSelectedCreditId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const today = new Date().toLocaleDateString('en-CA');
    const [clients, setClients] = useState<UserProfile[]>([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [clientMode, setClientMode] = useState<'registered' | 'manual'>('registered');
    const [errors, setErrors] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredClients, setFilteredClients] = useState<UserProfile[]>([]);
    const [countryCode, setCountryCode] = useState('+54');
    const [selectedTreatments, setSelectedTreatments] = useState<SelectedTreatment[]>([]);
    const [treatmentMode, setTreatmentMode] = useState<'catalog' | 'manual'>('catalog');
    const [showTreatmentSheet, setShowTreatmentSheet] = useState(false);

    const formatMinutes = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h === 0) return `${m}m`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    };

    const removeSelectedTreatment = (index: number) => {
        setSelectedTreatments(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        const fetchClients = async () => {
            setClientsLoading(true);
            try {
                const data = await getAllUsers();
                setClients(data);
            } catch (error) {
                console.error('Error fetching clients:', error);
            } finally {
                setClientsLoading(false);
            }
        };

        if (isOpen) {
            fetchClients();
        }
    }, [isOpen]);

    const fetchActiveGiftCards = (clientId: string, clientName?: string) => {
        if (!clientId) { setActiveGiftCards([]); return; }
        getGiftCardsByClient(clientId, clientName).then(cards => {
            setActiveGiftCards(cards.filter(c => c.status === 'active' && (!c.expiryDate || c.expiryDate >= today)));
        }).catch(err => {
            console.error('[GiftCards] Error al buscar gift cards:', err);
            setActiveGiftCards([]);
        });
    };

    const fetchActiveCredits = (clientId: string, clientName?: string) => {
        if (!clientId) { setActiveCredits([]); return; }
        getClientCredits(clientId, clientName || '').then(credits => {
            setActiveCredits(credits.filter(c => c.status === 'available'));
        }).catch(err => {
            console.error('[Credits] Error al buscar créditos:', err);
            setActiveCredits([]);
        });
    };

    // Filter clients based on search query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredClients([]);
            return;
        }
        const query = searchQuery.toLowerCase();
        const filtered = clients.filter(client => {
            const fullName = client?.fullName?.toLowerCase() || '';
            const email = client?.email?.toLowerCase() || '';
            return fullName.includes(query) || email.includes(query);
        });
        setFilteredClients(filtered);
    }, [searchQuery, clients]);


    useEffect(() => {
        if (treatmentMode !== 'catalog') return;
        const totalMinutes = selectedTreatments.reduce((sum, t) => sum + t.duration, 0);
        const totalHours = selectedTreatments.length > 0
            ? Math.max(0.5, Math.round(totalMinutes / 30) * 0.5)
            : 1;
        const totalPrice = selectedTreatments.reduce((sum, t) => sum + t.price, 0);
        const treatmentLabel = selectedTreatments
            .map(t => t.zone ? `${t.name} (${t.zone})` : t.name)
            .join(' + ');
        setFormData(prev => ({
            ...prev,
            treatment: treatmentLabel,
            duration: totalHours,
            price: totalPrice,
        }));
    }, [selectedTreatments, treatmentMode]);

    useEffect(() => {
        if (appointment) {
            setFormData({
                clientName: appointment.clientName,
                clientFirstName: appointment.clientFirstName || '',
                clientLastName: appointment.clientLastName || '',
                clientId: appointment.clientId || '',
                clientPhone: appointment.clientPhone || '',
                clientEmail: appointment.clientEmail || '',
                clientBirthDate: '',
                hasTattoos: false,
                isPregnant: false,
                relevantMedicalInfo: '',
                sex: 'female',
                treatment: appointment.treatment,
                time: appointment.time,
                duration: appointment.duration,
                professionalId: appointment.professionalId || '',
                notes: appointment.notes || '',
                price: appointment.price || 0,
                status: appointment.status || 'pending',
                payments: appointment.payments || [],
                commissionPercentageOverride: appointment.commissionPercentageOverride ?? undefined,
            });
            setUseCustomCommission(
                appointment.commissionPercentageOverride !== undefined &&
                appointment.commissionPercentageOverride !== null
            );
            if (appointment.clientId) {
                setClientMode('registered');
            } else {
                setClientMode('manual');
            }
            if (appointment.treatments && appointment.treatments.length > 0) {
                setSelectedTreatments(appointment.treatments);
                setTreatmentMode('catalog');
            } else {
                setSelectedTreatments([]);
                setTreatmentMode('manual');
            }
        } else {
            setFormData({
                clientName: '',
                clientFirstName: '',
                clientLastName: '',
                clientId: '',
                clientPhone: '',
                clientEmail: '',
                clientBirthDate: '',
                hasTattoos: false,
                isPregnant: false,
                relevantMedicalInfo: '',
                sex: 'female',
                treatment: '',
                time: defaultTime || '',
                duration: 1,
                professionalId: defaultProfessionalId || (professionals.length > 0 ? professionals[0].id : ''),
                notes: '',
                price: 0,
                status: 'pending',
                payments: [],
                commissionPercentageOverride: undefined,
            });
            setClientMode('registered');
            setUseCustomCommission(false);
            setSelectedTreatments([]);
            setTreatmentMode('catalog');
        }
        setErrors([]);
        setSearchQuery('');
        setShowSuggestions(false);
        setSelectedGiftCardId('');
        setSelectedCreditId('');
        setNewPayment({
            amount: 0,
            method: 'cash',
            label: 'Pago Total',
            bankAccount: 'cuenta1',
            date: new Date().toLocaleDateString('en-CA')
        });
        setShowPaymentForm(false);
        if (appointment?.clientId) {
            fetchActiveGiftCards(appointment.clientId, appointment.clientName);
            fetchActiveCredits(appointment.clientId, appointment.clientName);
        } else {
            setActiveGiftCards([]);
            setActiveCredits([]);
        }
    }, [appointment, defaultTime, defaultProfessionalId, isOpen]);

    const handleClientSearch = (value: string) => {
        setSearchQuery(value);
        setShowSuggestions(true);
    };

    const selectClient = (client: UserProfile) => {
        // Detect country code from client phone
        let detectedCode = '+54';
        if (client.phone?.startsWith('+')) {
            const countryCodes = ['+598', '+54', '+56', '+55', '+34', '+1'];
            const foundCode = countryCodes.find(code => client.phone.startsWith(code));
            if (foundCode) detectedCode = foundCode;
        }
        setCountryCode(detectedCode);

        setFormData(prev => ({
            ...prev,
            clientId: client.uid,
            clientName: client.fullName,
            clientFirstName: client.firstName || client.fullName.split(' ')[0],
            clientLastName: client.lastName || client.fullName.split(' ').slice(1).join(' '),
            clientPhone: client.phone || '',
            clientEmail: client.email || ''
        }));
        setSearchQuery(client.fullName);
        setShowSuggestions(false);
        fetchActiveGiftCards(client.uid, client.fullName);
        fetchActiveCredits(client.uid, client.fullName);
    };

    const handleAddPayment = () => {
        if (newPayment.method === 'gift_card') {
            if (!selectedGiftCardId) { toast.error('Seleccioná una gift card'); return; }
            const gc = activeGiftCards.find(c => c.id === selectedGiftCardId);
            if (!gc) return;
            const payment: Payment = {
                id: Math.random().toString(36).substring(2, 9),
                amount: gc.amount,
                method: 'gift_card',
                label: `Gift Card (${gc.code})`,
                bankAccount: null,
                giftCardId: gc.id,
                date: newPayment.date,
                createdAt: new Date().toISOString() as any,
            };
            setFormData(prev => ({ ...prev, payments: [...prev.payments, payment] }));
            setActiveGiftCards(prev => prev.filter(c => c.id !== gc.id));
            setSelectedGiftCardId('');
            setShowPaymentForm(false);
            toast.success(`Gift Card ${gc.code} agregada`);
            return;
        }

        if (newPayment.method === 'client_credit') {
            if (!selectedCreditId) { toast.error('Seleccioná un crédito'); return; }
            const credit = activeCredits.find(c => c.id === selectedCreditId);
            if (!credit) return;
            const payment: Payment = {
                id: Math.random().toString(36).substring(2, 9),
                amount: credit.amount,
                method: 'client_credit',
                label: 'Saldo a Favor',
                bankAccount: null,
                creditId: credit.id,
                date: newPayment.date,
                createdAt: new Date().toISOString() as any,
            };
            setFormData(prev => ({ ...prev, payments: [...prev.payments, payment] }));
            setActiveCredits(prev => prev.filter(c => c.id !== credit.id));
            setSelectedCreditId('');
            setShowPaymentForm(false);
            toast.success(`Saldo a favor de $${formatArgentineCurrency(credit.amount)} aplicado`);
            return;
        }

        if (newPayment.amount <= 0) {
            toast.error('El monto debe ser mayor a 0');
            return;
        }

        const payment: Payment = {
            id: Math.random().toString(36).substring(2, 9),
            amount: newPayment.amount,
            method: newPayment.method,
            label: newPayment.label,
            bankAccount: newPayment.method !== 'cash' ? newPayment.bankAccount : null,
            date: newPayment.date,
            createdAt: new Date().toISOString() as any
        };

        setFormData(prev => ({
            ...prev,
            payments: [...prev.payments, payment]
        }));
        setNewPayment({
            amount: 0,
            method: 'cash',
            label: 'Pago Total',
            bankAccount: 'cuenta1',
            date: new Date().toLocaleDateString('en-CA')
        });
        setShowPaymentForm(false);
        toast.success('Pago registrado');
    };

    const removePayment = (id: string) => {
        const removed = formData.payments.find(p => p.id === id);
        setFormData(prev => ({ ...prev, payments: prev.payments.filter(p => p.id !== id) }));
        if (removed?.method === 'gift_card' && removed.giftCardId) {
            const clientId = formData.clientId || `legacy-${formData.clientName?.replace(/\s+/g, '-').toLowerCase()}`;
            getGiftCardsByClient(clientId, formData.clientName).then(cards => {
                const restored = cards.find(c => c.id === removed.giftCardId && c.status === 'active' && (!c.expiryDate || c.expiryDate >= today));
                if (restored) setActiveGiftCards(prev => [...prev, restored]);
            }).catch(() => {});
        }
        if (removed?.method === 'client_credit' && removed.creditId) {
            const clientId = formData.clientId || `legacy-${formData.clientName?.replace(/\s+/g, '-').toLowerCase()}`;
            getClientCredits(clientId, formData.clientName).then(credits => {
                const restored = credits.find(c => c.id === removed.creditId && c.status === 'available');
                if (restored) setActiveCredits(prev => [...prev, restored]);
            }).catch(() => {});
        }
    };

    const totalPaid = formData.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = (formData.price || 0) - totalPaid;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors([]);

        // Si hay un pago en el formulario que no se ha "agregado" con el (+), lo agregamos automáticamente
        let finalPayments = [...formData.payments];
        if (showPaymentForm && newPayment.amount > 0) {
            const autoPayment: Payment = {
                id: Math.random().toString(36).substring(2, 9),
                amount: newPayment.amount,
                method: newPayment.method,
                label: newPayment.label,
                bankAccount: newPayment.method !== 'cash' ? newPayment.bankAccount : null,
                date: newPayment.date,
                createdAt: new Date().toISOString() as any
            };
            finalPayments.push(autoPayment);
        }

        const clientName = clientMode === 'manual'
            ? `${formData.clientFirstName} ${formData.clientLastName}`.trim()
            : formData.clientName;

        const appointmentData = {
            clientName: capitalizeName(clientName),
            clientFirstName: capitalizeName(clientMode === 'manual' ? formData.clientFirstName : (formData.clientFirstName || clientName.split(' ')[0])),
            clientLastName: capitalizeName(clientMode === 'manual' ? formData.clientLastName : (formData.clientLastName || clientName.split(' ').slice(1).join(' '))),
            clientId: clientMode === 'registered' ? formData.clientId : undefined,
            clientPhone: formData.clientPhone,
            clientEmail: formData.clientEmail || undefined,
            treatment: formData.treatment,
            treatments: treatmentMode === 'catalog' ? selectedTreatments : [],
            date,
            time: formData.time,
            duration: formData.duration,
            professionalId: formData.professionalId || undefined,
            notes: formData.notes,
            price: formData.price,
            status: formData.status,
            payments: finalPayments,
            commissionPercentageOverride: useCustomCommission ? (formData.commissionPercentageOverride ?? null) : null,
        };

        // Validar datos
        const validationErrors = validateAppointment(appointmentData);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        // Verificar superposición con otros turnos
        // Solo verificar si ambos turnos tienen el mismo professionalId válido (no vacío/undefined)
        const otherAppointments = existingAppointments.filter(
            (apt) =>
                apt.id !== appointment?.id &&
                appointmentData.professionalId && // Tiene professionalId
                appointmentData.professionalId !== '' && // No es string vacío
                apt.professionalId === appointmentData.professionalId // Y coincide con otro turno
        );

        const overlappingAppointments = otherAppointments.filter((apt) =>
            checkOverlap(appointmentData, apt)
        );

        if (overlappingAppointments.length > 0) {
            setErrors(['Este horario se superpone con otro turno del mismo profesional']);
            return;
        }

        // Verificar si el cliente ya tiene turno en esta fecha
        if (!appointment) {
            const clientHasAppointment = existingAppointments.some(
                (apt) =>
                    apt.clientName.toLowerCase() === appointmentData.clientName.toLowerCase()
            );

            if (clientHasAppointment) {
                const confirmed = window.confirm(
                    `${appointmentData.clientName} ya tiene un turno en esta fecha. ¿Desea continuar?`
                );
                if (!confirmed) return;
            }
        }

        setLoading(true);

        try {
            let finalClientId = clientMode === 'registered' ? formData.clientId : undefined;

            // Si es modo manual, intentamos registrar al cliente o encontrar uno existente por teléfono
            if (clientMode === 'manual') {
                try {
                    // 1. Buscar si ya existe un cliente con este teléfono para evitar duplicados
                    const formattedPhone = formData.clientPhone;
                    const existingClient = clients.find(c => c.phone === formattedPhone);

                    if (existingClient) {
                        finalClientId = existingClient.uid;
                        console.log('Cliente manual ya existente encontrado:', finalClientId);
                    } else {
                        // 2. Si no existe, lo creamos
                        const newUid = await createManualUserProfile({
                            firstName: capitalizeName(formData.clientFirstName),
                            lastName: capitalizeName(formData.clientLastName),
                            fullName: `${capitalizeName(formData.clientFirstName)} ${capitalizeName(formData.clientLastName)}`.trim(),
                            email: formData.clientEmail.toLowerCase() || `manual_${Date.now()}@dhermica.internal`,
                            phone: formData.clientPhone,
                            role: 'client',
                            sex: formData.sex || 'female',
                            hasTattoos: formData.hasTattoos,
                            isPregnant: formData.isPregnant,
                            relevantMedicalInfo: formData.relevantMedicalInfo || '',
                            birthDate: formData.clientBirthDate || '',
                        });
                        finalClientId = newUid;
                        console.log('Nuevo cliente manual creado:', finalClientId);
                    }
                } catch (userError) {
                    console.error('Error al gestionar el perfil del cliente:', userError);
                    toast.error('No se pudo registrar la ficha del cliente, pero se guardará el turno.');
                }
            }

            // Eliminar campos undefined manualmente para ser precisos
            const cleanData = Object.fromEntries(
                Object.entries({
                    ...appointmentData,
                    clientId: finalClientId,
                    // Aseguramos que los nombres estén capitalizados y actualizados
                    clientFirstName: capitalizeName(clientMode === 'manual' ? formData.clientFirstName : (formData.clientFirstName || clientName.split(' ')[0])),
                    clientLastName: capitalizeName(clientMode === 'manual' ? formData.clientLastName : (formData.clientLastName || clientName.split(' ').slice(1).join(' '))),
                }).filter(([_, v]) => v !== undefined)
            );

            let savedId: string;
            if (appointment) {
                await updateAppointment(appointment.id, cleanData);
                savedId = appointment.id;
                toast.success('Turno actualizado correctamente');
            } else {
                savedId = await createAppointment(cleanData as any);
                toast.success('Turno creado y cliente registrado');
            }

            const gcPayments = finalPayments.filter(p => p.method === 'gift_card' && p.giftCardId);
            if (gcPayments.length > 0) {
                await Promise.all(gcPayments.map(p =>
                    updateGiftCardStatus(p.giftCardId!, 'redeemed', {
                        redeemedDate: today,
                        redeemedInAppointmentId: savedId,
                    })
                ));
            }

            const creditPayments = finalPayments.filter(p => p.method === 'client_credit' && p.creditId);
            if (creditPayments.length > 0) {
                await Promise.all(creditPayments.map(p =>
                    useCredit(p.creditId!, p.amount, savedId, today)
                ));
            }

            onClose();
        } catch (error) {
            console.error('Error saving appointment:', error);
            toast.error('Error al guardar el turno');
            setErrors(['Error al guardar el turno. Por favor intente nuevamente.']);
        } finally {
            setLoading(false);
        }
    };

    const professionalOptions = professionals.map((p) => ({ value: p.id, label: p.name }));

    return (
    <>
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={appointment ? 'Editar Turno' : 'Nuevo Turno'}
            size="md"
            headerAction={
                <Button
                    type="submit"
                    onClick={(e) => {
                        e.preventDefault();
                        handleSubmit(e as any);
                    }}
                    disabled={loading}
                    className="bg-[#34baab] hover:bg-[#2da699] text-white p-2 rounded-xl md:hidden shadow-lg"
                    title="Guardar"
                    aria-label="Guardar"
                >
                    <Save className="w-6 h-6" />
                </Button>
            }
            footer={
                <div className="flex gap-3 w-full">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-4 font-bold border-gray-200"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        onClick={(e) => {
                            e.preventDefault();
                            handleSubmit(e as any);
                        }}
                        disabled={loading}
                        className="flex-1 py-4 bg-[#34baab] hover:bg-[#2da699] text-white font-black uppercase tracking-widest shadow-lg shadow-[#34baab]/20"
                    >
                        {loading ? 'Guardando...' : appointment ? 'Actualizar' : 'Crear Turno'}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        {errors.map((error, index) => (
                            <p key={index} className="text-sm text-red-600">
                                • {error}
                            </p>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-gray-400" />
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Información del Cliente</h3>
                </div>

                <div className="bg-gray-50 p-1 rounded-xl flex mb-6">
                    <button
                        type="button"
                        onClick={() => setClientMode('registered')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${clientMode === 'registered'
                            ? 'bg-white text-[#34baab] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <User className="w-4 h-4" /> Cliente Registrado
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setClientMode('manual');
                            setFormData(prev => ({ ...prev, clientId: '' }));
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${clientMode === 'manual'
                            ? 'bg-white text-[#34baab] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <UserPlus className="w-4 h-4" /> Nuevo Manual
                    </button>
                </div>

                {clientMode === 'registered' ? (
                    <div className={`relative mb-6 ${showSuggestions ? 'z-[70]' : 'z-[50]'}`}>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleClientSearch(e.target.value)}
                                onFocus={() => setShowSuggestions(true)}
                                placeholder={clientsLoading ? 'Cargando clientes...' : 'Buscar por nombre o apellido...'}
                                className="w-full pl-14 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#34baab]/20 focus:border-[#34baab] transition-all font-medium text-gray-900"
                            />
                        </div>

                        {showSuggestions && searchQuery && (
                            <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                {filteredClients.length > 0 ? (
                                    <>
                                        {filteredClients.map((client) => (
                                            <button
                                                key={client.uid}
                                                type="button"
                                                onClick={() => selectClient(client)}
                                                className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left ${formData.clientId === client.uid ? 'bg-[#34baab]/5' : ''}`}
                                            >
                                                <div className="w-10 h-10 bg-[#34baab]/10 rounded-full flex items-center justify-center shrink-0">
                                                    <User className="w-5 h-5 text-[#34baab]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-gray-900 truncate">{client.fullName}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </>
                                ) : (
                                    <div className="px-4 py-8 text-center text-gray-500">
                                        <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm">No se encontraron clientes</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Client Health Info Alert */}
                        {formData.clientId && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl space-y-1 animate-in fade-in duration-300">
                                <div className="flex items-center gap-2 text-red-600">
                                    <User className="w-4 h-4" />
                                    <span className="text-xs font-black uppercase tracking-wider">Perfil de Salud</span>
                                </div>
                                {(() => {
                                    const selectedClient = clients.find(c => c.uid === formData.clientId);
                                    if (!selectedClient) return null;
                                    return (
                                        <div className="text-[11px] text-gray-600">
                                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                {selectedClient.hasTattoos && <span className="text-orange-600 font-bold">• TIENE TATUAJES</span>}
                                                {selectedClient.isPregnant && <span className="text-pink-600 font-bold">• EMBARAZADA</span>}
                                                {selectedClient.relevantMedicalInfo && (
                                                    <p className="w-full italic mt-1 line-clamp-2">" {selectedClient.relevantMedicalInfo} "</p>
                                                )}
                                                {!selectedClient.hasTattoos && !selectedClient.isPregnant && !selectedClient.relevantMedicalInfo && (
                                                    <span className="text-gray-400">Sin observaciones especiales registradas.</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Nombre"
                                value={formData.clientFirstName || ''}
                                onChange={(e) =>
                                    setFormData({ ...formData, clientFirstName: capitalizeName(e.target.value) })
                                }
                                placeholder="Ej: María"
                                required
                            />
                            <Input
                                label="Apellido"
                                value={formData.clientLastName || ''}
                                onChange={(e) =>
                                    setFormData({ ...formData, clientLastName: capitalizeName(e.target.value) })
                                }
                                placeholder="Ej: González"
                                required
                            />
                        </div>

                        {/* Información de Salud (Solo Manual) */}
                        <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100 space-y-4 mt-4">
                            <div className="flex items-center gap-2 mb-1">
                                <BadgeDollarSign className="w-4 h-4 text-amber-600" />
                                <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">Perfil de Salud</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-amber-200 cursor-pointer hover:bg-amber-100/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.isPregnant}
                                        onChange={(e) => setFormData({ ...formData, isPregnant: e.target.checked })}
                                        className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span className="text-sm font-medium text-amber-900">Embarazo</span>
                                </label>

                                <label className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-amber-200 cursor-pointer hover:bg-amber-100/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.hasTattoos}
                                        onChange={(e) => setFormData({ ...formData, hasTattoos: e.target.checked })}
                                        className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span className="text-sm font-medium text-amber-900">Tatuajes</span>
                                </label>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-amber-700 uppercase px-1">Notas Médicas / Alergias</label>
                                <textarea
                                    value={formData.relevantMedicalInfo || ''}
                                    onChange={(e) => setFormData({ ...formData, relevantMedicalInfo: e.target.value })}
                                    placeholder="Ej: Alérgica a la aspirina, hipersensibilidad..."
                                    rows={2}
                                    className="w-full px-4 py-2 bg-white border border-amber-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-sm text-gray-900"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-[#34baab]/5 p-5 rounded-3xl border border-[#34baab]/10 space-y-5 mb-8">
                    <div className="flex items-center gap-2 mb-1">
                        <Phone className="w-4 h-4 text-[#34baab]" />
                        <h3 className="text-[10px] font-black text-[#34baab] uppercase tracking-[0.2em]">Contacto para Automatización</h3>
                    </div>

                    <div className="space-y-5">
                        <PhoneInput
                            label="WhatsApp"
                            countryCode={countryCode}
                            onCountryCodeChange={setCountryCode}
                            phoneNumber={formData.clientPhone.replace(countryCode, '').replace('+', '')}
                            onPhoneNumberChange={(num) => setFormData({ ...formData, clientPhone: `${countryCode}${num}` })}
                            required
                        />

                        <div className={`grid grid-cols-1 ${clientMode === 'manual' ? 'md:grid-cols-2' : ''} gap-4`}>
                            {clientMode === 'manual' && (
                                <Input
                                    label="Fecha de Nacimiento (Opcional)"
                                    type="date"
                                    value={formData.clientBirthDate || ''}
                                    onChange={(e) => setFormData({ ...formData, clientBirthDate: e.target.value })}
                                />
                            )}
                            <Input
                                label="Email"
                                type="email"
                                value={formData.clientEmail || ''}
                                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                                placeholder="ejemplo@correo.com"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#34baab]" />
                            <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em]">Tratamientos</span>
                        </div>
                        <div className="bg-gray-100 p-0.5 rounded-lg flex">
                            <button
                                type="button"
                                onClick={() => setTreatmentMode('catalog')}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${treatmentMode === 'catalog' ? 'bg-white text-[#34baab] shadow-sm' : 'text-gray-400'}`}
                            >
                                Catálogo
                            </button>
                            <button
                                type="button"
                                onClick={() => setTreatmentMode('manual')}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${treatmentMode === 'manual' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'}`}
                            >
                                Manual
                            </button>
                        </div>
                    </div>

                    {treatmentMode === 'catalog' ? (
                        <div className="space-y-2">
                            {selectedTreatments.map((t, i) => (
                                <div key={i} className="flex items-center gap-3 bg-[#34baab]/5 border border-[#34baab]/10 rounded-2xl px-4 py-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {t.name}{t.zone ? <span className="text-gray-400 font-normal"> · {t.zone}</span> : ''}
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            ${t.price.toLocaleString('es-AR')} · {formatMinutes(t.duration)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeSelectedTreatment(i)}
                                        aria-label="Quitar tratamiento"
                                        className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={() => setShowTreatmentSheet(true)}
                                className="w-full py-4 border-2 border-dashed border-[#34baab]/30 rounded-2xl text-[#34baab] hover:bg-[#34baab]/5 transition-all text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Agregar tratamiento
                            </button>

                            {selectedTreatments.length > 1 && (
                                <div className="flex items-center justify-between bg-[#34baab]/5 rounded-xl px-4 py-2.5">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total calculado</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-[#34baab]">
                                            ${selectedTreatments.reduce((s, t) => s + t.price, 0).toLocaleString('es-AR')}
                                        </span>
                                        <span className="text-[11px] text-gray-400">
                                            · {formatMinutes(selectedTreatments.reduce((s, t) => s + t.duration, 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Input
                            label="Tratamiento"
                            value={formData.treatment || ''}
                            onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                            placeholder="Ej: Limpieza facial"
                            required
                        />
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Hora"
                        type="time"
                        value={formData.time || ''}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        min="07:30"
                        max="19:30"
                        step="1800"
                        required
                    />

                    <Select
                        label="Duración"
                        value={formData.duration}
                        onChange={(e) =>
                            setFormData({ ...formData, duration: parseFloat(e.target.value) })
                        }
                        options={DURATION_OPTIONS}
                        required
                    />
                </div>

                <Select
                    label="Profesional"
                    value={formData.professionalId}
                    onChange={(e) => setFormData({ ...formData, professionalId: e.target.value })}
                    options={professionalOptions}
                />

                {/* Status and Price Section */}
                <div className="space-y-6 border-t border-gray-100 pt-4">
                    <div className="space-y-3">
                        <p className="block text-sm font-bold text-gray-700 uppercase tracking-widest text-[10px]">Estado del Turno</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'pending', label: 'Pendiente', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
                                { id: 'completed', label: 'Realizado', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
                                { id: 'cancelled', label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
                            ].map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: s.id as AppointmentStatus })}
                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all min-h-[70px] ${formData.status === s.id
                                        ? `${s.bg} ${s.border} ${s.color} shadow-sm scale-105`
                                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                        }`}
                                >
                                    <s.icon className={`w-5 h-5 mb-1.5 ${formData.status === s.id ? s.color : 'text-gray-300'}`} />
                                    <span className="text-[9px] font-black uppercase tracking-tight text-center leading-tight">{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <CurrencyInput
                        label="Precio Total del Servicio"
                        value={formData.price}
                        onChange={(val) => setFormData({ ...formData, price: val })}
                        placeholder="0,00"
                    />
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-4 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-gray-400" />
                            <h3 className="text-sm font-bold text-gray-700">Gestión de Pagos</h3>
                        </div>
                        {balance > 0 && (
                            <span className="text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-700 px-2 py-1 rounded-full animate-pulse">
                                Saldo: $ {balance.toLocaleString('es-AR')}
                            </span>
                        )}
                        {balance <= 0 && formData.price > 0 && (
                            <span className="text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                Saldado
                            </span>
                        )}
                    </div>

                    {/* Payment List */}
                    <div className="space-y-2">
                        {formData.payments.map((p) => (
                            <div key={p.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm group">
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-gray-900 uppercase tracking-tighter">{p.label}</span>
                                    <span className="text-[10px] text-gray-500">
                                        {p.method === 'cash' ? 'EFECTIVO' : p.method === 'transfer' ? 'TRANSFERENCIA' : p.method === 'debit' ? 'DÉBITO' : p.method === 'credit' ? 'CRÉDITO' : p.method === 'gift_card' ? 'GIFT CARD' : p.method === 'client_credit' ? 'SALDO A FAVOR' : p.method.toUpperCase()}
                                        {p.bankAccount && ` (${p.bankAccount === 'cuenta1' ? 'CTA 1' : 'CTA 2'})`} • {(() => {
                                            const parts = p.date.split('-');
                                            return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : p.date;
                                        })()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-gray-900">$ {p.amount.toLocaleString('es-AR')}</span>
                                    <button
                                        type="button"
                                        aria-label="Eliminar pago"
                                        onClick={() => removePayment(p.id)}
                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {showPaymentForm ? (
                        <div className="bg-white p-4 rounded-xl border-2 border-[#34baab]/20 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <Select
                                label="Método"
                                value={newPayment.method}
                                onChange={(e) => {
                                    setNewPayment({ ...newPayment, method: e.target.value as any });
                                    setSelectedGiftCardId('');
                                    setSelectedCreditId('');
                                }}
                                options={[
                                    { value: 'cash', label: 'Efectivo' },
                                    { value: 'transfer', label: 'Transferencia' },
                                    { value: 'debit', label: 'Débito' },
                                    { value: 'credit', label: 'Crédito' },
                                    { value: 'qr', label: 'QR' },
                                    ...(activeGiftCards.length > 0 ? [{ value: 'gift_card', label: 'Gift Card' }] : []),
                                    ...(activeCredits.length > 0 ? [{ value: 'client_credit', label: 'Saldo a Favor' }] : []),
                                ]}
                            />

                            {newPayment.method === 'gift_card' ? (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gift Card activa</p>
                                    {activeGiftCards.map(gc => (
                                        <button
                                            key={gc.id}
                                            type="button"
                                            onClick={() => setSelectedGiftCardId(gc.id)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${selectedGiftCardId === gc.id ? 'border-teal-400 bg-teal-50' : 'border-gray-100 bg-white hover:border-teal-200'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Gift className="w-4 h-4 text-teal-500 shrink-0" />
                                                <span className="font-mono text-xs text-gray-600">{gc.code}</span>
                                                {gc.expiryDate && <span className="text-[9px] text-gray-400">vence {gc.expiryDate.split('-').reverse().join('/')}</span>}
                                            </div>
                                            <span className="font-black text-sm text-teal-700">$ {formatArgentineCurrency(gc.amount)}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : newPayment.method === 'client_credit' ? (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo disponible</p>
                                    {activeCredits.map(credit => (
                                        <button
                                            key={credit.id}
                                            type="button"
                                            onClick={() => setSelectedCreditId(credit.id)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${selectedCreditId === credit.id ? 'border-amber-400 bg-amber-50' : 'border-gray-100 bg-white hover:border-amber-200'}`}
                                        >
                                            <div className="flex flex-col items-start gap-0.5">
                                                <span className="text-xs font-bold text-gray-700">Seña / Crédito</span>
                                                {credit.sourceTreatmentName && (
                                                    <span className="text-[9px] text-gray-400">{credit.sourceTreatmentName}</span>
                                                )}
                                            </div>
                                            <span className="font-black text-sm text-amber-700">$ {formatArgentineCurrency(credit.amount)}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <CurrencyInput
                                            label="Monto"
                                            value={newPayment.amount}
                                            onChange={(val) => setNewPayment({ ...newPayment, amount: val })}
                                        />
                                        <div className="space-y-1">
                                            <label htmlFor="apt-payment-date" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</label>
                                            <input
                                                id="apt-payment-date"
                                                type="date"
                                                value={newPayment.date}
                                                onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#34baab]"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {newPayment.method !== 'cash' ? (
                                            <Select
                                                label="Cuenta de Destino"
                                                value={newPayment.bankAccount}
                                                onChange={(e) => setNewPayment({ ...newPayment, bankAccount: e.target.value as any })}
                                                options={[
                                                    { value: 'cuenta1', label: 'Cuenta 1' },
                                                    { value: 'cuenta2', label: 'Cuenta 2' },
                                                ]}
                                            />
                                        ) : (
                                            <div className="space-y-1">
                                                <label htmlFor="apt-payment-label-cash" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Etiqueta</label>
                                                <select
                                                    id="apt-payment-label-cash"
                                                    value={newPayment.label}
                                                    onChange={(e) => setNewPayment({ ...newPayment, label: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#34baab]"
                                                >
                                                    <option value="Pago Total">Pago Total</option>
                                                    <option value="Seña">Seña</option>
                                                    <option value="Pago Parcial">Pago Parcial</option>
                                                </select>
                                            </div>
                                        )}
                                        {newPayment.method !== 'cash' && (
                                            <div className="space-y-1">
                                                <label htmlFor="apt-payment-label-transfer" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Etiqueta</label>
                                                <select
                                                    id="apt-payment-label-transfer"
                                                    value={newPayment.label}
                                                    onChange={(e) => setNewPayment({ ...newPayment, label: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#34baab]"
                                                >
                                                    <option value="Pago">Pago</option>
                                                    <option value="Seña">Seña</option>
                                                    <option value="Saldo">Saldo</option>
                                                    <option value="Abono">Abono</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                                <Button
                                    type="button"
                                    onClick={handleAddPayment}
                                    className="flex-1 bg-[#34baab] hover:bg-[#2da699] text-white text-[10px] font-black uppercase tracking-widest"
                                >
                                    Confirmar Pago
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setShowPaymentForm(false)}
                                    className="px-4"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Saldo a Favor disponible */}
                            {activeCredits.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Gift className="w-4 h-4 text-amber-500" />
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Saldo a Favor Disponible</p>
                                    </div>
                                    {activeCredits.map(credit => {
                                        const amountToApply = balance > 0 ? Math.min(credit.amount, balance) : credit.amount;
                                        return (
                                            <button
                                                key={credit.id}
                                                type="button"
                                                onClick={() => {
                                                    const payment: Payment = {
                                                        id: Math.random().toString(36).substring(2, 9),
                                                        amount: amountToApply,
                                                        method: 'client_credit',
                                                        label: 'Saldo a Favor',
                                                        bankAccount: null,
                                                        creditId: credit.id,
                                                        date: newPayment.date,
                                                        createdAt: new Date().toISOString() as any,
                                                    };
                                                    setFormData(prev => ({ ...prev, payments: [...prev.payments, payment] }));
                                                    setActiveCredits(prev => prev.filter(c => c.id !== credit.id));
                                                    toast.success(`Saldo a favor de $${formatArgentineCurrency(amountToApply)} aplicado`);
                                                }}
                                                className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:border-amber-400 hover:bg-amber-100 transition-all"
                                            >
                                                <div className="flex flex-col items-start gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <Gift className="w-4 h-4 text-amber-500 shrink-0" />
                                                        <span className="text-xs font-bold text-amber-800">Aplicar Saldo a Favor</span>
                                                    </div>
                                                    {credit.sourceTreatmentName && (
                                                        <span className="text-[9px] text-gray-500 ml-6">{credit.sourceTreatmentName}</span>
                                                    )}
                                                    {amountToApply < credit.amount && (
                                                        <span className="text-[9px] text-amber-600 ml-6 font-bold">
                                                            Resta $ {formatArgentineCurrency(credit.amount - amountToApply)} de crédito
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-black text-sm text-amber-700">$ {formatArgentineCurrency(amountToApply)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    setNewPayment({ ...newPayment, amount: balance > 0 ? balance : 0 });
                                    setShowPaymentForm(true);
                                }}
                                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-[#34baab] hover:text-[#34baab] hover:bg-[#34baab]/5 transition-all text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" /> Registrar Pago
                            </button>
                        </div>
                    )}
                </div>

                {/* Commission Override Section */}
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BadgeDollarSign className="w-5 h-5 text-blue-500" />
                            <h3 className="text-sm font-bold text-gray-700">Comisión Especial</h3>
                        </div>
                        <button
                            type="button"
                            aria-label="Activar comisión personalizada"
                            onClick={() => {
                                const newValue = !useCustomCommission;
                                setUseCustomCommission(newValue);
                                if (newValue && formData.commissionPercentageOverride === undefined) {
                                    setFormData({ ...formData, commissionPercentageOverride: 100 });
                                }
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${useCustomCommission ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useCustomCommission ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {useCustomCommission && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <Input
                                        label="Porcentaje de Comisión (%)"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.commissionPercentageOverride ?? ''}
                                        onChange={(e) => setFormData({ ...formData, commissionPercentageOverride: e.target.value ? Number(e.target.value) : undefined })}
                                        placeholder="Ej: 100"
                                    />
                                </div>
                                <div className="pt-6">
                                    <span className="text-xs text-gray-400 font-bold uppercase italic">
                                        * Solo para este turno
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label htmlFor="apt-notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Notas (opcional)
                    </label>
                    <textarea
                        id="apt-notes"
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Notas adicionales..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none text-gray-900"
                    />

                </div>

            </form>
        </Modal>

        <TreatmentSelectorSheet
            isOpen={showTreatmentSheet}
            onClose={() => setShowTreatmentSheet(false)}
            onAdd={(t) => {
                setSelectedTreatments(prev => [...prev, t]);
                toast.success(`${t.name} agregado`);
            }}
        />
    </>
    );
}
