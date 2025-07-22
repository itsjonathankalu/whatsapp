import { Client, LocalAuth } from 'whatsapp-web.js';

interface WhatsAppSession {
    client: Client;
    status: 'initializing' | 'ready' | 'failed';
    qrCode?: string;
    connectedAt?: Date;
}

export class WhatsAppManager {
    private sessions = new Map<string, WhatsAppSession>();

    async createSession(tenantId: string): Promise<any> {
        // Return existing if available
        if (this.sessions.has(tenantId)) {
            return this.getStatus(tenantId);
        }

        const client = new Client({
            authStrategy: new LocalAuth({ clientId: tenantId }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        const session: WhatsAppSession = {
            client,
            status: 'initializing'
        };

        this.sessions.set(tenantId, session);

        // Handle QR
        client.on('qr', (qr) => {
            session.qrCode = qr;
        });

        // Handle ready
        client.on('ready', () => {
            session.status = 'ready';
            session.connectedAt = new Date();
            session.qrCode = undefined;
            console.log(`✓ Session ready: ${tenantId}`);
        });

        // Handle failure
        client.on('auth_failure', () => {
            session.status = 'failed';
            this.sessions.delete(tenantId);
        });

        // Initialize
        await client.initialize();

        // Wait a bit for QR
        await new Promise(resolve => setTimeout(resolve, 2000));

        return this.getStatus(tenantId);
    }

    async sendMessage(tenantId: string, to: string, message: string): Promise<any> {
        const session = this.sessions.get(tenantId);

        if (!session || session.status !== 'ready') {
            throw new Error('Session not ready');
        }

        // Simple phone formatting for Brazil
        let phone = to.replace(/\D/g, '');
        if (!phone.startsWith('55')) {
            phone = '55' + phone;
        }

        const chatId = phone + '@c.us';
        const result = await session.client.sendMessage(chatId, message);

        return {
            id: result.id._serialized,
            timestamp: new Date().toISOString(),
            to: phone
        };
    }

    getStatus(tenantId: string): any {
        const session = this.sessions.get(tenantId);

        if (!session) {
            return { status: 'not_found' };
        }

        return {
            status: session.status,
            qrCode: session.qrCode,
            connectedAt: session.connectedAt
        };
    }

    getActiveSessions(): number {
        return Array.from(this.sessions.values())
            .filter(s => s.status === 'ready')
            .length;
    }

    async shutdown(): Promise<void> {
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