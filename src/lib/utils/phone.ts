import { parsePhoneNumber } from 'libphonenumber-js';

/**
 * Sanitize and format phone number to E.164 standard (+549...)
 * Useful for WhatsApp integration and n8n automations.
 * Sin dependencias de Firebase: se puede usar tanto en el cliente como en el servidor.
 */
export function formatPhone(phone: string): string {
    try {
        // Clean any weird chars but keep + if present
        const cleaned = phone.trim();
        if (!cleaned) return '';

        // If it doesn't start with +, assume AR (+54) for now as default
        const phoneWithContext = cleaned.startsWith('+') ? cleaned : `+54${cleaned}`;

        const phoneNumber = parsePhoneNumber(phoneWithContext, 'AR');

        if (phoneNumber && phoneNumber.isValid()) {
            // Specialized handling for Argentina: WhatsApp requires the '9' prefix for mobile numbers (+54 9 ...)
            if (phoneNumber.country === 'AR') {
                const nationalNumber = phoneNumber.nationalNumber;
                // If it already starts with 9, don't add it again.
                // libphonenumber-js often includes the mobile prefix 9 in the national number if provided in input.
                if (nationalNumber.startsWith('9')) {
                    return `+54${nationalNumber}`;
                }
                return `+549${nationalNumber}`;
            }
            return phoneNumber.format('E.164');
        }

        // Fallback: just return digits with + prefix
        const digits = cleaned.replace(/\D/g, '');
        return `+${digits}`;
    } catch (error) {
        console.error('Error formatting phone:', error);
        const digits = phone.replace(/\D/g, '');
        return `+${digits}`;
    }
}
