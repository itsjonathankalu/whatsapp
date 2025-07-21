export interface TenantContext {
    tenantId: string;
}

export interface MessageMedia {
    filename: string;
    mimetype: string;
    data: string; // base64
}

export interface WebhookEvent {
    event: 'connected' | 'disconnected' | 'message' | 'message_ack';
    tenantId: string;
    timestamp: string;
    data: any;
} 