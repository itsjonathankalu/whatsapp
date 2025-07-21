import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

import { config } from '@shared/lib/config';
import { errorHandlerPlugin } from '@shared/plugins/error-handler';
import { UnauthorizedError } from '@shared/lib/errors';

import { sessionsRoutes } from '@features/sessions';
import { messagesRoutes } from '@features/messages';
import { webhooksRoutes } from '@features/webhooks';
import { healthRoutes } from '@features/health';

export async function buildApp() {
    const app = Fastify({
        logger: {
            level: config.logLevel,
            transport: config.isDevelopment ? {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname'
                }
            } : undefined
        }
    }).withTypeProvider<TypeBoxTypeProvider>();

    // Security
    await app.register(helmet);
    await app.register(cors, {
        origin: true,
        credentials: true
    });

    // Rate limiting
    if (config.features.enableRateLimit) {
        await app.register(rateLimit, {
            max: 100,
            timeWindow: '1 minute'
        });
    }

    // Global error handler
    await app.register(errorHandlerPlugin);

    // Auth hook for API routes
    app.addHook('onRequest', async (request, reply) => {
        // Skip auth for health check
        if (request.url.startsWith('/health')) {
            return;
        }

        const apiKey = request.headers['x-api-key'] as string;
        const tenantId = request.headers['x-tenant-id'] as string;

        if (!apiKey) {
            throw new UnauthorizedError('API key is required');
        }

        if (apiKey !== config.apiKey) {
            throw new UnauthorizedError('Invalid API key');
        }

        if (!tenantId) {
            throw new UnauthorizedError('Tenant ID is required');
        }

        request.tenantId = tenantId;
    });

    // Routes
    await app.register(healthRoutes, { prefix: '/health' });
    await app.register(sessionsRoutes, { prefix: '/api/v1/sessions' });
    await app.register(messagesRoutes, { prefix: '/api/v1/messages' });
    await app.register(webhooksRoutes, { prefix: '/api/v1/webhooks' });

    return app;
} 