import { getSalesByDateRange } from './sales';
import { getAppointmentsByDateRange } from './appointments';
import { getRentalsByDateRange } from './rentals';
import { getAparatoSessionsByDateRange } from './aparatos';
import { getEgresosByDateRange } from './egresos';
import { getProfessionals } from './professionals';
import { Appointment } from '../types/appointment';
import { Sale } from '../types/sale';
import { Rental } from '../types/rental';
import { AparatoSession } from '../types/aparato';
import { Egreso } from '../types/egreso';
import { Professional } from '../types/professional';
import { getUsersByRole } from './users';

export interface FinanceMovement {
    id: string;
    date: string;
    type: 'ingreso' | 'egreso';
    category: string;
    description: string;
    method: string;
    amount: number;
    bankAccount?: string | null;
    balance?: number;
    referenceId?: string;
}

export interface FinanceOverview {
    totalIncome: number;
    totalServiceIncome: number;
    totalProductIncome: number;
    totalRentalIncome: number;
    totalAparatoIncome: number;
    totalPartialIncome: number;
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
    movements: FinanceMovement[];
}

export async function getFinanceOverview(startDate: string, endDate: string): Promise<FinanceOverview> {
    const [appointments, sales, rentals, aparatos, egresos, allProfessionals, admins, secretaries, promotors] = await Promise.all([
        getAppointmentsByDateRange(startDate, endDate),
        getSalesByDateRange(startDate, endDate),
        getRentalsByDateRange(startDate, endDate),
        getAparatoSessionsByDateRange(startDate, endDate),
        getEgresosByDateRange(startDate, endDate),
        getProfessionals(),
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
        totalPartialIncome: 0,
        totalEgresos: 0,
        totalProfCommissions: 0,
        totalEgresosGeneral: 0,
        saldo: 0,
        egresosByCategory: {},
        byMethod: { cash: 0, transfer: 0, debit: 0, credit: 0, qr: 0 },
        byProfessional: {},
        byProduct: {},
        movements: []
    };

    const idToName: Record<string, string> = {};
    const nameToProfessional: Record<string, Professional> = {};

    allProfessionals.forEach(p => {
        idToName[p.id] = p.name;
        if (p.userId) idToName[p.userId] = p.name;
        nameToProfessional[p.name] = p;
        
        if (!overview.byProfessional[p.name]) {
            overview.byProfessional[p.name] = {
                serviceIncome: 0, productIncome: 0, rentalIncome: 0, aparatoIncome: 0,
                serviceCommission: 0, productCommission: 0, rentalCommission: 0, aparatoFee: 0,
                totalCommission: 0, name: p.name, userId: p.userId
            };
        }
    });

    [...admins, ...secretaries, ...promotors].forEach(u => {
        if (u.uid) idToName[u.uid] = u.fullName;
        if (!overview.byProfessional[u.fullName]) {
            overview.byProfessional[u.fullName] = {
                serviceIncome: 0, productIncome: 0, rentalIncome: 0, aparatoIncome: 0,
                serviceCommission: 0, productCommission: 0, rentalCommission: 0, aparatoFee: 0,
                totalCommission: 0, name: u.fullName, userId: u.uid
            };
        }
    });

    const aparatoFeesByDay: Record<string, number> = {};
    const aparatoDays = new Set<string>();

    aparatos.forEach((session: AparatoSession) => {
        const profName = idToName[session.professionalId] || session.professionalId;
        const key = `${profName}|${session.date}`;
        const fee = Number(session.fixedFee) || 0;
        
        if (fee > (aparatoFeesByDay[key] || 0)) {
            aparatoFeesByDay[key] = fee;
            aparatoDays.add(key);
        }
    });

    Object.entries(aparatoFeesByDay).forEach(([key, fee]) => {
        const [profName] = key.split('|');
        if (overview.byProfessional[profName]) {
            overview.byProfessional[profName].aparatoIncome += fee;
            overview.byProfessional[profName].aparatoFee += fee;
        }
    });

    const allMovements: FinanceMovement[] = [];

    // 2. Procesar Turnos
    appointments.forEach(apt => {
        const isCompleted = (apt.status as any) === 'completed' || (apt.status as any) === 'realizado';
        const isAptInDateRange = apt.date >= startDate && apt.date <= endDate;
        
        // PRECIO REAL: Buscar en el tope del turno o dentro de los pagos
        const paymentsArray = (apt.payments || []);
        const totalPaid = paymentsArray.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const paymentsInRange = paymentsArray.filter(p => p.date >= startDate && p.date <= endDate);
        const totalPaidInRange = paymentsInRange.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        
        // Si no hay precio arriba, usamos lo que se pagó en total
        const actualPrice = Number(apt.price) || (paymentsArray.length > 0 ? Number((paymentsArray[0] as any).price) || totalPaid : totalPaid);

        if (isAptInDateRange) {
            // Monto a mostrar hoy: si hubo pagos hoy usamos eso, si no el precio total si está pago/completo
            const amountToShow = totalPaidInRange > 0 ? totalPaidInRange : (apt.isPaid || isCompleted ? actualPrice : 0);
            const method = paymentsInRange.length > 0 ? paymentsInRange[0].method : (apt.paymentMethod || 'cash');
            const bankAccount = paymentsInRange.length > 0 ? paymentsInRange[0].bankAccount : ((apt as any).bankAccount || null);

            allMovements.push({
                id: `apt_service_${apt.id}`,
                date: apt.date,
                type: 'ingreso',
                category: 'Servicio',
                description: `${apt.clientName} - ${apt.treatment}`,
                amount: amountToShow,
                method,
                bankAccount,
                referenceId: apt.id
            });
        } else if (totalPaidInRange > 0) {
            // Pagos diferidos (pago hoy algo de otro día)
            paymentsInRange.forEach(p => {
                allMovements.push({
                    id: `apt_pay_${apt.id}_${p.id || Math.random()}`,
                    date: p.date,
                    type: 'ingreso',
                    category: p.label === 'Seña' ? 'Seña' : 'Cobro',
                    description: `Pago: ${apt.clientName} - ${apt.treatment}`,
                    amount: Number(p.amount) || 0,
                    method: p.method,
                    bankAccount: p.bankAccount,
                    referenceId: apt.id
                });
            });
        }

        // COMISIONES: Sobre el precio real detectado
        if (isAptInDateRange && isCompleted && actualPrice > 0) {
            const profName = apt.professionalId ? (idToName[apt.professionalId] || apt.professionalId) : null;
            if (profName && overview.byProfessional[profName]) {
                const prof = nameToProfessional[profName];
                const profData = overview.byProfessional[profName];
                profData.serviceIncome += actualPrice;
                
                const hasAparato = aparatoDays.has(`${profName}|${apt.date}`);
                if (!hasAparato) {
                    const commissionPct = apt.commissionPercentageOverride !== undefined && apt.commissionPercentageOverride !== null
                        ? apt.commissionPercentageOverride
                        : (prof?.serviceCommissionPercentage || (prof as any)?.commissionPercentage || 0);
                    
                    if (commissionPct > 0) {
                        profData.serviceCommission += (actualPrice * commissionPct) / 100;
                    }
                }
            }
        }
    });

    // 3. Ventas
    sales.forEach(sale => {
        const amount = Number(sale.totalAmount) || 0;
        
        if (sale.payments && sale.payments.length > 0) {
            sale.payments.forEach((p, idx) => {
                allMovements.push({
                    id: `${sale.id}_p${idx}`,
                    date: p.date || sale.date,
                    type: 'ingreso',
                    category: 'Productos',
                    description: `${sale.productName} (x${sale.quantity})`,
                    amount: Number(p.amount) || 0,
                    method: p.method,
                    bankAccount: p.bankAccount,
                    referenceId: sale.id
                });
            });
        } else {
            allMovements.push({
                id: sale.id,
                date: sale.date,
                type: 'ingreso',
                category: 'Productos',
                description: `${sale.productName} (x${sale.quantity})`,
                amount,
                method: sale.paymentMethod,
                bankAccount: sale.bankAccount,
                referenceId: sale.id
            });
        }

        const sellerName = sale.soldById ? (idToName[sale.soldById] || sale.soldById) : null;
        if (sellerName && overview.byProfessional[sellerName]) {
            overview.byProfessional[sellerName].productIncome += amount;
            if (sale.commission) {
                overview.byProfessional[sellerName].productCommission += Number(sale.commission) || 0;
            }
        }
    });

    // 4. Alquileres
    rentals.forEach(rental => {
        const amount = Number(rental.price) || 0;
        
        if (rental.payments && rental.payments.length > 0) {
            rental.payments.forEach((p, idx) => {
                allMovements.push({
                    id: `${rental.id}_p${idx}`,
                    date: p.date || rental.date,
                    type: 'ingreso',
                    category: 'Alquiler',
                    description: `Alquiler: ${rental.clientName}`,
                    amount: Number(p.amount) || 0,
                    method: p.method,
                    bankAccount: p.bankAccount,
                    referenceId: rental.id
                });
            });
        } else {
            allMovements.push({
                id: rental.id,
                date: rental.date,
                type: 'ingreso',
                category: 'Alquiler',
                description: `Alquiler: ${rental.clientName}`,
                amount,
                method: rental.paymentMethod,
                bankAccount: rental.bankAccount,
                referenceId: rental.id
            });
        }

        const sellerName = rental.sellerId ? (idToName[rental.sellerId] || rental.sellerId) : null;
        if (sellerName && overview.byProfessional[sellerName]) {
            overview.byProfessional[sellerName].rentalIncome += amount;
            overview.byProfessional[sellerName].rentalCommission += Number(rental.commission) || 0;
        }
    });

    // 5. Egresos Manuales
    egresos.forEach(e => {
        const amount = Number(e.amount) || 0;
        allMovements.push({
            id: e.id,
            date: e.date,
            type: 'egreso',
            category: e.category || 'Otros',
            description: e.description || 'Gasto general',
            amount,
            method: e.payments?.[0]?.method || e.paymentMethod || 'cash',
            bankAccount: e.payments?.[0]?.bankAccount || e.bankAccount
        });
    });

    // 6. Consolidar Comisiones
    overview.totalProfCommissions = 0;
    Object.values(overview.byProfessional).forEach((data) => {
        data.totalCommission = data.serviceCommission + data.productCommission + data.rentalCommission + data.aparatoFee;
        if (data.totalCommission > 0) {
            overview.totalProfCommissions += data.totalCommission;
            allMovements.push({
                id: `comm_${data.name.replace(/\s+/g, '_')}`,
                date: endDate,
                type: 'egreso',
                category: 'sueldos',
                description: `Comisión: ${data.name}`,
                method: 'cash',
                amount: data.totalCommission
            });
        }
    });

    // 7. Totales Finales
    allMovements.forEach(m => {
        if (m.type === 'ingreso') {
            overview.totalIncome += m.amount;
            if (m.category === 'Servicio' || m.category === 'Cobro') overview.totalServiceIncome += m.amount;
            else if (m.category === 'Seña' || m.category === 'Parcial') overview.totalPartialIncome += m.amount;
            else if (m.category === 'Productos') overview.totalProductIncome += m.amount;
            else if (m.category === 'Alquiler') overview.totalRentalIncome += m.amount;
            else if (m.category === 'Aparato') overview.totalAparatoIncome += m.amount;
            if (m.method && overview.byMethod[m.method] !== undefined) overview.byMethod[m.method] += m.amount;
        } else {
            if (!m.id.startsWith('comm_')) {
                overview.totalEgresos += m.amount;
                if (m.category) overview.egresosByCategory[m.category] = (overview.egresosByCategory[m.category] || 0) + m.amount;
            }
            if (m.method && overview.byMethod[m.method] !== undefined) overview.byMethod[m.method] -= m.amount;
        }
    });

    overview.totalEgresosGeneral = overview.totalEgresos + overview.totalProfCommissions;
    overview.saldo = overview.totalIncome - overview.totalEgresosGeneral;

    allMovements.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    let runningBalance = 0;
    overview.movements = allMovements.map(m => {
        if (m.type === 'ingreso') runningBalance += m.amount;
        else runningBalance -= m.amount;
        return { ...m, balance: runningBalance };
    }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    return overview;
}
