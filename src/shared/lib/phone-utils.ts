import { BadRequestError } from './errors';

export class PhoneUtils {
    /**
     * Format Brazilian phone number for WhatsApp
     * Handles various Brazilian phone formats and normalizes them
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

        // Handle 9th digit for mobile numbers
        if (cleaned.length === 12) {
            const areaCode = cleaned.substring(2, 4);
            const number = cleaned.substring(4);

            // Check if it's a mobile number (starts with 7, 8, or 9)
            if (['7', '8', '9'].includes(number[0])) {
                cleaned = `55${areaCode}9${number}`;
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