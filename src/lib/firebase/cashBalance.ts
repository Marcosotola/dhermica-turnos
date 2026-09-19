import { getFinanceOverview, resolveMethodKey, addDays } from './finance';
import { CashCount } from '../types/cashCount';
import {
    BalanceMovement,
    PlaceBalances,
    computeBalances,
    earliestBaselineDate,
} from '../utils/cashBalance';

// Saldo de cada lugar al cierre de cada una de las fechas pedidas. Trae los movimientos una
// sola vez, desde el día siguiente al arqueo más viejo que haga falta hasta la fecha más
// reciente, y los reparte entre las fechas.
export async function getBalancesAt(
    throughDates: string[],
    counts: CashCount[]
): Promise<Record<string, PlaceBalances>> {
    const earliest = earliestBaselineDate(counts, throughDates);
    const latest = throughDates.reduce((max, d) => (d > max ? d : max), throughDates[0]);

    let movements: BalanceMovement[] = [];
    if (earliest && earliest < latest) {
        const overview = await getFinanceOverview(addDays(earliest, 1), latest);
        movements = overview.movements
            .filter(m => !m.isPending)
            .map(m => ({
                date: m.date,
                key: resolveMethodKey(m.method, m.bankAccount),
                delta: m.type === 'ingreso' ? m.amount : -m.amount,
            }));
    }

    const result: Record<string, PlaceBalances> = {};
    for (const date of throughDates) {
        result[date] = computeBalances(counts, movements, date);
    }
    return result;
}
