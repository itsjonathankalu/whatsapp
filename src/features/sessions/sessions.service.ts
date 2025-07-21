import { clientManager } from '@shared/whatsapp/client-manager';
import { logger } from '@shared/lib/logger';
import { SessionStatus } from './sessions.schema';

export class SessionsService {
    async initializeSession(tenantId: string): Promise<SessionStatus> {
        const instance = await clientManager.getOrCreateClient(tenantId);

        if (instance.isReady) {
            return {
                sessionId: tenantId,
                status: 'connected',
                connectedAt: instance.connectedAt?.toISOString()
            };
        }

        // Wait for QR code
        await new Promise(resolve => setTimeout(resolve, 2000));

        return {
            sessionId: tenantId,
            status: 'waiting_qr',
            qrCode: instance.qrCode
        };
    }

    async getSessionStatus(tenantId: string): Promise<SessionStatus> {
        // First try to get existing
        let instance = clientManager.getClient(tenantId);

        // If doesn't exist, create it
        if (!instance) {
            instance = await clientManager.getOrCreateClient(tenantId);
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