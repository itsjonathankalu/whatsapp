import { createServer } from 'http';
import { WhatsAppManager } from './whatsapp-manager.js';

const manager = new WhatsAppManager();
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

if (!INTERNAL_SECRET) {
  console.error('INTERNAL_SECRET environment variable is required');
  process.exit(1);
}

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
  // Validate internal secret
  if (req.headers['x-internal-secret'] !== INTERNAL_SECRET) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    // Health check (no tenant required)
    if (url.pathname === '/health' && req.method === 'GET') {
      sendJson(res, 200, {
        status: 'ok',
        sessions: manager.getActiveSessions(),
      });
      return;
    }

    // All other endpoints require tenant ID
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      sendJson(res, 400, { error: 'Tenant ID required' });
      return;
    }

    // Route: POST /send
    if (url.pathname === '/send' && req.method === 'POST') {
      const body = await parseBody(req);
      const result = await manager.sendMessage(tenantId, body.to, body.message);
      sendJson(res, 200, result);
      return;
    }

    // Route: GET /status
    if (url.pathname === '/status' && req.method === 'GET') {
      const status = await manager.getStatus(tenantId);
      sendJson(res, 200, status);
      return;
    }

    // Route: POST /sessions
    if (url.pathname === '/sessions' && req.method === 'POST') {
      const session = await manager.createSession(tenantId);
      sendJson(res, 200, session);
      return;
    }

    // 404
    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('Error:', error);
    sendJson(res, 500, {
      error: 'Internal error',
      message: error.message,
    });
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WhatsApp service running on :${PORT}`);
});
