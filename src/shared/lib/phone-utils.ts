import { BadRequestError } from './errors';

export class PhoneUtils {
    /**
     * Format Brazilian phone number for WhatsApp
     * WhatsApp uses the OLD format without the 9th digit
     */
    static formatBrazilianPhone(phone: string): string {
        // Remove all non-numeric characters
        let cleaned = phone.replace(/\D/g, '');

        // Add country code if missing
        if (!cleaned.startsWith('55')) {
            cleaned = '55' + cleaned;
        }

        // Validate length (should be 12 or 13 digits)
        if (cleaned.length < 12 || cleaned.length > 13) {
            throw new BadRequestError('Invalid Brazilian phone number length');
        }

        // Remove 9th digit for mobile numbers (WhatsApp uses old format)
        if (cleaned.length === 13) {
            const countryCode = cleaned.substring(0, 2);  // 55
            const areaCode = cleaned.substring(2, 4);     // 41
            const ninthDigit = cleaned.substring(4, 5);   // 9
            const firstDigit = cleaned.substring(5, 6);   // 9, 8, 7, etc
            const restOfNumber = cleaned.substring(5);    // 96749101

            // Check if it's a mobile with 9th digit (9 followed by 7, 8, or 9)
            if (ninthDigit === '9' && ['7', '8', '9'].includes(firstDigit)) {
                cleaned = countryCode + areaCode + restOfNumber;
            }
        }

        return cleaned;
    }

    /**
     * Format phone number for WhatsApp API
     */
    static toWhatsAppId(phone: string): string {
        const formatted = this.formatBrazilianPhone(phone);
        return `${formatted}@c.us`;
    }

    /**
     * Extract clean phone number from WhatsApp ID
     */
    static fromWhatsAppId(whatsappId: string): string {
        return whatsappId.replace('@c.us', '').replace('@g.us', '');
    }

    /**
     * Validate if phone number is valid
     */
    static isValidBrazilianPhone(phone: string): boolean {
        try {
            this.formatBrazilianPhone(phone);
            return true;
        } catch {
            return false;
        }
    }
} 