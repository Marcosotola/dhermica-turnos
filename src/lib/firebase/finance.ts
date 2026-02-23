import { getSalesByDateRange, getSalesByProfessional } from './sales';
import { getAppointmentsByDateRange, getAppointmentsByProfessional } from './appointments';
import { getRentalsByDateRange } from './rentals';
import { getAparatoSessionsByDateRange } from './aparatos';
import { getEgresosByDateRange } from './egresos';
import { getActiveProfessionals } from './professionals';
import { Appointment } from '../types/appointment';
import { Sale } from '../types/sale';
import { Rental } from '../types/rental';
import { AparatoSession } from '../types/aparato';
import { Egreso } from '../types/egreso';
import { Professional } from '../types/professional';

export interface FinanceOverview {
    totalIncome: number;
    totalServiceIncome: number;
    totalProductIncome: number;
    totalRentalIncome: number;
    totalAparatoIncome: number;
    totalEgresos: number;
    totalProfCommissions: number;
    totalEgresosGeneral: number;
    saldo: number;
    egresosByCategory: Record<string, number>;
    byMethod: Record<string, number>;
    byProfessional: Record<string, {
        serviceIncome: number;
        productIncome: number;
        rentalIncome: number;
        aparatoIncome: number;
        serviceCommission: number;
        productCommission: number;
        rentalCommission: number;
        aparatoFee: number;
        totalCommission: number;
        name: string;
        userId?: string;
    }>;
    byProduct: Record<string, {
        name: string;
        quantity: number;
        income: number;
    }>;
}

import { getUsersByRole } from './users';

/**
 * Calcula el balance financiero para un rango de fechas
 */
