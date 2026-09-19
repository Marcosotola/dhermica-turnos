// Lugares donde puede haber plata, con la misma clave que usa Finanzas para agrupar
// movimientos (ver resolveMethodKey en finance.ts). 'cuenta2' (Reba) está dada de baja:
// solo se ofrece si todavía tiene movimientos o un arqueo cargado.
export const BALANCE_PLACES: { key: string; label: string }[] = [
    { key: 'cash', label: 'Efectivo' },
    { key: 'cuenta1', label: 'Cuenta Brubank' },
    { key: 'mercadopago', label: 'Mercado Pago' },
    { key: 'prex', label: 'Prex' },
    { key: 'debit', label: 'Débito' },
    { key: 'credit', label: 'Crédito' },
    { key: 'qr', label: 'QR / Digital' },
    { key: 'cuenta2', label: 'Cuenta Reba' },
];

// Arqueo / saldo inicial: cierre del día `date` (con todos los movimientos de ese día ya
// cargados). Es el punto de partida desde el cual Finanzas acumula los saldos. Un lugar que
// no se cuenta no se guarda y queda sin seguimiento.
//
// Al cerrar la caja se suele retirar plata y dejar solo el cambio. Por eso hay dos números:
//   - counted:  lo contado ANTES de retirar (se compara con `expected` para ver si faltó o sobró)
//   - balances: lo que QUEDA después de retirar (es lo que arrastra el día siguiente)
// Sin retiro, ambos coinciden. Los arqueos viejos no tienen `counted`: ahí se usa `balances`.
export interface CashCount {
    id: string;
    date: string; // YYYY-MM-DD
    balances: Record<string, number>; // lo que queda en cada lugar (punto de partida del día siguiente)
    counted?: Record<string, number>; // contado real antes de retirar
    expected?: Record<string, number>; // lo que calculaba el sistema al momento de contar
    note?: string;
    createdAt: Date;
    createdBy?: string;
}
