/**
 * Formats a number or string into Argentine currency format.
 * Example: 12566.24 -> "12.566,24"
 */
export function formatArgentineCurrency(value: number | string | undefined | null): string {
    if (value === undefined || value === null || value === '') return '';

    const numericValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;

    if (isNaN(numericValue)) return '';

    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(numericValue);
}

/**
 * Parses a formatted Argentine currency string into a clean numeric string for internal state.
 * Example: "12.566,24" -> "12566.24"
 */
export function parseArgentineCurrency(value: string): string {
    // Remove all dots (thousands separator)
    const withoutDots = value.replace(/\./g, '');
    // Replace comma with dot (decimal separator)
    const withDotDecimal = withoutDots.replace(',', '.');
    // Remove any non-numeric characters except the dot
    return withDotDecimal.replace(/[^\d.]/g, '');
}

/**
 * Formats a numeric value for display as currency with $ symbol.
 */
export function formatCurrencyWithSymbol(value: number | undefined | null): string {
    if (value === undefined || value === null) return '$0';
    return `$${formatArgentineCurrency(value)}`;
}
