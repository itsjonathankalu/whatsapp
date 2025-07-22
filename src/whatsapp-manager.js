import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

/**
 * @typedef {Object} WhatsAppSession
 * @property {Client} client - WhatsApp client instance
 * @property {'initializing' | 'ready' | 'failed'} status - Session status
 * @property {string} [qrCode] - QR code for authentication
 * @property {Date} [connectedAt] - When the session connected
 */

export class WhatsAppManager {
  constructor() {
    /** @type {Map<string, WhatsAppSession>} */
    this.sessions = new Map();
  }

  /**
   * Create a new WhatsApp session for a tenant
   * @param {string} tenantId - Unique tenant identifier
   * @returns {Promise<Object>} Session creation result
   */
  async createSession(tenantId) {
    // Return existing if available
    if (this.sessions.has(tenantId)) {
      return this.getStatus(tenantId);
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: tenantId }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    /** @type {WhatsAppSession} */
    const session = {
      client,
      status: 'initializing',
    };

    this.sessions.set(tenantId, session);

    // Handle QR code generation
    client.on('qr', (qr) => {
      session.qrCode = qr;
    });

    // Handle successful connection
    client.on('ready', () => {
      session.status = 'ready';
      session.connectedAt = new Date();
      session.qrCode = undefined;
      console.log(`✓ Session ready: ${tenantId}`);
    });

    // Handle authentication failure
    client.on('auth_failure', () => {
      session.status = 'failed';
      this.sessions.delete(tenantId);
      console.log(`✗ Authentication failed: ${tenantId}`);
    });

    // Initialize the client
    await client.initialize();

    // Wait a bit for QR code generation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return this.getStatus(tenantId);
  }

  /**
   * Send a WhatsApp message
   * @param {string} tenantId - Tenant identifier
   * @param {string} to - Phone number to send to
   * @param {string} message - Message content
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(tenantId, to, message) {
    const session = this.sessions.get(tenantId);

    if (!session || session.status !== 'ready') {
      throw new Error('Session not ready');
    }

    // Format phone number for Brazil
    let phone = to.replace(/\D/g, '');
    if (!phone.startsWith('55')) {
      phone = '55' + phone;
    }

    const chatId = phone + '@c.us';
    const result = await session.client.sendMessage(chatId, message);

    return {
      id: result.id._serialized,
      timestamp: new Date().toISOString(),
      to: phone,
    };
  }

  /**
   * Get session status for a tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Object} Status object
   */
  getStatus(tenantId) {
    const session = this.sessions.get(tenantId);

    if (!session) {
      return { status: 'not_found' };
    }

    return {
      status: session.status,
      qrCode: session.qrCode,
      connectedAt: session.connectedAt,
    };
  }

  /**
   * Get count of active sessions
   * @returns {number} Number of ready sessions
   */
  getActiveSessions() {
    return Array.from(this.sessions.values()).filter((s) => s.status === 'ready').length;
  }

  /**
   * Shutdown all WhatsApp clients gracefully
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log('Shutting down all WhatsApp clients...');

    const promises = Array.from(this.sessions.entries()).map(async ([tenantId, session]) => {
      try {
        await session.client.destroy();
      } catch (error) {
        console.error(`Error destroying client for tenant ${tenantId}:`, error);
      }
    });

    await Promise.all(promises);
    this.sessions.clear();

    console.log('All WhatsApp clients shut down');
  }
}
