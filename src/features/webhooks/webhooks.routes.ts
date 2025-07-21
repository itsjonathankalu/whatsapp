import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { WebhookConfigSchema, WebhookListSchema } from './webhooks.schema';
import { WebhooksService } from './webhooks.service';

export const webhooksRoutes: FastifyPluginAsync = async (server) => {
    const service = new WebhooksService();

    // Create webhook
    server.post('/', {
        schema: {
            body: WebhookConfigSchema,
            response: {
                201: Type.Object({
                    id: Type.String(),
                    message: Type.String()
                })
            }
        }
    }, async (request, reply) => {
        const { tenantId } = request;
        const webhookId = await service.createWebhook(tenantId, request.body as any);

        return reply.code(201).send({
            id: webhookId,
            message: 'Webhook created successfully'
        });
    });

    // List webhooks
    server.get('/', {
        schema: {
            response: {
                200: WebhookListSchema
            }
        }
    }, async (request, reply) => {
        const { tenantId } = request;
        const webhooks = service.getWebhooks(tenantId);

        return reply.send({
            webhooks: webhooks.map(w => ({
                id: w.id,
                url: w.url,
                events: w.events,
                createdAt: w.createdAt.toISOString()
            }))
        });
    });

    // Delete webhook
    server.delete('/:id', async (request, reply) => {
        const { tenantId } = request;
        const { id } = request.params as { id: string };

        const deleted = service.deleteWebhook(tenantId, id);

        if (!deleted) {
            return reply.code(404).send({
                error: {
                    message: 'Webhook not found',
                    code: 'NOT_FOUND'
                }
            });
        }

        return reply.send({ message: 'Webhook deleted' });
    });
}; 