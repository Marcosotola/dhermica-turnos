'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { updateUserProfile } from '@/lib/firebase/users';
import { Button } from '@/components/ui/Button';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function SetupAdminPage() {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handlePromote = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await updateUserProfile(user.uid, { role: 'admin' });
            toast.success('¡Ahora eres Administrador! Redirigiendo...');
            // Force reload to update claims/context
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } catch (error) {
            console.error(error);
            toast.error('Error al promover usuario');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="p-8">Por favor inicia sesión primero.</div>;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-8 h-8 text-red-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Configuración de Admin</h1>
                    <p className="text-gray-500 mt-2">
                        Esta es una página temporal para asignar el rol de <strong>Administrador</strong> a tu usuario actual.
                    </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl text-left text-sm">
                    <p><strong>Usuario:</strong> {profile?.fullName}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Rol Actual:</strong> <span className="uppercase font-bold">{profile?.role}</span></p>
                </div>

                <Button
                    onClick={handlePromote}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    disabled={loading || profile?.role === 'admin'}
                >
                    {profile?.role === 'admin' ? 'Ya eres Admin' : 'Convertirme en Admin'}
                </Button>
            </div>
        </div>
    );
}
