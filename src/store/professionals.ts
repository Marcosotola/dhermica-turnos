import { create } from 'zustand';
import { Professional } from '@/lib/types/professional';

interface ProfessionalsStore {
    professionals: Professional[];
    setProfessionals: (professionals: Professional[]) => void;
    addProfessional: (professional: Professional) => void;
    updateProfessional: (id: string, data: Partial<Professional>) => void;
    removeProfessional: (id: string) => void;
}

export const useProfessionalsStore = create<ProfessionalsStore>((set) => ({
    professionals: [],
    setProfessionals: (professionals) => set({ professionals }),
    addProfessional: (professional) =>
        set((state) => ({
            professionals: [...state.professionals, professional].sort((a, b) => a.order - b.order),
        })),
    updateProfessional: (id, data) =>
        set((state) => ({
            professionals: state.professionals.map((p) =>
                p.id === id ? { ...p, ...data } : p
            ),
        })),
    removeProfessional: (id) =>
        set((state) => ({
            professionals: state.professionals.filter((p) => p.id !== id),
        })),
}));
