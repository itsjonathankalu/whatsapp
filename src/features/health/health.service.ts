import { clientManager } from '@shared/whatsapp/client-manager';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime: number;
    clients: Array<{
        tenantId: string;
        connected: boolean;
    }>;
}

export class HealthService {
    async getHealth(): Promise<HealthStatus> {
        const activeClients = clientManager.getActiveClients();
        const hasConnectedClient = activeClients.some(c => c.isReady);

        return {
            status: hasConnectedClient ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            clients: activeClients.map(client => ({
                tenantId: client.tenantId,
                connected: client.isReady
            }))
        };
    }
} 