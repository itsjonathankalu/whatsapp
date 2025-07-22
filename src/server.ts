import { createServer } from 'http';
import { WhatsAppManager } from './whatsapp-manager.js';

const manager = new WhatsAppManager();
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'your-secret-here';

const server = createServer(async (req, res) => {
    // Only accept requests from gateway
    if (req.headers['x-internal-secret'] !== INTERNAL_SECRET) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
    }

    // Simple routing
    const url = new URL(req.url!, `http://${req.headers.host}`);

    try {
        // Health check (no tenant required)
        if (url.pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                sessions: manager.getActiveSessions()
            }));
            return;
        }

        // All other endpoints require tenant ID
        const tenantId = req.headers['x-tenant-id'] as string;
        if (!tenantId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Tenant ID required' }));
            return;
        }
        // Route: POST /send
        if (url.pathname === '/send' && req.method === 'POST') {
            const body = await getBody(req);
            const result = await manager.sendMessage(tenantId, body.to, body.message);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }

        // Route: GET /status
        if (url.pathname === '/status' && req.method === 'GET') {
            const status = await manager.getStatus(tenantId);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status));
            return;
        }

        // Route: POST /session
        if (url.pathname === '/session' && req.method === 'POST') {
            const session = await manager.createSession(tenantId);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(session));
            return;
        }

        // 404
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));

    } catch (error) {
        console.error('Error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({
            error: 'Internal error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }));
    }
});

// Helper to parse JSON body
async function getBody(req: any): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(e);
            }
        });
    });
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
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

['SIGTERM', 'SIGINT'].forEach(signal => {
    process.on(signal, () => gracefulShutdown(signal));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`WhatsApp service running on :${PORT}`);
}); 