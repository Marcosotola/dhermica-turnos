import { useEffect } from 'react';
import { useProfessionalsStore } from '@/store/professionals';
import { getActiveProfessionals } from '@/lib/firebase/professionals';

export function useProfessionals() {
    const { professionals, setProfessionals } = useProfessionalsStore();

    useEffect(() => {
        loadProfessionals();
    }, []);

    const loadProfessionals = async () => {
        try {
            const data = await getActiveProfessionals();
            setProfessionals(data);
        } catch (error) {
            console.error('Error loading professionals:', error);
        }
    };

    return { professionals, reload: loadProfessionals };
}
