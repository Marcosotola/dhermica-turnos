'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard,
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
    ChevronUp,
    Plus,
    ShoppingBag,
    Bell,
    BellOff,
    CheckCircle2,
    MapPin
} from 'lucide-react';
import Link from 'next/link';
import { Appointment } from '@/lib/types/appointment';
import { EditProfileModal } from '@/components/dashboard/EditProfileModal';
import { Toaster } from 'sonner';
import { getAppointmentsByClientId, getAppointmentsByProfessionalId } from '@/lib/firebase/appointments';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { ProfileSection } from '@/components/dashboard/ProfileSection';

export default function DashboardPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isProfileCollapsed, setIsProfileCollapsed] = useState(true);
    const { token, permission, requestPermission } = useNotifications();

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
                            <p className="text-gray-100 font-medium opacity-100">
                                {role === 'admin' ? 'Administrador' : role === 'professional' ? 'Profesional' : role === 'secretary' ? 'Secretaría' : 'Cliente'}
                            </p>
                        </div>
                    </div>


                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Common Card: My Profile */}
                    {/* Common Card: My Profile */}
                    <ProfileSection
                        profile={profile}
                        onEditClick={() => setIsEditModalOpen(true)}
                    />


                    {/* Role Based Buttons */}
                    {role === 'admin' && (
                        <>
                            <Link href="/turnos" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <Calendar className="w-10 h-10 text-[#34baab] mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Turnos</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Ver, crear y cancelar turnos.</p>
                            </Link>

                            <Link href="/agenda" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <BookOpen className="w-10 h-10 text-[#34baab] mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Fichas</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Consultar fichas e historial.</p>
                            </Link>

                            <Link href="/promociones" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <Tag className="w-10 h-10 text-pink-500 mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Promos</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Gestionar ofertas especiales.</p>
                            </Link>

                            <Link href="/tratamientos" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <Sparkles className="w-10 h-10 text-[#34baab] mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Servicios</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Gestionar servicios y precios.</p>
                            </Link>

                            <Link href="/productos" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <ShoppingBag className="w-10 h-10 text-[#34baab] mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Productos</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Gestionar stock y catálogo.</p>
                            </Link>

                            <Link href="/usuarios" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <Settings className="w-10 h-10 text-gray-400 mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Usuarios</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Asignar roles y ver clientes.</p>
                            </Link>

                            <Link href="/profesionales" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <Briefcase className="w-10 h-10 text-[#34baab] mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Profesionales</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Gestionar profesionales.</p>
                            </Link>

                            <Link href="/alquileres" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <Truck className="w-10 h-10 text-orange-500 mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Alquiler</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Gestionar alquileres.</p>
                            </Link>

                            <Link href="/secretaria/notificaciones" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <Bell className="w-10 h-10 text-amber-500 mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Avisos</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Enviar notificaciones push.</p>
                            </Link>

                            <Link href="/comunidad" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <Users className="w-10 h-10 text-[#34baab] mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Comunidad</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Resultados e inspiración.</p>
                            </Link>
                        </>
                    )}

                    {role === 'professional' && (
                        <>
                            <Link href="/profesional" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <Calendar className="w-10 h-10 text-violet-600 mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Turnos</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Ver y gestionar tus citas.</p>
                            </Link>

                            <Link href="/agenda" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <BookOpen className="w-10 h-10 text-[#34baab] mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Fichas</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Consultar fichas e historial.</p>
                            </Link>
                        </>
                    )}

                    {role === 'secretary' && (
                        <Link href="/secretaria" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                            <LayoutDashboard className="w-10 h-10 text-violet-600 mb-4 group-hover:scale-110 transition-transform" />
                            <span className="text-xl font-bold text-gray-900 text-center">Panel</span>
                            <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Panel de gestión de secretaría.</p>
                        </Link>
                    )}

                    {/* Global Buttons */}
                    {role !== 'admin' && (
                        <>
                            <Link href="/tratamientos" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <Sparkles className="w-10 h-10 text-purple-500 mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Servicios</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Ver tratamientos disponibles.</p>
                            </Link>

                            <Link href="/productos" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <ShoppingBag className="w-10 h-10 text-[#34baab] mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Productos</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Catálogo para el hogar.</p>
                            </Link>

                            <Link href="/promociones" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <Tag className="w-10 h-10 text-pink-500 mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Promos</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Ofertas y paquetes especiales.</p>
                            </Link>

                            <Link href="/comunidad" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                <Users className="w-10 h-10 text-[#34baab] mb-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xl font-bold text-gray-900 text-center">Comunidad</span>
                                <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Resultados e inspiración.</p>
                            </Link>
                        </>
                    )}

                    {role === 'client' && (
                        <Link href="/mis-turnos" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                            <Calendar className="w-10 h-10 text-[#34baab] mb-4 group-hover:scale-110 transition-transform" />
                            <span className="text-xl font-bold text-gray-900 text-center">Turnos</span>
                            <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Mis turnos programados.</p>
                        </Link>
                    )}

                    <Link href="/ubicacion" className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                        <MapPin className="w-10 h-10 text-[#34baab] mb-4 group-hover:scale-110 transition-transform" />
                        <span className="text-xl font-bold text-gray-900 text-center">Ubicación</span>
                        <p className="hidden md:block text-gray-500 text-sm mt-2 text-center">Dirección y mapa del salón.</p>
                    </Link>
                </div>


            </div>

            {profile && (
                <EditProfileModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    user={profile}
                    onUpdate={() => window.location.reload()}
                />
            )}
        </div>
    );
}
