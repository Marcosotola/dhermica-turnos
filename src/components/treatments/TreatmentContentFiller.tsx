'use client';

import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Treatment } from '@/lib/types/treatment';
import { getPendingTreatmentContent, applyPendingTreatmentContent } from '@/lib/firebase/treatments';
import { Button } from '@/components/ui/Button';

interface TreatmentContentFillerProps {
    treatments: Treatment[];
    onDone: () => void;
}

// Aviso para el personal: completa la información faltante de los tratamientos con el
// contenido sugerido. Desaparece solo cuando ya no queda nada por completar.
export function TreatmentContentFiller({ treatments, onDone }: TreatmentContentFillerProps) {
    const [saving, setSaving] = useState(false);
    const pending = getPendingTreatmentContent(treatments);
    if (pending.length === 0) return null;

    const handleApply = async () => {
        setSaving(true);
        try {
            const count = await applyPendingTreatmentContent(treatments);
            toast.success(`${count} tratamientos completados`);
            onDone();
        } catch (error) {
            console.error('Error completing treatments:', error);
            toast.error('No se pudo completar la información');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-4 md:p-6 mb-8 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
                <p className="font-bold text-amber-900">
                    {pending.length} tratamientos tienen información incompleta
                </p>
                <p className="text-sm text-amber-800">
                    Se completan descripción, beneficios, contraindicaciones y cuidados que estén vacíos. Lo que ya cargaste no se modifica y después podés editar cualquiera.
                </p>
            </div>
            <Button
                onClick={handleApply}
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-600 border-none rounded-2xl py-3 px-6 text-white"
            >
                <Wand2 className="w-5 h-5 mr-2" /> {saving ? 'Completando...' : 'Completar'}
            </Button>
        </div>
    );
}
