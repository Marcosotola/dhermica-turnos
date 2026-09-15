// Cuentas bancarias/billeteras disponibles para el método de pago "transfer".
// 'cuenta2' (Reba) se dio de baja: se mantiene en el tipo y en BANK_ACCOUNT_LABELS
// únicamente para poder seguir mostrando correctamente los pagos históricos ya
// guardados con ese valor — no debe ofrecerse en selectores de pagos nuevos.
export type BankAccount = 'cuenta1' | 'cuenta2' | 'mercadopago' | 'prex';

export const BANK_ACCOUNTS: { value: BankAccount; label: string }[] = [
    { value: 'cuenta1', label: 'Cuenta Brubank' },
    { value: 'mercadopago', label: 'Mercado Pago' },
    { value: 'prex', label: 'Prex' },
];

export const BANK_ACCOUNT_LABELS: Record<BankAccount, string> = {
    cuenta1: 'Brubank',
    cuenta2: 'Reba',
    mercadopago: 'Mercado Pago',
    prex: 'Prex',
};

export function formatBankAccount(bankAccount?: string | null): string {
    if (!bankAccount) return '';
    return BANK_ACCOUNT_LABELS[bankAccount as BankAccount] || bankAccount;
}
