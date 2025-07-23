import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

/**
 * @typedef {Object} WhatsAppSession
 * @property {Client} client - WhatsApp client instance
 * @property {'initializing' | 'waiting_qr' | 'ready' | 'failed'} status - Session status
 * @property {string} [qrCode] - QR code for authentication
 * @property {Date} [connectedAt] - When the session connected
 * @property {number} messageCount - Messages sent this minute
 * @property {number} resetAt - When to reset message count
 */

export class WhatsAppManager {
  constructor() {
    /** @type {Map<string, WhatsAppSession>} */
    this.sessions = new Map();
  }

  /**
   * Create or get a WhatsApp session
   * Sessions are lazy-loaded and persisted via Docker volumes
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} Session status
   */
  async createSession(sessionId) {
    // Return existing if available
    if (this.sessions.has(sessionId)) {
      return this.getStatus(sessionId);
    }

    console.log(`Creating new session: ${sessionId}`);

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: sessionId }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    /** @type {WhatsAppSession} */
    const session = {
      client,
      status: 'initializing',
      messageCount: 0,
      resetAt: Date.now() + 60000,
    };

    this.sessions.set(sessionId, session);

    // Handle QR code generation
    client.on('qr', (qr) => {
      session.qrCode = qr;
      session.status = 'waiting_qr';
      console.log(`QR Code received for session: ${sessionId}`);
    });

    // Handle successful connection
    client.on('ready', () => {
      session.status = 'ready';
      session.connectedAt = new Date();
      session.qrCode = undefined;
      console.log(`✓ Session ready: ${sessionId}`);
    });

    // Handle authentication failure
    client.on('auth_failure', () => {
      session.status = 'failed';
      console.log(`✗ Authentication failed: ${sessionId}`);
      // Keep the session around so user can retry/get new QR
    });

    // Handle disconnection
    client.on('disconnected', (reason) => {
      session.status = 'initializing';
      console.log(`✗ Session disconnected: ${sessionId} - ${reason}`);
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        if (this.sessions.has(sessionId)) {
          console.log(`Attempting to reconnect session: ${sessionId}`);
          this.createSession(sessionId);
        }
      }, 5000);
    });

    // Initialize the client
    try {
      await client.initialize();
    } catch (error) {
      console.error(`Failed to initialize session ${sessionId}:`, error);
      session.status = 'failed';
      throw error;
    }

    // Wait a bit for QR code generation or auto-recovery
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return this.getStatus(sessionId);
  }

  /**
   * Simple message counter for logging (rate limiting should be done at gateway level)
   * @param {WhatsAppSession} session - Session to increment count for
   */
  incrementMessageCount(session) {
    const now = Date.now();
    if (now > session.resetAt) {
      session.messageCount = 0;
      session.resetAt = now + 60000; // Reset every minute
    }

    session.messageCount++;
  }

  /**
   * Send a WhatsApp message
   * @param {string} sessionId - Session identifier
   * @param {string} to - Phone number to send to
   * @param {string} message - Message content
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(sessionId, to, message) {
    let session = this.sessions.get(sessionId);

    // Create session if it doesn't exist
    if (!session) {
      await this.createSession(sessionId);
      session = this.sessions.get(sessionId);
    }

    if (session.status !== 'ready') {
      throw new Error(
        `Session '${sessionId}' not ready. Status: ${session.status}. Please check QR code endpoint.`
      );
    }

    this.incrementMessageCount(session);

    const formattedNumber = this.formatPhoneForWhatsApp(to);
    const chatId = formattedNumber + '@c.us';

    try {
      const result = await session.client.sendMessage(chatId, message);

      return {
        id: result.id._serialized,
        timestamp: new Date().toISOString(),
        to: formattedNumber,
        sessionId: sessionId,
      };
    } catch (error) {
      console.error(`Failed to send message via session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get QR code for session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object>} QR code and status
   */
  async getQR(sessionId) {
    const session = this.sessions.get(sessionId);

    // Create session if it doesn't exist
    if (!session) {
      return this.createSession(sessionId);
    }

    return {
      sessionId: sessionId,
      status: session.status,
      qr: session.qrCode,
      message: this.getStatusMessage(session.status, session.qrCode),
      connectedAt: session.connectedAt,
    };
  }

  /**
   * Get user-friendly status message
   * @param {string} status - Session status
   * @param {string} qrCode - QR code if available
   * @returns {string} User-friendly message
   */
  getStatusMessage(status, qrCode) {
    switch (status) {
      case 'waiting_qr':
        return qrCode ? 'Scan this QR code with WhatsApp' : 'Generating QR code...';
      case 'ready':
        return 'Connected and ready to send messages';
      case 'initializing':
        return 'Starting up, please wait...';
      case 'failed':
        return 'Authentication failed. Request QR code to retry.';
      default:
        return `Status: ${status}`;
    }
  }

  /**
   * Get session status
   * @param {string} sessionId - Session identifier
   * @returns {Object} Status object
   */
  getStatus(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        sessionId: sessionId,
        status: 'not_found',
        message: 'Session does not exist. Request QR code to create.',
      };
    }

    return {
      sessionId: sessionId,
      status: session.status,
      qrCode: session.qrCode,
      message: this.getStatusMessage(session.status, session.qrCode),
      connectedAt: session.connectedAt,
      messageCount: session.messageCount,
    };
  }

  /**
   * Check if a specific session is ready
   * @param {string} sessionId - Session identifier
   * @returns {boolean}
   */
  isReady(sessionId = 'default') {
    const session = this.sessions.get(sessionId);
    return session && session.status === 'ready';
  }

  /**
   * Get count of active sessions
   * @returns {Object} Number of sessions by status
   */
  getActiveSessions() {
    const sessions = Array.from(this.sessions.values());
    return {
      total: sessions.length,
      ready: sessions.filter((s) => s.status === 'ready').length,
      waiting_qr: sessions.filter((s) => s.status === 'waiting_qr').length,
      initializing: sessions.filter((s) => s.status === 'initializing').length,
      failed: sessions.filter((s) => s.status === 'failed').length,
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
      // Format: 5541988887777 -> 554188887777
      // 55 (country) + 41 (area) + 9 (extra digit) + 88887777 (number)
      const countryCode = cleaned.substring(0, 2); // 55
      const areaCode = cleaned.substring(2, 4); // 41
      const extraDigit = cleaned.substring(4, 5); // 9
      const number = cleaned.substring(5); // 88887777

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
      const activeSessions = this.getActiveSessions();
      console.log(`Sessions status:`, activeSessions);

      // Log individual session details
      for (const [sessionId, session] of this.sessions.entries()) {
        console.log(
          `  ${sessionId}: ${session.status}, messages this minute: ${session.messageCount}`
        );
      }
    }, 300000);
  }

  /**
   * Shutdown all WhatsApp clients gracefully
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log('Shutting down all WhatsApp clients...');

    const promises = Array.from(this.sessions.entries()).map(async ([sessionId, session]) => {
      try {
        await session.client.destroy();
        console.log(`✓ Session ${sessionId} shut down`);
      } catch (error) {
        console.error(`Error destroying client for session ${sessionId}:`, error);
      }
    });

    await Promise.all(promises);
    this.sessions.clear();

    console.log('All WhatsApp clients shut down');
  }
}
