import 'dotenv/config';
import { buildApp } from './app';
import { logger } from '@shared/lib/logger';
import { config } from '@shared/lib/config';
import { clientManager } from '@shared/whatsapp/client-manager';

async function start() {
    try {
        const app = await buildApp();

        await app.listen({
            port: config.port,
            host: '0.0.0.0'
        });

        logger.info(`TickTick WhatsApp API running on port ${config.port}`);
    } catch (error) {
        logger.error('Failed to start server', error);
        process.exit(1);
    }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    try {
        await clientManager.shutdown();
        logger.info('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
};

['SIGTERM', 'SIGINT'].forEach(signal => {
    process.on(signal, () => gracefulShutdown(signal));
});

start(); 