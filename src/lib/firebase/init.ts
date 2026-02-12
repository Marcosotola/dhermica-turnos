import { createProfessional, getProfessionals } from '@/lib/firebase/professionals';
import { DEFAULT_PROFESSIONALS } from '@/lib/types/professional';

/**
 * Inicializa los profesionales por defecto en Firebase
 * Solo los crea si no existen
 */
export async function initializeProfessionals() {
    try {
        const existing = await getProfessionals();

        if (existing.length > 0) {
            console.log('Profesionales ya inicializados');
            return;
        }

        console.log('Inicializando profesionales por defecto...');

        for (const prof of DEFAULT_PROFESSIONALS) {
            await createProfessional(prof);
            console.log(`✓ Profesional creado: ${prof.name}`);
        }

        console.log('✓ Profesionales inicializados exitosamente');
    } catch (error) {
        console.error('Error inicializando profesionales:', error);
        throw error;
    }
}
