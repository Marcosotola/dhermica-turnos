'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Check, Loader2 } from 'lucide-react';
import { getAllUsers } from '@/lib/firebase/users';
import { UserProfile } from '@/lib/types/user';

interface ClientNameAutocompleteProps {
    value: string;
    clientId?: string;
    onChange: (name: string, clientId?: string) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    id?: string;
}

export function ClientNameAutocomplete({
    value,
    clientId,
    onChange,
    placeholder = 'Nombre del cliente',
    label,
    required = false,
    id,
}: ClientNameAutocompleteProps) {
    const [clients, setClients] = useState<UserProfile[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLinked, setIsLinked] = useState(!!clientId);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cargar clientes registrados una sola vez
    useEffect(() => {
        setLoadingClients(true);
        getAllUsers()
            .then(users => setClients(users.filter(u => u.role === 'client' || !u.role)))
            .catch(() => {})
            .finally(() => setLoadingClients(false));
    }, []);

    // Filtrar sugerencias al escribir
    useEffect(() => {
        if (!value.trim() || value.length < 2) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }
        const q = value.toLowerCase();
        const matches = clients
            .filter(c => c.fullName?.toLowerCase().includes(q))
            .slice(0, 6);
        setSuggestions(matches);
        setShowDropdown(matches.length > 0);
    }, [value, clients]);

    // Cerrar al click externo
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsLinked(false);
        onChange(e.target.value, undefined);
    };

    const handleSelect = (client: UserProfile) => {
        setIsLinked(true);
        setShowDropdown(false);
        onChange(client.fullName, client.uid);
    };

    return (
        <div ref={containerRef} className="relative">
            {label && (
                <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">
                    {label}{required && ' *'}
                </label>
            )}
            <div className="relative">
                <input
                    id={id}
                    type="text"
                    value={value}
                    onChange={handleInput}
                    onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                    placeholder={placeholder}
                    required={required}
                    autoComplete="off"
                    className={`w-full text-sm border rounded-xl px-3 py-2 pr-8 bg-white focus:outline-none text-gray-900 transition-colors ${
                        isLinked
                            ? 'border-teal-400 focus:border-teal-500'
                            : 'border-gray-200 focus:border-teal-400'
                    }`}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {loadingClients ? (
                        <Loader2 className="w-3.5 h-3.5 text-gray-300 animate-spin" />
                    ) : isLinked ? (
                        <Check className="w-3.5 h-3.5 text-teal-500" />
                    ) : (
                        <User className="w-3.5 h-3.5 text-gray-300" />
                    )}
                </div>
            </div>

            {isLinked && clientId && (
                <p className="text-[10px] text-teal-600 mt-0.5 font-medium">Cliente registrado vinculado</p>
            )}

            {showDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {suggestions.map(client => (
                        <button
                            key={client.uid}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); handleSelect(client); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-teal-50 transition-colors text-left"
                        >
                            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                <span className="text-teal-700 text-xs font-bold">
                                    {client.fullName?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-gray-800 truncate">{client.fullName}</span>
                                {client.phone && (
                                    <span className="text-[10px] text-gray-400 truncate">{client.phone}</span>
                                )}
                            </div>
                        </button>
                    ))}
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400">O seguí escribiendo para ingresar nombre sin registrar</p>
                    </div>
                </div>
            )}
        </div>
    );
}
