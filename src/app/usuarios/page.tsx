'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAllUsers, updateUserProfile, deleteUserProfile } from '@/lib/firebase/users';
import { ensureProfessionalEntry } from '@/lib/firebase/professionals';
import { UserProfile, UserRole } from '@/lib/types/user';
import { toast, Toaster } from 'sonner';
import { Users, Shield, User as UserIcon, Search, Mail, Phone, Pencil, Trash } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EditProfileModal } from '@/components/dashboard/EditProfileModal';

export default function UsuariosPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
        if (!authLoading && profile?.role !== 'admin' && profile?.role !== 'secretary') {
            router.push('/dashboard');
        }
    }, [user, profile, authLoading, router]);

    useEffect(() => {
        fetchUsers();
    }, [profile]);

    const fetchUsers = async () => {
        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Error al cargar la lista de usuarios.');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (uid: string, newRole: UserRole) => {
        try {
            // Actualizar rol en users
            await updateUserProfile(uid, { role: newRole });

            // Si el nuevo rol es professional, asegurar entrada en professionals
            if (newRole === 'professional') {
                const user = users.find(u => u.uid === uid);

                if (user) {
                    try {
                        await ensureProfessionalEntry(uid, user.fullName);
                        toast.success('Rol actualizado y profesional creado automáticamente');
                    } catch (profError) {
                        console.error('[handleRoleChange] Error en ensureProfessionalEntry:', profError);
                        toast.error('Rol actualizado pero hubo un error al crear el profesional');
                    }
                } else {
                    toast.success('Rol actualizado correctamente');
                }
            } else {
                toast.success('Rol actualizado correctamente');
            }

            // Actualizar UI
            setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error('Error updating role:', error);
            toast.error('Error al actualizar el rol');
        }
    };

    const handleDelete = async (user: UserProfile) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar al usuario ${user.fullName}? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            await deleteUserProfile(user.uid);
            setUsers(users.filter(u => u.uid !== user.uid));
            toast.success('Usuario eliminado correctamente');
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Error al eliminar el usuario');
        }
    };

    const handleEdit = (user: UserProfile) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const filteredUsers = users.filter(u =>
        (u.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34baab]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />
            <div className="container mx-auto px-4 py-8">
                <div className="bg-[#484450] rounded-3xl p-8 mb-8 shadow-lg text-white">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#34baab] rounded-2xl flex items-center justify-center shadow-lg">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Gestión de Usuarios</h1>
                            <p className="text-gray-300 font-medium">Asigna roles, edita datos y gestiona permisos.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o email..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#34baab] outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Usuario</th>
                                    <th className="px-6 py-4">Contacto</th>
                                    <th className="px-6 py-4">Rol</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-[#484450]/10 rounded-xl flex items-center justify-center">
                                                    <UserIcon className="w-6 h-6 text-[#484450]" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{user.fullName}</p>
                                                    <p className="text-xs text-gray-400">{user.uid}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                {user.email}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                {user.phone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                                                user.role === 'professional' ? 'bg-blue-100 text-blue-600' :
                                                    user.role === 'promotor' ? 'bg-teal-100 text-teal-600' :
                                                        'bg-green-100 text-green-600'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <Select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                                                    options={[
                                                        { value: 'client', label: 'Cliente' },
                                                        { value: 'promotor', label: 'Promotor' },
                                                        { value: 'professional', label: 'Profesional' },
                                                        { value: 'secretary', label: 'Secretaria' },
                                                        { value: 'admin', label: 'Administrador' }
                                                    ]}
                                                    className="w-32"
                                                />
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-2 text-gray-400 hover:text-[#34baab] hover:bg-[#34baab]/10 rounded-lg transition-colors"
                                                    title="Editar usuario"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar usuario"
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {editingUser && (
                <EditProfileModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    user={editingUser}
                    onUpdate={fetchUsers}
                />
            )}
        </div>
    );
}
