import { CashCount, BALANCE_PLACES } from '../types/cashCount';

// Saldo por lugar; null = ese lugar no tiene ningún arqueo cargado (no se puede saber).
export type PlaceBalances = Record<string, number | null>;

// Movimiento ya reducido a lo que importa para el saldo: de qué lugar y cuánto (+ingreso / -egreso).
export interface BalanceMovement {
    date: string; // YYYY-MM-DD
    key: string; // lugar (cash, cuenta1, mercadopago, ...)
    delta: number;
}

function sortCounts(counts: CashCount[]): CashCount[] {
    return [...counts].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.getTime() - b.createdAt.getTime());
}

// Último arqueo (a igual fecha, el cargado más tarde) que incluye ese lugar y es de esa
// fecha o anterior: es el punto de partida desde el cual se acumulan los movimientos.
function baselineFor(sortedCounts: CashCount[], place: string, through: string): CashCount | null {
    let found: CashCount | null = null;
    for (const c of sortedCounts) {
        if (c.date <= through && typeof c.balances[place] === 'number') found = c;
    }
    return found;
}

// Fecha del arqueo más viejo que hace falta para calcular los saldos a esas fechas
// (null si ningún lugar tiene arqueo todavía).
export function earliestBaselineDate(counts: CashCount[], throughDates: string[]): string | null {
    const sorted = sortCounts(counts);
    let earliest: string | null = null;
    for (const through of throughDates) {
        for (const { key } of BALANCE_PLACES) {
            const b = baselineFor(sorted, key, through);
            if (b && (earliest === null || b.date < earliest)) earliest = b.date;
        }
    }
    return earliest;
}

// Saldo de cada lugar al cierre del día `through`: lo contado en su último arqueo más los
// movimientos posteriores a ese arqueo (hasta `through` inclusive).
export function computeBalances(counts: CashCount[], movements: BalanceMovement[], through: string): PlaceBalances {
    const sorted = sortCounts(counts);
    const result: PlaceBalances = {};
    for (const { key } of BALANCE_PLACES) {
        const baseline = baselineFor(sorted, key, through);
        if (!baseline) {
            result[key] = null;
            continue;
        }
        let balance = baseline.balances[key];
        for (const m of movements) {
            if (m.key === key && m.date > baseline.date && m.date <= through) balance += m.delta;
        }
        result[key] = Math.round(balance * 100) / 100;
    }
    return result;
}
