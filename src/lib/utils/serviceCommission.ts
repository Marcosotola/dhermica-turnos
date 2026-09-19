import { Appointment } from '../types/appointment';
import { Professional } from '../types/professional';

// Comisión de un turno por servicios. Prioridad: monto fijo del turno > modo "monto fijo" del
// profesional > % del turno > % del profesional. Si el resultado es 0, devuelve el motivo
// para que la secretaria pueda corregir la configuración en vez de ver un $0 sin explicación.
export function computeServiceCommission(
    apt: Appointment,
    prof: Professional | undefined,
    actualPrice: number
): { amount: number; zeroReason: string | null } {
    if (apt.commissionFixedOverride !== undefined && apt.commissionFixedOverride !== null && apt.commissionFixedOverride > 0) {
        return { amount: apt.commissionFixedOverride, zeroReason: null };
    }

    let modeReason = 'La comisión configurada para el profesional es 0%';

    if (prof?.serviceCommissionMode === 'fixed') {
        if (!prof.professionalPrices?.length) {
            modeReason = 'Comisión por monto fijo pero el profesional no tiene precios cargados en su configuración';
        } else if (!apt.treatments?.length) {
            modeReason = 'Comisión por monto fijo pero el turno no tiene tratamientos del catálogo (solo texto libre)';
        } else {
            let fixedTotal = 0;
            const missing: string[] = [];
            for (const t of apt.treatments) {
                const match = prof.professionalPrices.find(
                    pp => pp.treatmentId === t.treatmentId
                        && (pp.zone || '') === (t.zone || '')
                        && (pp.gender || 'both') === (t.gender || 'both')
                );
                if (match) fixedTotal += match.price;
                else missing.push(`${t.name}${t.zone ? ` (${t.zone})` : ''}`);
            }
            if (fixedTotal > 0) return { amount: fixedTotal, zeroReason: null };
            modeReason = missing.length > 0
                ? `Comisión por monto fijo: falta el precio del profesional para ${missing.join(', ')}`
                : 'Comisión por monto fijo: el precio del profesional para este tratamiento está en $0';
        }
    }

    const hasPctOverride = apt.commissionPercentageOverride !== undefined && apt.commissionPercentageOverride !== null;
    const pct = hasPctOverride
        ? (apt.commissionPercentageOverride as number)
        : (prof?.serviceCommissionPercentage ?? (prof as any)?.commissionPercentage ?? 0);

    if (pct > 0) return { amount: (actualPrice * pct) / 100, zeroReason: null };

    const zeroReason = hasPctOverride
        ? 'El turno tiene un % de comisión personalizado en 0'
        : !prof
            ? 'El usuario no tiene ficha en Profesionales: no se conoce su % de comisión'
            : modeReason;
    return { amount: 0, zeroReason };
}
