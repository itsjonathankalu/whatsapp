import { FastifyPluginAsync } from 'fastify';
import { UnauthorizedError } from '@shared/lib/errors';
import { config } from '@shared/lib/config';

declare module 'fastify' {
    interface FastifyRequest {
        tenantId: string;
    }
}

export const authPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.addHook('onRequest', async (request, reply) => {
        // Skip auth for health check
        if (request.url.startsWith('/health')) return;

        const apiKey = request.headers['x-api-key'] as string;
        const tenantId = request.headers['x-tenant-id'] as string;

        if (!apiKey || apiKey !== config.apiKey) {
            throw new UnauthorizedError('Invalid API key');
        }

        if (!tenantId) {
            throw new UnauthorizedError('Tenant ID is required');
        }

        request.tenantId = tenantId;
    });
}; 