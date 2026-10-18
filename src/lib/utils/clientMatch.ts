// Comparación de nombres para detectar fichas de cliente repetidas
// (sin mayúsculas, tildes ni espacios de más).
export function normalizeName(name: string | undefined): string {
    return (name || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

export function sameName(a: string | undefined, b: string | undefined): boolean {
    const na = normalizeName(a);
    return na !== '' && na === normalizeName(b);
}
