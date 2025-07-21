import { clientManager } from '@shared/whatsapp/client-manager';
import { PhoneUtils } from '@shared/lib/phone-utils';
import { BadRequestError, ServiceUnavailableError } from '@shared/lib/errors';
import { MessageMedia as WppMessageMedia } from 'whatsapp-web.js';
import { SendMessageInput, MessageSent } from './messages.schema';
import { logger } from '@shared/lib/logger';

export class MessagesService {
    async sendMessage(
        tenantId: string,
        input: SendMessageInput
    ): Promise<MessageSent> {
        const instance = await clientManager.waitForReady(tenantId);

        if (!instance.isReady) {
            throw new ServiceUnavailableError('WhatsApp session not connected');
        }

        const chatId = PhoneUtils.toWhatsAppId(input.to);
        let result;

        try {
            if (input.media) {
                const media = new WppMessageMedia(
                    input.media.mimetype,
                    input.media.data,
                    input.media.filename
                );

                result = await instance.client.sendMessage(chatId, media, {
                    caption: input.message
                });
            } else {
                result = await instance.client.sendMessage(chatId, input.message);
            }

            logger.info('Message sent', {
                tenantId,
                to: PhoneUtils.fromWhatsAppId(chatId),
                hasMedia: !!input.media
            });

            return {
                id: result.id._serialized,
                timestamp: new Date(result.timestamp * 1000).toISOString(),
                to: PhoneUtils.fromWhatsAppId(chatId)
            };

        } catch (error) {
            logger.error('Failed to send message', { error, tenantId });
            throw new ServiceUnavailableError('Failed to send message');
        }
    }
} 