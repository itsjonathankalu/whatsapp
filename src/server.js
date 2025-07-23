import { createServer } from 'http';
import { WhatsAppManager } from './manager.js';

const manager = new WhatsAppManager();
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('AUTH_TOKEN environment variable is required');
  process.exit(1);
}

// Add validation functions
const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 8 && cleaned.length <= 15;
};

const validateMessage = (message) =>
  message && typeof message === 'string' && message.length <= 4096;

const validateSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  // Session ID should be alphanumeric, hyphens, underscores (reasonable identifier)
  return /^[a-zA-Z0-9_-]+$/.test(sessionId) && sessionId.length <= 50;
};

/**
 * Extract session ID from request headers - now mandatory
 * @param {import('http').IncomingMessage} req
 * @returns {string|null}
 */
const getSessionId = (req) => req.headers['x-session-id'] || null;

/**
 * Parse JSON body from request
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<any>}
 */
const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
  });

/**
 * Send JSON response
 * @param {import('http').ServerResponse} res
 * @param {number} statusCode
 * @param {any} data
 */
const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const server = createServer(async (req, res) => {
  // Simple auth check
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendJson(res, 401, { error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  if (token !== AUTH_TOKEN) {
    sendJson(res, 401, { error: 'Invalid token' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    // Health check - no session ID required
    if (url.pathname === '/health' && req.method === 'GET') {
      const activeSessions = manager.getActiveSessions();
      sendJson(res, 200, {
        status: 'ok',
        sessions: activeSessions,
        uptime: process.uptime(),
      });
      return;
    }

    // All other endpoints require session ID
    const sessionId = getSessionId(req);
    if (!sessionId) {
      sendJson(res, 400, {
        error: 'Missing X-Session-Id header. Session ID is required for all operations.',
      });
      return;
    }

    if (!validateSessionId(sessionId)) {
      sendJson(res, 400, {
        error:
          'Invalid session ID. Use alphanumeric characters, hyphens, and underscores only (max 50 chars).',
      });
      return;
    }

    // Send message
    if (url.pathname === '/send' && req.method === 'POST') {
      const body = await parseBody(req);

      if (!validatePhone(body.to)) {
        sendJson(res, 400, { error: 'Invalid phone number' });
        return;
      }

      if (!validateMessage(body.message)) {
        sendJson(res, 400, { error: 'Invalid message (max 4096 chars)' });
        return;
      }

      const result = await manager.sendMessage(sessionId, body.to, body.message);
      sendJson(res, 200, result);
      return;
    }

    // Get QR code for setup
    if (url.pathname === '/qr' && req.method === 'GET') {
      const qr = await manager.getQR(sessionId);
      sendJson(res, 200, qr);
      return;
    }

    // Get session status
    if (url.pathname === '/status' && req.method === 'GET') {
      const status = manager.getStatus(sessionId);
      sendJson(res, 200, status);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('Error:', error);
    sendJson(res, 500, { error: error.message || 'Internal server error' });
  }
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);

  try {
    await manager.shutdown();
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});

// Start cleanup interval
manager.startCleanupInterval();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WhatsApp HTTP service running on :${PORT}`);
  console.log('Session ID required via X-Session-Id header for all operations');
});
