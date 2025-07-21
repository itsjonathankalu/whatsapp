import { clientManager } from '@shared/whatsapp/client-manager';
import { logger } from '@shared/lib/logger';
import { WebhookConfig } from './webhooks.schema';
import crypto from 'crypto';

interface StoredWebhook extends WebhookConfig {
    id: string;
    tenantId: string;
    createdAt: Date;
}

export class WebhooksService {
    private webhooks = new Map<string, StoredWebhook[]>();

    constructor() {
        this.setupGlobalListeners();
    }

    private setupGlobalListeners() {
        clientManager.on('connected', (data) => {
            this.sendWebhookEvent('connected', data.tenantId, data);
        });

        clientManager.on('disconnected', (data) => {
            this.sendWebhookEvent('disconnected', data.tenantId, data);
        });

        clientManager.on('message', (data) => {
            this.sendWebhookEvent('message', data.tenantId, {
                id: data.message.id._serialized,
                from: data.message.from,
                body: data.message.body,
                timestamp: new Date(data.message.timestamp * 1000).toISOString()
            });
        });

        clientManager.on('message_ack', (data) => {
            this.sendWebhookEvent('message_ack', data.tenantId, {
                messageId: data.message.id._serialized,
                ack: data.ack,
                timestamp: new Date().toISOString()
            });
        });
    }

    async createWebhook(tenantId: string, config: WebhookConfig): Promise<string> {
        const webhook: StoredWebhook = {
            ...config,
            id: crypto.randomUUID(),
            tenantId,
            createdAt: new Date()
        };

        const tenantWebhooks = this.webhooks.get(tenantId) || [];
        tenantWebhooks.push(webhook);
        this.webhooks.set(tenantId, tenantWebhooks);

        logger.info('Webhook created', { tenantId, webhookId: webhook.id });
        return webhook.id;
    }

    getWebhooks(tenantId: string): StoredWebhook[] {
        return this.webhooks.get(tenantId) || [];
    }

    deleteWebhook(tenantId: string, webhookId: string): boolean {
        const tenantWebhooks = this.webhooks.get(tenantId) || [];
        const filtered = tenantWebhooks.filter(w => w.id !== webhookId);

        if (filtered.length < tenantWebhooks.length) {
            this.webhooks.set(tenantId, filtered);
            logger.info('Webhook deleted', { tenantId, webhookId });
            return true;
        }

        return false;
    }

    private async sendWebhookEvent(
        event: string,
        tenantId: string,
        data: any
    ): Promise<void> {
        const tenantWebhooks = this.webhooks.get(tenantId) || [];
        const relevantWebhooks = tenantWebhooks.filter(w =>
            w.events.includes(event as any)
        );

        for (const webhook of relevantWebhooks) {
            try {
                const payload = {
                    event,
                    tenantId,
                    timestamp: new Date().toISOString(),
                    data
                };

                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    ...webhook.headers
                };

                if (webhook.secret) {
                    const signature = crypto
                        .createHmac('sha256', webhook.secret)
                        .update(JSON.stringify(payload))
                        .digest('hex');
                    headers['X-Webhook-Signature'] = signature;
                }

                const response = await fetch(webhook.url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    logger.warn('Webhook delivery failed', {
                        webhookId: webhook.id,
                        status: response.status
                    });
                }
            } catch (error) {
                logger.error('Webhook delivery error', {
                    webhookId: webhook.id,
                    error
                });
            }
        }
    }
} 