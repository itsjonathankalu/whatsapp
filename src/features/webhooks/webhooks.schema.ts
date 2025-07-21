import { Type, Static } from '@sinclair/typebox';

export const WebhookConfigSchema = Type.Object({
    url: Type.String({ format: 'uri' }),
    events: Type.Array(Type.Union([
        Type.Literal('connected'),
        Type.Literal('disconnected'),
        Type.Literal('message'),
        Type.Literal('message_ack')
    ])),
    headers: Type.Optional(Type.Record(Type.String(), Type.String())),
    secret: Type.Optional(Type.String())
});

export const WebhookListSchema = Type.Object({
    webhooks: Type.Array(Type.Object({
        id: Type.String(),
        url: Type.String(),
        events: Type.Array(Type.String()),
        createdAt: Type.String()
    }))
});

export type WebhookConfig = Static<typeof WebhookConfigSchema>; 