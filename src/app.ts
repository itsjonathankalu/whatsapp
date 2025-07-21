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

    // Root route - API info
    app.get('/', async (request, reply) => {
        return reply.send({
            name: "TicTic WhatsApp API",
            version: "1.0.0",
            message: "🚀 A API do WhatsApp que realmente funciona",
            documentation: "https://docs.tictic.dev",
            endpoints: {
                health: "/health",
                sessions: "/v1/sessions",
                messages: "/v1/messages"
            },
            status: "operational"
        });
    });

    // Auth hook for API routes
    app.addHook('onRequest', async (request, reply) => {
        // Skip auth for health check and root route
        if (request.url.startsWith('/health') || request.url === '/') {
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
    await app.register(sessionsRoutes, { prefix: '/v1/sessions' });
    await app.register(messagesRoutes, { prefix: '/v1/messages' });

    return app;
} 