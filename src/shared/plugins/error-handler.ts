import { FastifyPluginAsync } from 'fastify';
import { AppError } from '@shared/lib/errors';

export const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.setErrorHandler((error, request, reply) => {
        if (error instanceof AppError) {
            reply.status(error.statusCode).send({
                error: {
                    message: error.message,
                    code: error.code
                }
            });
        } else if (error.validation) {
            reply.status(400).send({
                error: {
                    message: 'Validation error',
                    code: 'VALIDATION_ERROR',
                    details: error.validation
                }
            });
        } else {
            fastify.log.error(error);
            reply.status(500).send({
                error: {
                    message: 'Internal server error',
                    code: 'INTERNAL_ERROR'
                }
            });
        }
    });
}; 