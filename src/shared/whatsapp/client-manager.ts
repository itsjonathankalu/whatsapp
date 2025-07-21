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

    getClient(tenantId: string): ClientInstance | undefined {
        return this.clients.get(tenantId);
    }

    async createClient(tenantId: string): Promise<ClientInstance> {
        if (this.clients.has(tenantId)) {
            throw new ConflictError('Client already exists for this tenant');
        }

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
            logger.info(`WhatsApp client ready for tenant ${instance.tenantId}`);
            instance.isReady = true;
            instance.connectedAt = new Date();
            instance.qrCode = undefined;
            this.emit('ready', { tenantId: instance.tenantId });
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