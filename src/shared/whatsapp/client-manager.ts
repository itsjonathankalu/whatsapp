import { Client, LocalAuth } from 'whatsapp-web.js';
import { logger } from '@shared/lib/logger';
import { config } from '@shared/lib/config';
import { ConflictError, ServiceUnavailableError } from '@shared/lib/errors';
import { EventEmitter } from 'events';

export interface ClientInstance {
    client: Client;
    tenantId: string;
    isReady: boolean;
    qrCode?: string;
    connectedAt?: Date;
    createdAt: Date;
}

export class WhatsAppClientManager extends EventEmitter {
    private clients = new Map<string, ClientInstance>();
    private initializing = new Map<string, Promise<ClientInstance>>();

    async getOrCreateClient(tenantId: string): Promise<ClientInstance> {
        // Return existing client
        const existing = this.clients.get(tenantId);
        if (existing) return existing;

        // Return in-progress initialization
        const inProgress = this.initializing.get(tenantId);
        if (inProgress) return inProgress;

        // Start new initialization
        const initPromise = this.createClient(tenantId);
        this.initializing.set(tenantId, initPromise);

        try {
            const instance = await initPromise;
            return instance;
        } finally {
            this.initializing.delete(tenantId);
        }
    }

    getClient(tenantId: string): ClientInstance | undefined {
        return this.clients.get(tenantId);
    }

    private async createClient(tenantId: string): Promise<ClientInstance> {
        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: tenantId,
                dataPath: config.whatsapp.sessionPath
            }),
            puppeteer: {
                headless: config.whatsapp.headless,
                args: config.whatsapp.puppeteerArgs
            }
        });

        const instance: ClientInstance = {
            client,
            tenantId,
            isReady: false,
            createdAt: new Date()
        };

        this.setupEventHandlers(client, instance);
        this.clients.set(tenantId, instance);

        await client.initialize();
        return instance;
    }

    private setupEventHandlers(client: Client, instance: ClientInstance) {
        client.on('qr', (qr) => {
            logger.info(`QR code generated for tenant ${instance.tenantId}`);
            instance.qrCode = qr;
            this.emit('qr', { tenantId: instance.tenantId, qr });
        });

        client.on('ready', () => {
            logger.info(`✅ WhatsApp client ready for tenant ${instance.tenantId}`);
            instance.isReady = true;
            instance.connectedAt = new Date();
            instance.qrCode = undefined;
            this.emit('ready', { tenantId: instance.tenantId });
        });

        client.on('authenticated', () => {
            logger.info(`🔐 Session authenticated for tenant ${instance.tenantId}`);
        });

        client.on('auth_failure', (message) => {
            logger.warn(`⚠️  Auth failure for tenant ${instance.tenantId}: ${message}`);
        });

        client.on('disconnected', (reason) => {
            logger.warn(`WhatsApp client disconnected for tenant ${instance.tenantId}: ${reason}`);
            instance.isReady = false;
            this.emit('disconnected', { tenantId: instance.tenantId, reason });
        });

        client.on('message', async (message) => {
            this.emit('message', {
                tenantId: instance.tenantId,
                message
            });
        });

        client.on('message_ack', async (message, ack) => {
            this.emit('message_ack', {
                tenantId: instance.tenantId,
                message,
                ack
            });
        });
    }

    async destroyClient(tenantId: string): Promise<void> {
        const instance = this.clients.get(tenantId);
        if (!instance) return;

        try {
            await instance.client.destroy();
        } catch (error) {
            logger.error(`Error destroying client for tenant ${tenantId}:`, error);
        } finally {
            this.clients.delete(tenantId);
        }
    }

    async waitForReady(tenantId: string, timeoutMs = 30000): Promise<ClientInstance> {
        const instance = this.clients.get(tenantId);
        if (!instance) {
            throw new ServiceUnavailableError('Client not found');
        }

        if (instance.isReady) {
            return instance;
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new ServiceUnavailableError('Client initialization timeout'));
            }, timeoutMs);

            const checkReady = () => {
                if (instance.isReady) {
                    clearTimeout(timeout);
                    resolve(instance);
                } else {
                    setTimeout(checkReady, 1000);
                }
            };

            checkReady();
        });
    }

    async shutdown(): Promise<void> {
        logger.info('Shutting down all WhatsApp clients...');

        const promises = Array.from(this.clients.entries()).map(([tenantId]) =>
            this.destroyClient(tenantId)
        );

        await Promise.all(promises);
        this.clients.clear();

        logger.info('All WhatsApp clients shut down');
    }

    getActiveClients(): Array<{ tenantId: string; isReady: boolean; connectedAt?: Date }> {
        return Array.from(this.clients.entries()).map(([tenantId, instance]) => ({
            tenantId,
            isReady: instance.isReady,
            connectedAt: instance.connectedAt
        }));
    }
}

export const clientManager = new WhatsAppClientManager(); 