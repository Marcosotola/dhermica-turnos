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

/**
 * Sanitizes freeform amount typing for text inputs with inputMode="decimal".
 * Some mobile keyboards insert "," and others "." as the decimal key regardless of
 * app locale, and a native <input type="number"> silently reports an empty value
 * (not an error) when it gets a character it doesn't expect - so plain type="number"
 * inputs looked "filled in" to the user while actually holding an empty string.
 * This treats whichever separator (. or ,) is typed first as the decimal point and
 * strips any further separators, so typing works regardless of keyboard locale.
 */
export function sanitizeDecimalInput(raw: string): string {
    const cleaned = raw.replace(/[^\d.,]/g, '');
    const sepIndex = cleaned.search(/[.,]/);
    if (sepIndex === -1) return cleaned;

    const intPart = cleaned.slice(0, sepIndex).replace(/[.,]/g, '');
    const fracPart = cleaned.slice(sepIndex + 1).replace(/[.,]/g, '');
    return `${intPart}.${fracPart}`;
}
