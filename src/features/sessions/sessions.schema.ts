import { Type, Static } from '@sinclair/typebox';

export const SessionStatusSchema = Type.Object({
    sessionId: Type.String(),
    status: Type.Union([
        Type.Literal('connected'),
        Type.Literal('disconnected'),
        Type.Literal('waiting_qr')
    ]),
    qrCode: Type.Optional(Type.String()),
    connectedAt: Type.Optional(Type.String({ format: 'date-time' }))
});

export type SessionStatus = Static<typeof SessionStatusSchema>; 