import { FastifyPluginAsync } from 'fastify';
import { SendMessageSchema, MessageSentSchema } from './messages.schema';
import { MessagesService } from './messages.service';

export const messagesRoutes: FastifyPluginAsync = async (server) => {
    const service = new MessagesService();

    // Send message
    server.post('/send', {
        schema: {
            body: SendMessageSchema,
            response: {
                200: MessageSentSchema
            }
        }
    }, async (request, reply) => {
        const { tenantId } = request;
        const result = await service.sendMessage(tenantId, request.body as any);
        return reply.send(result);
    });
}; 