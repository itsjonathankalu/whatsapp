import { clientManager } from '@shared/whatsapp/client-manager';
import { logger } from '@shared/lib/logger';
import { NotFoundError } from '@shared/lib/errors';
import { SessionStatus } from './sessions.schema';

export class SessionsService {
    async initializeSession(tenantId: string): Promise<SessionStatus> {
        let instance = clientManager.getClient(tenantId);

        if (instance?.isReady) {
            return {
                sessionId: tenantId,
                status: 'connected',
                connectedAt: instance.connectedAt?.toISOString()
            };
        }

        if (!instance) {
            instance = await clientManager.createClient(tenantId);
        }

        // Wait a bit for QR code generation
        await new Promise(resolve => setTimeout(resolve, 2000));

        return {
            sessionId: tenantId,
            status: 'waiting_qr',
            qrCode: instance.qrCode
        };
    }

    async getSessionStatus(tenantId: string): Promise<SessionStatus> {
        const instance = clientManager.getClient(tenantId);

        if (!instance) {
            return {
                sessionId: tenantId,
                status: 'disconnected'
            };
        }

        if (instance.isReady) {
            return {
                sessionId: tenantId,
                status: 'connected',
                connectedAt: instance.connectedAt?.toISOString()
            };
        }

        return {
            sessionId: tenantId,
            status: 'waiting_qr',
            qrCode: instance.qrCode
        };
    }

    async terminateSession(tenantId: string): Promise<void> {
        await clientManager.destroyClient(tenantId);
        logger.info(`Session terminated for tenant ${tenantId}`);
    }
} 