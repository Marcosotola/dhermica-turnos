'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    Calendar,
    Users,
    User as UserIcon,
    Settings,
    ClipboardList,
    Clock,
    CalendarCheck,
    CalendarX,
    BookOpen,
    Briefcase,
    Truck,
    Sparkles,
    Tag,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import { Appointment } from '@/lib/types/appointment';
import { EditProfileModal } from '@/components/dashboard/EditProfileModal';
import { BirthdayModal } from '@/components/dashboard/BirthdayModal';
import { Toaster } from 'sonner';
import { getAppointmentsByClientId, getAppointmentsByProfessionalId } from '@/lib/firebase/appointments';

export default function DashboardPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isProfileCollapsed, setIsProfileCollapsed] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user || !profile) return; // Stop here if no profile

            setHistoryLoading(true);
            try {
                let data: Appointment[] = [];
                if (profile.role === 'client') {
                    // Fetch by ID (registered) and Name (legacy)
                    data = await getAppointmentsByClientId(user.uid, profile.fullName);
                } else if (profile.role === 'professional') {
                    data = await getAppointmentsByProfessionalId(user.uid);
                }
                setAppointments(data);
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setHistoryLoading(false);
            }
        };

        if (!loading && user && profile) {
            fetchHistory();
        }
    }, [user, profile, loading]);


    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Force profile completion if user exists but profile doesn't
    if (!loading && user && !profile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <UserIcon className="w-16 h-16 text-[#34baab] mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Casi terminamos!</h1>
                    <p className="text-gray-600 mb-8">
                        Necesitamos algunos datos adicionales para completar tu registro y asegurar la mejor atención.
                    </p>
                    <EditProfileModal
                        isOpen={true}
                        onClose={() => { }} // No-op, can't close
                        user={{
                            uid: user.uid,
                            email: user.email || '',
                            fullName: user.displayName || '',
                            phone: '',
                            birthDate: '',
                            hasTattoos: false,
                            isPregnant: false,
                            sex: 'female',
                            relevantMedicalInfo: '',
                            role: 'client',
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }}
                        onUpdate={() => window.location.reload()}
                        isNewUser={true}
                    />
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34baab]"></div>
            </div>
        );
    }

    const role = profile?.role || 'client';

    const calculateAge = (birthDate: string) => {
        if (!birthDate) return 'N/A';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />
            <div className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="bg-[#484450] rounded-3xl p-8 mb-8 shadow-lg text-white">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-inner">
                            <UserIcon className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">
                                Hola, {profile?.fullName || 'Usuario'}
                            </h1>
                            <p className="text-gray-300 font-medium opacity-80">
                                {role === 'admin' ? 'Administrador' : role === 'professional' ? 'Profesional' : 'Cliente'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Common Card: My Profile */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 transition-all duration-300">
                        <div
                            className="flex justify-between items-center cursor-pointer"
                            onClick={() => setIsProfileCollapsed(!isProfileCollapsed)}
                        >
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <UserIcon className="w-5 h-5 text-[#34baab]" /> Mis Datos
                            </h2>
                            <button
                                className="text-[#34baab] p-1 rounded-lg hover:bg-[#34baab]/10 transition-colors"
                            >
                                {isProfileCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className={`grid transition-all duration-300 ease-in-out ${isProfileCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                            <div className="overflow-hidden">
                                <div className="pt-4 space-y-3 text-sm">
                                    <p><span className="font-bold text-gray-500">Nombre:</span> {profile?.fullName}</p>
                                    <p><span className="font-bold text-gray-500">Email:</span> {profile?.email}</p>
                                    <p><span className="font-bold text-gray-500">Teléfono:</span> {profile?.phone}</p>
                                    <p><span className="font-bold text-gray-500">Sexo:</span> {profile?.sex === 'male' ? 'Masculino' : 'Femenino'}</p>
                                    <p><span className="font-bold text-gray-500">F. Nacimiento:</span> {profile?.birthDate ? profile.birthDate.split('-').reverse().join('-') : 'N/A'}</p>
                                    <p><span className="font-bold text-gray-500">Edad:</span> {profile?.birthDate ? `${calculateAge(profile.birthDate)} años` : 'N/A'}</p>

                                    <div className="border-t border-gray-100 my-3 pt-3">
                                        <div className="flex gap-4 mb-2">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${profile?.hasTattoos ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {profile?.hasTattoos ? 'Con Tatuajes' : 'Sin Tatuajes'}
                                            </span>
                                            {profile?.sex === 'female' && (
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${profile?.isPregnant ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    {profile?.isPregnant ? 'Embarazada' : 'No Embarazada'}
                                                </span>
                                            )}
                                        </div>
                                        {profile?.relevantMedicalInfo && (
                                            <div className="bg-red-50 p-3 rounded-xl border border-red-100 mt-2">
                                                <p className="text-[10px] font-black text-red-500 uppercase mb-1">Información Médica</p>
                                                <p className="text-gray-700 italic text-xs">{profile.relevantMedicalInfo}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsEditModalOpen(true);
                                            }}
                                            className="text-xs font-bold text-[#34baab] hover:underline flex items-center gap-1"
                                        >
                                            <Settings className="w-3 h-3" /> Editar Perfil
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Role Based Cards */}
                    {role === 'admin' && (
                        <>
                            <Link href="/turnos" className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-[#34baab]" /> Gestión de Turnos
                                </h2>
                                <p className="text-gray-500 text-sm">Ver, crear y cancelar turnos del día.</p>
                                <div className="mt-4 flex justify-end">
                                    <span className="text-[#34baab] font-bold group-hover:translate-x-1 transition-transform">Ir →</span>
                                </div>
                            </Link>

                            <Link href="/agenda" className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-[#34baab]" /> Agenda de Clientes
                                </h3>
                                <p className="text-gray-500 text-sm">Consultar fichas, historial y datos de salud.</p>
                                <div className="mt-4 flex justify-end">
                                    <span className="text-[#34baab] font-bold group-hover:translate-x-1 transition-transform">Ir →</span>
                                </div>
                            </Link>

                            <Link href="/promociones" className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Tag className="w-5 h-5 text-pink-500" /> Promociones
                                </h2>
                                <p className="text-gray-500 text-sm">Ofertas especiales y paquetes exclusivos para ti.</p>
                                <div className="mt-4 flex justify-end">
                                    <span className="text-[#34baab] font-bold group-hover:translate-x-1 transition-transform">Ver más →</span>
                                </div>
                            </Link>

                            <Link href="/tratamientos" className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-500" /> Tratamientos
                                </h2>
                                <p className="text-gray-500 text-sm">Descubre todos nuestros servicios y tratamientos.</p>
                                <div className="mt-4 flex justify-end">
                                    <span className="text-[#34baab] font-bold group-hover:translate-x-1 transition-transform">Ver más →</span>
                                </div>
                            </Link>

                            <Link href="/usuarios" className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-gray-400" /> Gestión de Usuarios
                                </h3>
                                <p className="text-gray-500 text-sm">Asignar roles y ver base de datos de clientes.</p>
                                <div className="mt-4 flex justify-end">
                                    <span className="text-[#34baab] font-bold group-hover:translate-x-1 transition-transform">Ir →</span>
                                </div>
                            </Link>

                            <Link href="/profesionales" className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Briefcase className="w-5 h-5 text-purple-500" /> Profesionales
                                </h3>
                                <p className="text-gray-500 text-sm">Gestionar staff, colores y orden de visualización.</p>
                                <div className="mt-4 flex justify-end">
                                    <span className="text-[#34baab] font-bold group-hover:translate-x-1 transition-transform">Ir →</span>
                                </div>
                            </Link>

                            <Link href="/alquileres" className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-orange-500" /> Alquileres
                                </h3>
                                <p className="text-gray-500 text-sm">Gestionar alquiler de equipos y logística.</p>
                                <div className="mt-4 flex justify-end">
                                    <span className="text-[#34baab] font-bold group-hover:translate-x-1 transition-transform">Ir →</span>
                                </div>
                            </Link>
                        </>
                    )}

                    {/* Global Cards (All Roles) - shown after admin cards */}
                    {role !== 'admin' && (
                        <>
                            <Link href="/tratamientos" className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-500" /> Tratamientos
                                </h2>
                                <p className="text-gray-500 text-sm">Descubre todos nuestros servicios y tratamientos.</p>
                                <div className="mt-4 flex justify-end">
                                    <span className="text-[#34baab] font-bold group-hover:translate-x-1 transition-transform">Ver más →</span>
                                </div>
                            </Link>

                            <Link href="/promociones" className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Tag className="w-5 h-5 text-pink-500" /> Promociones
                                </h2>
                                <p className="text-gray-500 text-sm">Ofertas especiales y paquetes exclusivos para ti.</p>
                                <div className="mt-4 flex justify-end">
                                    <span className="text-[#34baab] font-bold group-hover:translate-x-1 transition-transform">Ver más →</span>
                                </div>
                            </Link>
                        </>
                    )}

                    {(role === 'professional' || role === 'client') && (
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-3">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-[#34baab]" /> {role === 'client' ? 'Mis Turnos' : 'Mis Turnos Asignados'}
                            </h2>

                            {historyLoading ? (
                                <div className="flex justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34baab]"></div>
                                </div>
                            ) : appointments.length > 0 ? (
                                <div className="space-y-4">
                                    {appointments.map((apt) => (
                                        <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#34baab]/30 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                    <CalendarCheck className="w-6 h-6 text-[#34baab]" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{apt.treatment}</h3>
                                                    <p className="text-sm text-gray-500">
                                                        {new Date(apt.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} - {apt.time}
                                                    </p>
                                                    {role === 'professional' && (
                                                        <p className="text-xs text-gray-400 font-medium mt-1">
                                                            Cliente: {apt.clientName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="px-3 py-1 bg-green-100 text-green-600 rounded-lg text-[10px] uppercase font-black tracking-widest">
                                                    Confirmado
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 font-medium">No hay turnos registrados en el historial.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {profile && (
                    <>
                        <BirthdayModal user={profile} />
                        <EditProfileModal
                            isOpen={isEditModalOpen}
                            onClose={() => setIsEditModalOpen(false)}
                            user={profile}
                            onUpdate={() => window.location.reload()}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
