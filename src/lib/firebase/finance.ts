import { getSalesByDateRange } from './sales';
import { getAppointmentsByDateRange, getAppointmentsByProfessionalId } from './appointments';
import { getRentalsByDateRange } from './rentals';
import { getEgresosByDateRange, getCommissionPaymentEgresos } from './egresos';
import { getProfessionals } from './professionals';
import { getGiftCardsByDateRange } from './giftCards';
import { getAttendancesByDateRange } from './attendances';
import { Appointment } from '../types/appointment';
import { Sale } from '../types/sale';
import { Rental } from '../types/rental';
import { Egreso } from '../types/egreso';
import { Professional } from '../types/professional';
import { GiftCard } from '../types/giftCard';
import { Attendance } from '../types/attendance';
import { getUsersByRole } from './users';
import { computeServiceCommission } from '../utils/serviceCommission';
import { getTodayDate } from '../utils/time';

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

export interface ProfessionalFinanceData {
    serviceIncome: number;
    productIncome: number;
    rentalIncome: number;
    serviceCommission: number;
    productCommission: number;
    rentalCommission: number;
    attendanceWage: number;
    // Total ganado en el período (suma calculada de todos los componentes de arriba).
    totalCommission: number;
    // Parte del total ganado cuyas fechas todavía NO están cubiertas por ninguna liquidación:
    // es lo que realmente queda por pagar.
    pendingCommission: number;
    // Suma de lo efectivamente pagado en liquidaciones cuyo período cae dentro del rango
    // consultado (puede diferir de lo calculado si se ajustó el monto al liquidar).
    liquidatedAmount: number;
    name: string;
    userId?: string;
    type: 'tratamiento' | 'apoyo';
    isProfessionalRecord: boolean;
}

// Turno del período que no generó comisión (realizado con la comisión en $0, o cobrado pero
// todavía "Pendiente"), con el motivo. Sirve para que la secretaria detecte configuraciones o
// cierres incompletos en vez de ver un $0 sin explicación.
export interface CommissionWarning {
    appointmentId: string;
    date: string;
    clientName: string;
    treatment: string;
    professionalName: string;
    reason: string;
}

function emptyProfessionalData(
    name: string,
    userId: string | undefined,
    type: 'tratamiento' | 'apoyo',
    isProfessionalRecord: boolean
): ProfessionalFinanceData {
    return {
        serviceIncome: 0, productIncome: 0, rentalIncome: 0,
        serviceCommission: 0, productCommission: 0, rentalCommission: 0, attendanceWage: 0,
        totalCommission: 0, pendingCommission: 0, liquidatedAmount: 0,
        name, userId, type, isProfessionalRecord,
    };
}

export interface FinanceOverview {
    totalIncome: number;
    totalServiceIncome: number;
    totalProductIncome: number;
    totalRentalIncome: number;
    totalPartialIncome: number;
    totalGiftCardIncome: number;
    totalEgresos: number;
    totalProfCommissions: number;
    totalStaffWages: number;
    totalEgresosGeneral: number;
    saldo: number;
    egresosByCategory: Record<string, number>;
    byMethod: Record<string, number>;
    incomeByMethodDetailed: Record<string, number>;
    egresosByMethod: Record<string, number>;
    byProfessional: Record<string, ProfessionalFinanceData>;
    commissionWarnings: CommissionWarning[];
    byProduct: Record<string, {
        name: string;
        quantity: number;
        income: number;
    }>;
    movements: FinanceMovement[];
}

const TRANSFER_ACCOUNT_KEYS = ['cuenta1', 'cuenta2', 'mercadopago', 'prex'];

export function resolveMethodKey(method: string, bankAccount?: string | null): string {
    if (method === 'transfer') {
        return bankAccount && TRANSFER_ACCOUNT_KEYS.includes(bankAccount) ? bankAccount : 'cuenta1';
    }
    return method || 'cash';
}

export function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

const FINANCE_LOOKAROUND_DAYS = 120;

// Fetches appointments in range PLUS a 120-day window on both sides, so that a payment
// registered in this period shows up here even if its appointment falls outside the queried
// dates — a seña paid today for a turno in unos meses (look-forward), o un saldo pagado hoy
// para un turno de hace meses (look-back, ej. pagos atrasados/en cuotas).
async function fetchAppointmentsForFinance(
    startDate: string,
    endDate: string,
    targetProfessionalId?: string
): Promise<Appointment[]> {
    const lookForwardEnd = addDays(endDate, FINANCE_LOOKAROUND_DAYS);
    const lookBackStart = addDays(startDate, -FINANCE_LOOKAROUND_DAYS);

    if (targetProfessionalId) {
        const all = await getAppointmentsByProfessionalId(targetProfessionalId);
        return all.filter(a => a.date >= lookBackStart && a.date <= lookForwardEnd);
    }

    const [base, future, past] = await Promise.all([
        getAppointmentsByDateRange(startDate, endDate),
        getAppointmentsByDateRange(addDays(endDate, 1), lookForwardEnd),
        getAppointmentsByDateRange(lookBackStart, addDays(startDate, -1)),
    ]);

    const seenIds = new Set(base.map(a => a.id));
    const extra = [...future, ...past].filter(a => {
        if (seenIds.has(a.id)) return false;
        seenIds.add(a.id);
        return true;
    });
    return [...base, ...extra];
}

