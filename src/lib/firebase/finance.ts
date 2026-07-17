import { getSalesByDateRange } from './sales';
import { getAppointmentsByDateRange, getAppointmentsByProfessionalId } from './appointments';
import { getRentalsByDateRange } from './rentals';
import { getAparatoSessionsByDateRange } from './aparatos';
import { getEgresosByDateRange, getCommissionPaymentEgresos } from './egresos';
import { getProfessionals } from './professionals';
import { getGiftCardsByDateRange } from './giftCards';
import { Appointment } from '../types/appointment';
import { Sale } from '../types/sale';
import { Rental } from '../types/rental';
import { AparatoSession } from '../types/aparato';
import { Egreso } from '../types/egreso';
import { Professional } from '../types/professional';
import { GiftCard } from '../types/giftCard';
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
    referenceType?: 'appointment' | 'egreso' | 'sale' | 'rental' | 'commission' | 'gift_card';
    isPending?: boolean;
}

export interface FinanceOverview {
    totalIncome: number;
    totalServiceIncome: number;
    totalProductIncome: number;
    totalRentalIncome: number;
    totalAparatoIncome: number;
    totalPartialIncome: number;
    totalGiftCardIncome: number;
    totalEgresos: number;
    totalProfCommissions: number;
    totalEgresosGeneral: number;
    saldo: number;
    egresosByCategory: Record<string, number>;
    byMethod: Record<string, number>;
    incomeByMethodDetailed: Record<string, number>;
    egresosByMethod: Record<string, number>;
    byProfessional: Record<string, {
        serviceIncome: number;
        aparatoDayServiceIncome: number;
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

function resolveMethodKey(method: string, bankAccount?: string | null): string {
    if (method === 'transfer') return bankAccount === 'cuenta2' ? 'cuenta2' : 'cuenta1';
    return method || 'cash';
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Fetches appointments in range PLUS upcoming ones (up to 60 days ahead) so that
// pre-payments (señas paid before the appointment date) appear in the correct cash period.
async function fetchAppointmentsForFinance(
    startDate: string,
    endDate: string,
    targetProfessionalId?: string
): Promise<Appointment[]> {
    const lookForwardEnd = addDays(endDate, 60);

    if (targetProfessionalId) {
        const all = await getAppointmentsByProfessionalId(targetProfessionalId);
        return all.filter(a => a.date >= startDate && a.date <= lookForwardEnd);
    }

    const [base, future] = await Promise.all([
        getAppointmentsByDateRange(startDate, endDate),
        getAppointmentsByDateRange(addDays(endDate, 1), lookForwardEnd),
    ]);

    const seenIds = new Set(base.map(a => a.id));
    return [...base, ...future.filter(a => !seenIds.has(a.id))];
}

export async function getFinanceOverview(startDate: string, endDate: string, targetProfessionalId?: string): Promise<FinanceOverview> {
    const [appointments, sales, rentals, aparatos, egresos, commissionPayments, giftCards, allProfessionals, admins, secretaries, promotors, profUsers] = await Promise.all([
        fetchAppointmentsForFinance(startDate, endDate, targetProfessionalId).catch(() => [] as Appointment[]),
        getSalesByDateRange(startDate, endDate).catch(() => [] as Sale[]),
        getRentalsByDateRange(startDate, endDate).catch(() => [] as Rental[]),
        getAparatoSessionsByDateRange(startDate, endDate).catch(() => [] as AparatoSession[]),
        getEgresosByDateRange(startDate, endDate).catch(() => [] as Egreso[]),
        getCommissionPaymentEgresos().catch(() => [] as Egreso[]),
        getGiftCardsByDateRange(startDate, endDate).catch(() => [] as GiftCard[]),
        getProfessionals().catch(() => [] as Professional[]),
        getUsersByRole('admin').catch(() => []),
        getUsersByRole('secretary').catch(() => []),
        getUsersByRole('promotor').catch(() => []),
        getUsersByRole('professional').catch(() => [])
    ]);

    const overview: FinanceOverview = {
        totalIncome: 0,
        totalServiceIncome: 0,
        totalProductIncome: 0,
        totalRentalIncome: 0,
        totalAparatoIncome: 0,
        totalPartialIncome: 0,
        totalGiftCardIncome: 0,
        totalEgresos: 0,
        totalProfCommissions: 0,
        totalEgresosGeneral: 0,
        saldo: 0,
        egresosByCategory: {},
        byMethod: { cash: 0, transfer: 0, debit: 0, credit: 0, qr: 0 },
        incomeByMethodDetailed: { cash: 0, cuenta1: 0, cuenta2: 0, debit: 0, credit: 0, qr: 0 },
        egresosByMethod: { cash: 0, cuenta1: 0, cuenta2: 0, debit: 0, credit: 0, qr: 0 },
        byProfessional: {},
        byProduct: {},
        movements: []
    };

    const idToName: Record<string, string> = {};
    const nameToProfessional: Record<string, Professional> = {};

    allProfessionals.forEach(p => {
        const nameKey = p.name.trim();
        idToName[p.id] = nameKey;
        if (p.userId) idToName[p.userId] = nameKey;
        idToName[nameKey] = nameKey;
        nameToProfessional[nameKey] = p;
        
        if (!overview.byProfessional[nameKey]) {
            overview.byProfessional[nameKey] = {
                serviceIncome: 0, aparatoDayServiceIncome: 0, productIncome: 0, rentalIncome: 0, aparatoIncome: 0,
                serviceCommission: 0, productCommission: 0, rentalCommission: 0, aparatoFee: 0,
                totalCommission: 0, name: nameKey, userId: p.userId
            };
        }
    });

    [...admins, ...secretaries, ...promotors].forEach(u => {
        const nameKey = u.fullName.trim();
        if (u.uid) idToName[u.uid] = nameKey;
        if (!overview.byProfessional[nameKey]) {
            overview.byProfessional[nameKey] = {
                serviceIncome: 0, aparatoDayServiceIncome: 0, productIncome: 0, rentalIncome: 0, aparatoIncome: 0,
                serviceCommission: 0, productCommission: 0, rentalCommission: 0, aparatoFee: 0,
                totalCommission: 0, name: nameKey, userId: u.uid
            };
        }
    });

    // Ensure professional users whose UID isn't already mapped (no userId in professionals collection)
    // can still be attributed rentals and sales commissions
    profUsers.forEach(u => {
        if (!u.uid || idToName[u.uid]) return;
        const nameKey = u.fullName.trim();
        idToName[u.uid] = nameKey;
        if (!overview.byProfessional[nameKey]) {
            overview.byProfessional[nameKey] = {
                serviceIncome: 0, aparatoDayServiceIncome: 0, productIncome: 0, rentalIncome: 0, aparatoIncome: 0,
                serviceCommission: 0, productCommission: 0, rentalCommission: 0, aparatoFee: 0,
                totalCommission: 0, name: nameKey, userId: u.uid
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
        const status = (apt.status || '').toLowerCase();
        const isCompleted = status === 'completed' || status === 'realizado';
        const isAptInDateRange = apt.date >= startDate && apt.date <= endDate;

        const paymentsArray = (apt.payments || []);
        const totalPaid = paymentsArray.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const actualPrice = Number(apt.price) || totalPaid;

        if (isCompleted && paymentsArray.length > 0) {
            paymentsArray.forEach(p => {
                const pDate = (p.date || '').substring(0, 10);
                if (!pDate || pDate < startDate || pDate > endDate) return;
                // Gift cards and client credits are pre-collected — skip to avoid double-counting
                if (p.method === 'gift_card' || p.method === 'client_credit') return;
                const isSeña = p.label === 'Seña';
                const isParcial = p.label === 'Pago Parcial';
                const isPreApt = pDate < apt.date;
                const category = isSeña ? 'Seña' : isParcial ? 'Parcial' : 'Servicio';
                allMovements.push({
                    id: `pay_${apt.id}_${p.id || pDate}`,
                    date: pDate,
                    type: 'ingreso',
                    category,
                    description: `${apt.clientName} - ${apt.treatment}${isPreApt ? ` (turno ${apt.date.split('-').reverse().join('/')})` : ''}`,
                    amount: Number(p.amount) || 0,
                    method: p.method,
                    bankAccount: p.bankAccount,
                    referenceId: apt.id,
                    referenceType: 'appointment',
                });
            });
        } else if (isCompleted && isAptInDateRange) {
            // Legacy: turno sin array de pagos — usar fecha del turno
            const amount = actualPrice;
            if (amount > 0) {
                allMovements.push({
                    id: `apt_service_${apt.id}`,
                    date: apt.date,
                    type: 'ingreso',
                    category: 'Servicio',
                    description: `${apt.clientName} - ${apt.treatment}`,
                    amount,
                    method: apt.paymentMethod || 'cash',
                    bankAccount: (apt as any).bankAccount || null,
                    referenceId: apt.id,
                    referenceType: 'appointment',
                });
            }
        }

        // COMISIONES: Sobre el precio total cuando el turno cae en el rango, sin importar cuándo pagó el cliente
        if (isAptInDateRange && isCompleted && actualPrice > 0) {
            const profName = apt.professionalId ? (idToName[apt.professionalId] || apt.professionalId) : null;
            if (profName && overview.byProfessional[profName]) {
                const prof = nameToProfessional[profName];
                const profData = overview.byProfessional[profName];

                profData.serviceIncome += actualPrice;

                const hasAparato = aparatoDays.has(`${profName}|${apt.date}`);

                if (hasAparato) {
                    profData.aparatoDayServiceIncome += actualPrice;
                }

                // En días de aparato, solo se suma commissionFixedOverride si se fijó al cerrar el turno
                if (hasAparato) {
                    if (apt.commissionFixedOverride !== undefined && apt.commissionFixedOverride !== null && apt.commissionFixedOverride > 0) {
                        profData.serviceCommission += apt.commissionFixedOverride;
                    }
                } else {
                    // Prioridad: monto fijo override > modo fixed del profesional > porcentaje override > porcentaje del profesional
                    if (apt.commissionFixedOverride !== undefined && apt.commissionFixedOverride !== null && apt.commissionFixedOverride > 0) {
                        profData.serviceCommission += apt.commissionFixedOverride;
                    } else if (prof?.serviceCommissionMode === 'fixed' && prof.professionalPrices?.length && apt.treatments?.length) {
                        let fixedTotal = 0;
                        for (const t of apt.treatments) {
                            const match = prof.professionalPrices.find(
                                pp => pp.treatmentId === t.treatmentId
                                    && (pp.zone || '') === (t.zone || '')
                                    && (pp.gender || 'both') === (t.gender || 'both')
                            );
                            if (match) fixedTotal += match.price;
                        }
                        if (fixedTotal > 0) {
                            profData.serviceCommission += fixedTotal;
                        } else {
                            const pct = apt.commissionPercentageOverride !== undefined && apt.commissionPercentageOverride !== null
                                ? apt.commissionPercentageOverride
                                : (prof?.serviceCommissionPercentage ?? (prof as any)?.commissionPercentage ?? 0);
                            if (pct > 0) profData.serviceCommission += (actualPrice * pct) / 100;
                        }
                    } else {
                        const commissionPct = apt.commissionPercentageOverride !== undefined && apt.commissionPercentageOverride !== null
                            ? apt.commissionPercentageOverride
                            : (prof?.serviceCommissionPercentage ?? (prof as any)?.commissionPercentage ?? 0);

                        if (commissionPct > 0) {
                            profData.serviceCommission += (actualPrice * commissionPct) / 100;
                        }
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
                    referenceId: sale.id,
                    referenceType: 'sale',
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
                referenceId: sale.id,
                referenceType: 'sale',
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
                    referenceId: rental.id,
                    referenceType: 'rental',
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
                referenceId: rental.id,
                referenceType: 'rental',
            });
        }

        const sellerName = rental.sellerId ? (idToName[rental.sellerId] || rental.sellerId) : null;
        if (sellerName && overview.byProfessional[sellerName]) {
            overview.byProfessional[sellerName].rentalIncome += amount;
            overview.byProfessional[sellerName].rentalCommission += Number(rental.commission) || 0;
        }
    });

    // 5. Gift Cards vendidas (compra = ingreso real en la fecha de venta)
    giftCards.forEach(gc => {
        const gcDate = gc.createdAt.toISOString().substring(0, 10);
        if (gcDate < startDate || gcDate > endDate) return;
        allMovements.push({
            id: `gc_${gc.id}`,
            date: gcDate,
            type: 'ingreso',
            category: 'Gift Card',
            description: `Gift Card ${gc.code}${gc.purchaserName ? ` — ${gc.purchaserName}` : ''}`,
            amount: gc.originalAmount,
            method: gc.purchaseMethod || 'cash',
            bankAccount: gc.purchaseMethod === 'transfer' ? (gc.bankAccount ?? 'cuenta1') : null,
            referenceId: gc.id,
            referenceType: 'gift_card',
        });
    });

    // 6. Egresos Manuales
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
            bankAccount: e.payments?.[0]?.bankAccount || e.bankAccount,
            referenceType: 'egreso',
        });
    });

    // 6. Consolidar Comisiones
    overview.totalProfCommissions = 0;
    
    // Calcular cuánto de los fees de aparatos ya está en 'egresos' (manuales)
    // Usar MAX por profesional+día (igual que aparatoFeesByDay) para evitar sobre-deducción
    const registeredAparatoFeesByDay: Record<string, number> = {};
    aparatos.forEach(s => {
        if (s.expenseId && s.fixedFee) {
            const profName = idToName[s.professionalId] || s.professionalId;
            const key = `${profName}|${s.date}`;
            const fee = Number(s.fixedFee);
            if (fee > (registeredAparatoFeesByDay[key] || 0)) {
                registeredAparatoFeesByDay[key] = fee;
            }
        }
    });
    const registeredAparatoFees: Record<string, number> = {};
    Object.entries(registeredAparatoFeesByDay).forEach(([key, fee]) => {
        const [profName] = key.split('|');
        registeredAparatoFees[profName] = (registeredAparatoFees[profName] || 0) + fee;
    });

    // Períodos ya liquidados para cada profesional (el % es solo referencia: una vez liquidado
    // el período, el monto pactado queda fijo y no debe generar saldo pendiente ni a favor,
    // sin importar si se pagó de más o de menos respecto del cálculo).
    const liquidatedPeriods = new Set<string>();
    commissionPayments.forEach(e => {
        if (!e.professionalId || !e.commissionPeriodStart || !e.commissionPeriodEnd) return;
        liquidatedPeriods.add(`${e.professionalId}|${e.commissionPeriodStart}|${e.commissionPeriodEnd}`);
    });

    Object.values(overview.byProfessional).forEach((data) => {
        const alreadyPaid = registeredAparatoFees[data.name] || 0;
        const pendingAparatoFee = Math.max(0, data.aparatoFee - alreadyPaid);

        // totalCommission = total ganado (para mostrar en el desglose de comisiones, es siempre la referencia calculada)
        data.totalCommission = data.serviceCommission + data.productCommission + data.rentalCommission + data.aparatoFee;

        const prof = nameToProfessional[data.name];
        const isLiquidated = prof ? liquidatedPeriods.has(`${prof.id}|${startDate}|${endDate}`) : false;

        // Si ya se liquidó este período, el monto pactado queda fijo: no queda pendiente.
        const virtualCommissionToPay = isLiquidated
            ? 0
            : Math.max(0, data.serviceCommission + data.productCommission + data.rentalCommission + pendingAparatoFee);

        if (virtualCommissionToPay > 0) {
            overview.totalProfCommissions += virtualCommissionToPay;
            allMovements.push({
                id: `comm_${data.name.replace(/\s+/g, '_')}`,
                date: endDate,
                type: 'egreso',
                category: 'sueldos',
                description: `Comisión (Pendiente): ${data.name}`,
                method: 'cash',
                amount: virtualCommissionToPay,
                referenceId: prof?.id,
                referenceType: 'commission',
                isPending: true,
            });
        }
    });

    // 7. Totales Finales
    // Las comisiones pendientes (isPending) son proyecciones de lo que se le debe a cada
    // profesional: todavía no salió plata de la caja, así que no deben sumar a los totales
    // de egresos ni afectar el saldo hasta que se liquiden (createEgreso con isCommissionPayment).
    allMovements.forEach(m => {
        if (m.type === 'ingreso') {
            overview.totalIncome += m.amount;
            if (m.category === 'Servicio' || m.category === 'Cobro') overview.totalServiceIncome += m.amount;
            else if (m.category === 'Seña' || m.category === 'Parcial') overview.totalPartialIncome += m.amount;
            else if (m.category === 'Productos') overview.totalProductIncome += m.amount;
            else if (m.category === 'Alquiler') overview.totalRentalIncome += m.amount;
            else if (m.category === 'Aparato') overview.totalAparatoIncome += m.amount;
            else if (m.category === 'Gift Card') overview.totalGiftCardIncome += m.amount;
            if (m.method && overview.byMethod[m.method] !== undefined) overview.byMethod[m.method] += m.amount;
            const mKeyInc = resolveMethodKey(m.method, m.bankAccount);
            if (mKeyInc in overview.incomeByMethodDetailed) overview.incomeByMethodDetailed[mKeyInc] += m.amount;
        } else if (!m.isPending) {
            overview.totalEgresos += m.amount;
            if (m.category) overview.egresosByCategory[m.category] = (overview.egresosByCategory[m.category] || 0) + m.amount;
            const mKeyExp = resolveMethodKey(m.method, m.bankAccount);
            if (mKeyExp in overview.egresosByMethod) overview.egresosByMethod[mKeyExp] += m.amount;
            if (m.method && overview.byMethod[m.method] !== undefined) overview.byMethod[m.method] -= m.amount;
        }
    });

    overview.totalEgresosGeneral = overview.totalEgresos;
    overview.saldo = overview.totalIncome - overview.totalEgresosGeneral;

    allMovements.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    let runningBalance = 0;
    overview.movements = allMovements.map(m => {
        if (m.isPending) return { ...m, balance: runningBalance };
        if (m.type === 'ingreso') runningBalance += m.amount;
        else runningBalance -= m.amount;
        return { ...m, balance: runningBalance };
    }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    return overview;
}
