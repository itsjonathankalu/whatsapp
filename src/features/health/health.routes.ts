import { FastifyPluginAsync } from 'fastify';
import { HealthService } from './health.service';

export const healthRoutes: FastifyPluginAsync = async (server) => {
    const service = new HealthService();

    server.get('/', async (request, reply) => {
        const health = await service.getHealth();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        return reply.code(statusCode).send(health);
    });
}; 