export async function getFinanceOverview(startDate: string, endDate: string, targetProfessionalId?: string): Promise<FinanceOverview> {
    const [appointments, sales, rentals, egresos, commissionPayments, giftCards, attendances, allProfessionals, admins, secretaries, promotors, profUsers] = await Promise.all([
        fetchAppointmentsForFinance(startDate, endDate, targetProfessionalId).catch(() => [] as Appointment[]),
        getSalesByDateRange(startDate, endDate).catch(() => [] as Sale[]),
        getRentalsByDateRange(startDate, endDate).catch(() => [] as Rental[]),
        getEgresosByDateRange(startDate, endDate).catch(() => [] as Egreso[]),
        getCommissionPaymentEgresos().catch(() => [] as Egreso[]),
        getGiftCardsByDateRange(startDate, endDate).catch(() => [] as GiftCard[]),
        getAttendancesByDateRange(startDate, endDate).catch(() => [] as Attendance[]),
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
        totalPartialIncome: 0,
        totalGiftCardIncome: 0,
        totalEgresos: 0,
        totalProfCommissions: 0,
        totalStaffWages: 0,
        totalEgresosGeneral: 0,
        saldo: 0,
        egresosByCategory: {},
        byMethod: { cash: 0, transfer: 0, debit: 0, credit: 0, qr: 0 },
        incomeByMethodDetailed: { cash: 0, cuenta1: 0, cuenta2: 0, mercadopago: 0, prex: 0, debit: 0, credit: 0, qr: 0 },
        egresosByMethod: { cash: 0, cuenta1: 0, cuenta2: 0, mercadopago: 0, prex: 0, debit: 0, credit: 0, qr: 0 },
        byProfessional: {},
        commissionWarnings: [],
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
            overview.byProfessional[nameKey] = emptyProfessionalData(
                nameKey, p.userId, p.type === 'apoyo' ? 'apoyo' : 'tratamiento', true
            );
        }
    });

    [...admins, ...secretaries, ...promotors].forEach(u => {
        const nameKey = u.fullName.trim();
        if (u.uid) idToName[u.uid] = nameKey;
        if (!overview.byProfessional[nameKey]) {
            overview.byProfessional[nameKey] = emptyProfessionalData(nameKey, u.uid, 'tratamiento', false);
        }
    });

    // Ensure professional users whose UID isn't already mapped (no userId in professionals collection)
    // can still be attributed rentals and sales commissions
    profUsers.forEach(u => {
        if (!u.uid || idToName[u.uid]) return;
        const nameKey = u.fullName.trim();
        idToName[u.uid] = nameKey;
        if (!overview.byProfessional[nameKey]) {
            overview.byProfessional[nameKey] = emptyProfessionalData(nameKey, u.uid, 'tratamiento', false);
        }
    });

    // Liquidaciones ya hechas, por profesional. Cada una cubre un rango de fechas
    // (día, semana, quincena, mes... lo que se haya liquidado): toda comisión o sueldo
    // cuya fecha caiga dentro de un rango liquidado se considera pagado, sin importar en
    // qué período se esté mirando ahora. Así no importa que cada profesional se liquide
    // con una frecuencia distinta.
    // Una liquidación solo cubre hasta el día en que se pagó (coverEnd): si se liquida un
    // mes a mitad de mes, lo que se complete después no debe darse por pagado.
    const liquidationsByProfessional: Record<string, { start: string; end: string; coverEnd: string; amount: number }[]> = {};
    commissionPayments.forEach(e => {
        if (!e.professionalId || !e.commissionPeriodStart || !e.commissionPeriodEnd) return;
        if (!liquidationsByProfessional[e.professionalId]) liquidationsByProfessional[e.professionalId] = [];
        liquidationsByProfessional[e.professionalId].push({
            start: e.commissionPeriodStart,
            end: e.commissionPeriodEnd,
            coverEnd: e.date && e.date < e.commissionPeriodEnd ? e.date : e.commissionPeriodEnd,
            amount: Number(e.amount) || 0,
        });
    });

    const isCommissionCovered = (profName: string, date: string): boolean => {
        const prof = nameToProfessional[profName];
        if (!prof) return false;
        return (liquidationsByProfessional[prof.id] || []).some(l => date >= l.start && date <= l.coverEnd);
    };

    const allMovements: FinanceMovement[] = [];
    const commissionWarnings = overview.commissionWarnings;
    const todayStr = getTodayDate();

    // 2. Procesar Turnos
    appointments.forEach(apt => {
        const status = (apt.status || '').toLowerCase();
        const isCompleted = status === 'completed' || status === 'realizado';
        const isCancelled = status === 'cancelled' || status === 'cancelado';
        const isAptInDateRange = apt.date >= startDate && apt.date <= endDate;

        const paymentsArray = (apt.payments || []);
        const totalPaid = paymentsArray.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const actualPrice = Number(apt.price) || totalPaid;

        // El dinero de cada pago (seña, parcial, total) se contabiliza en la fecha real en que
        // se cobró (p.date), sin importar el estado del turno: una seña cobrada hoy para un
        // turno futuro (pending) o de un turno luego cancelado sigue siendo caja real de hoy.
        // El estado del turno solo determina si genera comisión (ver más abajo), no si el
        // cobro existió.
        if (paymentsArray.length > 0) {
            paymentsArray.forEach(p => {
                const pDate = (p.date || '').substring(0, 10);
                if (!pDate || pDate < startDate || pDate > endDate) return;
                // Gift cards and client credits are pre-collected — skip to avoid double-counting
                if (p.method === 'gift_card' || p.method === 'client_credit') return;
                const isSeña = p.label === 'Seña';
                const isParcial = p.label === 'Pago Parcial';
                const isDifferentDay = pDate !== apt.date;
                const category = isSeña ? 'Seña' : isParcial ? 'Parcial' : 'Servicio';
                // Aclarar a qué turno corresponde cuando el cobro no fue el mismo día: puede ser
                // una seña adelantada (pDate < apt.date) o un pago atrasado/en cuotas de un
                // turno ya pasado (pDate > apt.date) — en ambos casos ayuda a la secretaria a
                // entender por qué este ingreso de hoy no coincide con ningún turno de hoy.
                const suffix = isCancelled
                    ? ' (turno cancelado)'
                    : isDifferentDay ? ` (turno ${apt.date.split('-').reverse().join('/')})` : '';
                allMovements.push({
                    id: `pay_${apt.id}_${p.id || pDate}`,
                    date: pDate,
                    type: 'ingreso',
                    category,
                    description: `${apt.clientName} - ${apt.treatment}${suffix}`,
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
        const profName = apt.professionalId ? (idToName[apt.professionalId] || apt.professionalId) : null;
        const warn = (reason: string) => commissionWarnings.push({
            appointmentId: apt.id,
            date: apt.date,
            clientName: apt.clientName,
            treatment: apt.treatment,
            professionalName: profName || 'Sin profesional',
            reason,
        });

        if (isAptInDateRange && !isCompleted && !isCancelled && apt.date <= todayStr && totalPaid > 0) {
            // Cobrado pero nunca marcado como Realizado (en "Cerrar Turno" el estado hay que
            // elegirlo a mano): el ingreso ya está en caja pero no se calcula comisión.
            warn('Ya tiene pagos cargados pero sigue como "Pendiente": marcalo como Realizado para que genere comisión');
        }

        if (isAptInDateRange && isCompleted) {
            if (actualPrice <= 0) {
                warn('El turno no tiene precio ni pagos cargados');
            } else if (!apt.professionalId) {
                warn('El turno no tiene profesional asignado');
            } else if (!profName || !overview.byProfessional[profName]) {
                warn('No se encontró al profesional del turno entre los profesionales o usuarios');
            } else {
                const prof = nameToProfessional[profName];
                const profData = overview.byProfessional[profName];

                profData.serviceIncome += actualPrice;

                const { amount: aptCommission, zeroReason } = computeServiceCommission(apt, prof, actualPrice);
                if (zeroReason) warn(zeroReason);

                profData.serviceCommission += aptCommission;
                if (!isCommissionCovered(profName, apt.date)) profData.pendingCommission += aptCommission;
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
                const saleCommission = Number(sale.commission) || 0;
                overview.byProfessional[sellerName].productCommission += saleCommission;
                if (!isCommissionCovered(sellerName, sale.date)) {
                    overview.byProfessional[sellerName].pendingCommission += saleCommission;
                }
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
            const rentalCommission = Number(rental.commission) || 0;
            overview.byProfessional[sellerName].rentalIncome += amount;
            overview.byProfessional[sellerName].rentalCommission += rentalCommission;
            if (!isCommissionCovered(sellerName, rental.date)) {
                overview.byProfessional[sellerName].pendingCommission += rentalCommission;
            }
        }
    });

    // 5. Gift Cards vendidas (compra = ingreso real en la fecha de venta, editable por la secretaria)
    giftCards.forEach(gc => {
        if (gc.date < startDate || gc.date > endDate) return;
        allMovements.push({
            id: `gc_${gc.id}`,
            date: gc.date,
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

    // 5b. Asistencias del personal de apoyo (sueldo por día trabajado, no es un ingreso —
    // se acumula para calcular cuánto se le debe a esa persona, igual que la comisión de
    // un profesional de tratamiento).
    attendances.forEach(a => {
        const profName = idToName[a.professionalId] || a.professionalId;
        if (overview.byProfessional[profName]) {
            const wage = Number(a.amount) || 0;
            overview.byProfessional[profName].attendanceWage += wage;
            if (!isCommissionCovered(profName, a.date)) overview.byProfessional[profName].pendingCommission += wage;
        }
    });

    // 6. Egresos Manuales
    // Un gasto puede pagarse con varios métodos (ej. parte efectivo, parte transferencia):
    // se genera un movimiento por cada pago para que cada método/cuenta descuente lo suyo.
    // referenceId apunta siempre al gasto original (para editarlo/eliminarlo).
    egresos.forEach(e => {
        const amount = Number(e.amount) || 0;
        const category = e.category || 'Otros';
        const description = e.description || 'Gasto general';
        const payments = (e.payments || []).filter(p => (Number(p.amount) || 0) > 0);
        const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // Solo se desglosa si los pagos suman el monto del gasto; si no cierran (datos viejos
        // o inconsistentes) se mantiene el monto total del gasto con el método principal.
        if (payments.length > 0 && Math.abs(paymentsTotal - amount) < 0.01) {
            payments.forEach((p, idx) => {
                allMovements.push({
                    id: `${e.id}_p${idx}`,
                    date: e.date,
                    type: 'egreso',
                    category,
                    description,
                    amount: Number(p.amount) || 0,
                    method: p.method,
                    bankAccount: p.bankAccount,
                    referenceId: e.id,
                    referenceType: 'egreso',
                });
            });
            return;
        }

        allMovements.push({
            id: e.id,
            date: e.date,
            type: 'egreso',
            category,
            description,
            amount,
            method: e.payments?.[0]?.method || e.paymentMethod || 'cash',
            bankAccount: e.payments?.[0]?.bankAccount || e.bankAccount,
            referenceId: e.id,
            referenceType: 'egreso',
        });
    });

    // 6. Consolidar Comisiones
    overview.totalProfCommissions = 0;
    overview.totalStaffWages = 0;

    // El % es solo referencia: una vez que un rango de fechas se liquida, el monto pactado
    // queda fijo y esas fechas no generan pendiente ni saldo a favor, sin importar si se
    // pagó de más o de menos respecto del cálculo (ver isCommissionCovered).
    Object.values(overview.byProfessional).forEach((data) => {
        // totalCommission = total ganado calculado en el período (siempre suma de sus
        // componentes). Lo efectivamente pagado va aparte en liquidatedAmount, y lo que
        // falta pagar en pendingCommission.
        data.totalCommission = data.serviceCommission + data.productCommission + data.rentalCommission + data.attendanceWage;

        const prof = nameToProfessional[data.name];
        const liquidations = prof ? (liquidationsByProfessional[prof.id] || []) : [];

        // Pagado: liquidaciones cuyo período entra completo en el rango consultado. Una
        // liquidación más grande que el rango (ej. mirando un día de un mes ya liquidado)
        // no se puede repartir por día, así que no se cuenta acá; esas fechas igual quedan
        // sin pendiente.
        data.liquidatedAmount = liquidations
            .filter(l => l.start >= startDate && l.end <= endDate)
            .reduce((sum, l) => sum + l.amount, 0);
        const hasLiquidationInRange = liquidations.some(l => l.start <= endDate && l.coverEnd >= startDate);

        const virtualCommissionToPay = Math.max(0, data.pendingCommission);

        // Mostrar el botón "Liquidar" también para un profesional en $0: puede no haber
        // facturado nada este período y aun así la dueña quiera pagarle algo (un adelanto,
        // un bono). No aplica si ya hay una liquidación que toca este rango (quedaría un
        // botón fantasma para volver a "liquidar" fechas ya cerradas).
        if (virtualCommissionToPay > 0 || (data.isProfessionalRecord && !hasLiquidationInRange)) {
            const isStaff = data.type === 'apoyo';
            if (isStaff) overview.totalStaffWages += virtualCommissionToPay;
            else overview.totalProfCommissions += virtualCommissionToPay;
            allMovements.push({
                id: `comm_${data.name.replace(/\s+/g, '_')}`,
                date: endDate,
                type: 'egreso',
                category: 'sueldos',
                description: `${isStaff ? 'Sueldo' : 'Comisión'} (Pendiente): ${data.name}`,
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
