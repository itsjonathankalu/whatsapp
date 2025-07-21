import { Type, Static } from '@sinclair/typebox';

export const SendMessageSchema = Type.Object({
    to: Type.String({
        pattern: '^[0-9+\\-\\s()]+$',
        description: 'Phone number (various formats accepted)'
    }),
    message: Type.String({
        minLength: 1,
        maxLength: 4096
    }),
    media: Type.Optional(Type.Object({
        filename: Type.String(),
        mimetype: Type.String(),
        data: Type.String({ description: 'Base64 encoded media' })
    }))
});

export const MessageSentSchema = Type.Object({
    id: Type.String(),
    timestamp: Type.String({ format: 'date-time' }),
    to: Type.String()
});

export type SendMessageInput = Static<typeof SendMessageSchema>;
export type MessageSent = Static<typeof MessageSentSchema>; 