export async function getFinanceOverview(startDate: string, endDate: string): Promise<FinanceOverview> {
    const [appointments, sales, rentals, aparatos, egresos, professionals, admins, secretaries, promotors] = await Promise.all([
        getAppointmentsByDateRange(startDate, endDate),
        getSalesByDateRange(startDate, endDate),
        getRentalsByDateRange(startDate, endDate),
        getAparatoSessionsByDateRange(startDate, endDate),
        getEgresosByDateRange(startDate, endDate),
        getActiveProfessionals(),
        getUsersByRole('admin'),
        getUsersByRole('secretary'),
        getUsersByRole('promotor')
    ]);

    const overview: FinanceOverview = {
        totalIncome: 0,
        totalServiceIncome: 0,
        totalProductIncome: 0,
        totalRentalIncome: 0,
        totalAparatoIncome: 0,
        totalEgresos: 0,
        totalProfCommissions: 0,
        totalEgresosGeneral: 0,
        saldo: 0,
        egresosByCategory: {},
        byMethod: { cash: 0, transfer: 0, debit: 0, credit: 0, qr: 0 },
        byProfessional: {},
        byProduct: {}
    };

    // Mapeo de ID de profesional a UserId para normalización
    const profIdToUid: Record<string, string> = {};
    professionals.forEach(p => {
        if (p.userId) profIdToUid[p.id] = p.userId;
    });

    // Inicializar personal (Profesionales y Staff) por su UID
    // Esto asegura que las ventas y alquileres se sumen a la misma persona
    professionals.forEach(p => {
        const key = p.userId || p.id;
        overview.byProfessional[key] = {
            serviceIncome: 0,
            productIncome: 0,
            rentalIncome: 0,
            aparatoIncome: 0,
            serviceCommission: 0,
            productCommission: 0,
            rentalCommission: 0,
            aparatoFee: 0,
            totalCommission: 0,
            name: p.name,
            userId: p.userId
        };
    });

    [...admins, ...secretaries, ...promotors].forEach(u => {
        if (!overview.byProfessional[u.uid]) {
            overview.byProfessional[u.uid] = {
                serviceIncome: 0,
                productIncome: 0,
                rentalIncome: 0,
                aparatoIncome: 0,
                serviceCommission: 0,
                productCommission: 0,
                rentalCommission: 0,
                aparatoFee: 0,
                totalCommission: 0,
                name: u.fullName,
                userId: u.uid
            };
        }
    });

    // Pre-construir un Set: 'professionalId|YYYY-MM-DD' para días con aparato
    // En esos días el profesional cobra el monto fijo, no comisión por porcentaje
    const aparatoDays = new Set<string>();
    aparatos.forEach((session: AparatoSession) => {
        aparatoDays.add(`${session.professionalId}|${session.date}`);
    });

    // Procesar Turnos
    appointments.forEach((apt: Appointment) => {
        const appointmentPrice = Number(apt.price) || 0;
        if (appointmentPrice > 0) {
            overview.totalIncome += appointmentPrice;
            overview.totalServiceIncome += appointmentPrice;
            if (apt.paymentMethod) {
                overview.byMethod[apt.paymentMethod] = (overview.byMethod[apt.paymentMethod] || 0) + appointmentPrice;
            }

            // Mapear ID de profesional a UID para el desglose
            const targetUid = apt.professionalId ? (profIdToUid[apt.professionalId] || apt.professionalId) : null;
            if (targetUid && overview.byProfessional[targetUid]) {
                const prof = professionals.find((p: Professional) => p.id === apt.professionalId);
                const profData = overview.byProfessional[targetUid];
                profData.serviceIncome += appointmentPrice;

                // Solo calcular comisión si el profesional NO tiene sesión de aparato ese día
                const aptDate = apt.date; // formato YYYY-MM-DD
                const hasAparato = aparatoDays.has(`${apt.professionalId}|${aptDate}`);
                if (!hasAparato && prof?.serviceCommissionPercentage) {
                    profData.serviceCommission += (appointmentPrice * prof.serviceCommissionPercentage) / 100;
                }
            }
        }
    });

    // Procesar Ventas
    sales.forEach((sale: Sale) => {
        const saleAmount = Number(sale.totalAmount) || 0;
        overview.totalIncome += saleAmount;
        overview.totalProductIncome += saleAmount;

        // Sumar al ranking por producto
        if (!overview.byProduct[sale.productId]) {
            overview.byProduct[sale.productId] = {
                name: sale.productName,
                quantity: 0,
                income: 0
            };
        }
        overview.byProduct[sale.productId].quantity += (Number(sale.quantity) || 0);
        overview.byProduct[sale.productId].income += saleAmount;

        if (sale.paymentMethod) {
            overview.byMethod[sale.paymentMethod] = (overview.byMethod[sale.paymentMethod] || 0) + saleAmount;
        }

        // Mapear soldById a UID si es necesario
        const targetUid = sale.soldById ? (profIdToUid[sale.soldById] || sale.soldById) : null;
        if (targetUid && overview.byProfessional[targetUid]) {
            const profData = overview.byProfessional[targetUid];
            profData.productIncome += saleAmount;

            // Usar comisión manual si existe, si no calcular por porcentaje (datos legacy)
            if (sale.commission !== undefined && sale.commission !== null) {
                profData.productCommission += Number(sale.commission) || 0;
            } else {
                const prof = professionals.find((p: Professional) => p.id === sale.soldById || p.userId === targetUid);
                if (prof?.productCommissionPercentage) {
                    profData.productCommission += (saleAmount * prof.productCommissionPercentage) / 100;
                }
            }
        }
    });

    // Procesar Alquileres
    rentals.forEach((rental: Rental) => {
        const rentalPrice = Number(rental.price) || 0;
        const rentalCommission = Number(rental.commission) || 0;

        overview.totalIncome += rentalPrice;
        overview.totalRentalIncome += rentalPrice;

        if (rental.paymentMethod) {
            overview.byMethod[rental.paymentMethod] = (overview.byMethod[rental.paymentMethod] || 0) + rentalPrice;
        }

        // rentals.sellerId ya es un UID (uid)
        if (rental.sellerId && overview.byProfessional[rental.sellerId]) {
            overview.byProfessional[rental.sellerId].rentalIncome += rentalPrice;
            overview.byProfessional[rental.sellerId].rentalCommission += rentalCommission;
        }
    });

    // Procesar Aparatos
    // El fee NO se suma al ingreso del local — es lo que cobra el profesional.
    // El ingreso del local ya está en totalServiceIncome a través de los turnos del día.
    aparatos.forEach((session: AparatoSession) => {
        const fee = Number(session.fixedFee) || 0;
        // Solo registrar el fee como ganancia del profesional
        const targetUid = profIdToUid[session.professionalId] || session.professionalId;
        if (targetUid && overview.byProfessional[targetUid]) {
            overview.byProfessional[targetUid].aparatoIncome += fee;
            overview.byProfessional[targetUid].aparatoFee += fee;
        }
    });

    // Calcular totales de comisiones
    Object.values(overview.byProfessional).forEach(data => {
        data.totalCommission = data.serviceCommission + data.productCommission + data.rentalCommission + data.aparatoFee;
    });

    // Procesar Egresos manuales
    (egresos as Egreso[]).forEach((e) => {
        const amount = Number(e.amount) || 0;
        overview.totalEgresos += amount;
        overview.egresosByCategory[e.category] = (overview.egresosByCategory[e.category] || 0) + amount;
    });

    // Sumar comisiones de profesionales como egreso del local
    overview.totalProfCommissions = Object.values(overview.byProfessional).reduce(
        (sum, d) => sum + d.totalCommission,
        0
    );

    // Calcular totales finales
    overview.totalEgresosGeneral = overview.totalEgresos + overview.totalProfCommissions;
    overview.saldo = overview.totalIncome - overview.totalEgresosGeneral;

    return overview;
}
