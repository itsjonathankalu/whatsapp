import { FastifyPluginAsync } from 'fastify';
import { SessionStatusSchema } from './sessions.schema';
import { SessionsService } from './sessions.service';

export const sessionsRoutes: FastifyPluginAsync = async (server) => {
    const service = new SessionsService();

    // Initialize session
    server.post('/', {
        schema: {
            response: {
                200: SessionStatusSchema
            }
        }
    }, async (request, reply) => {
        const { tenantId } = request;
        const status = await service.initializeSession(tenantId);
        return reply.send(status);
    });

    // Get session status
    server.get('/status', {
        schema: {
            response: {
                200: SessionStatusSchema
            }
        }
    }, async (request, reply) => {
        const { tenantId } = request;
        const status = await service.getSessionStatus(tenantId);
        return reply.send(status);
    });

    // Terminate session
    server.delete('/', async (request, reply) => {
        const { tenantId } = request;
        await service.terminateSession(tenantId);
        return reply.send({ message: 'Session terminated' });
    });
}; 