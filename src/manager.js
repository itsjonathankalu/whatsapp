import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

/**
 * @typedef {Object} WhatsAppStatus
 * @property {'disconnected' | 'waiting_qr' | 'ready'} status - Connection status
 * @property {string} [qr] - QR code for authentication
 * @property {string} [message] - Status message
 */

export class WhatsAppManager {
  constructor() {
    this.client = null;
    this.status = 'disconnected';
    this.qrCode = null;
    this.messageCount = 0;
    this.resetAt = Date.now() + 60000;

    this.initializeClient();
  }

  /**
   * Initialize WhatsApp client
   */
  initializeClient() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.client.on('qr', (qr) => {
      this.qrCode = qr;
      this.status = 'waiting_qr';
      console.log('QR Code received - scan with WhatsApp');
    });

    this.client.on('ready', () => {
      this.status = 'ready';
      this.qrCode = null;
      console.log('✓ WhatsApp client ready');
    });

    this.client.on('auth_failure', () => {
      this.status = 'disconnected';
      console.log('✗ Authentication failed');
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'disconnected';
      console.log(`✗ Disconnected: ${reason}`);
      // Auto-reconnect after 5 seconds
      setTimeout(() => this.initializeClient(), 5000);
    });

    this.client.initialize();
  }

  /**
   * Check if WhatsApp client is ready
   * @returns {boolean}
   */
  isReady() {
    return this.status === 'ready';
  }

  /**
   * Simple message counter for logging (rate limiting should be done at gateway level)
   */
  incrementMessageCount() {
    const now = Date.now();
    if (now > this.resetAt) {
      this.messageCount = 0;
      this.resetAt = now + 60000; // Reset every minute
    }

    this.messageCount++;
  }

  /**
   * Send a WhatsApp message
   * @param {string} to - Phone number to send to
   * @param {string} message - Message content
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(to, message) {
    if (!this.isReady()) {
      throw new Error('WhatsApp not connected. Check /qr endpoint.');
    }

    this.incrementMessageCount();

    const formattedNumber = this.formatPhoneForWhatsApp(to);
    const chatId = formattedNumber + '@c.us';
    const result = await this.client.sendMessage(chatId, message);

    return {
      id: result.id._serialized,
      timestamp: new Date().toISOString(),
      to: formattedNumber,
    };
  }

  /**
   * Get QR code and status
   * @returns {Promise<WhatsAppStatus>}
   */
  async getQR() {
    return {
      status: this.status,
      qr: this.qrCode,
      message:
        this.status === 'waiting_qr' ? 'Scan this QR code with WhatsApp' : `Status: ${this.status}`,
    };
  }

  /**
   * Format phone number for WhatsApp compatibility
   * Handles Brazilian cellphone numbers by removing the extra 9th digit
   * @param {string} phone - Raw phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneForWhatsApp(phone) {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');

    // Handle Brazilian cellphone numbers (country code 55)
    if (cleaned.startsWith('55') && cleaned.length === 13) {
      // Format: 5541996749101 -> 554196749101
      // 55 (country) + 41 (area) + 9 (extra digit) + 96749101 (number)
      const countryCode = cleaned.substring(0, 2); // 55
      const areaCode = cleaned.substring(2, 4); // 41
      const extraDigit = cleaned.substring(4, 5); // 9
      const number = cleaned.substring(5); // 96749101

      // Only remove the 9th digit if it's actually a 9
      if (extraDigit === '9') {
        cleaned = countryCode + areaCode + number;
        console.log(`Formatted Brazilian number: ${phone} -> ${cleaned}`);
      }
    }

    return cleaned;
  }

  /**
   * Start status logging interval
   */
  startCleanupInterval() {
    // Log status every 5 minutes
    setInterval(() => {
      console.log(`Status: ${this.status}, Messages sent this minute: ${this.messageCount}`);
    }, 300000);
  }

  /**
   * Shutdown WhatsApp client gracefully
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log('Shutting down WhatsApp client...');

    try {
      if (this.client) {
        await this.client.destroy();
      }
    } catch (error) {
      console.error('Error destroying client:', error);
    }

    console.log('WhatsApp client shut down');
  }
}
