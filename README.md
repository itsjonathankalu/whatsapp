# TickTick WhatsApp API v1

A production-ready WhatsApp API built with Node.js, Fastify, and whatsapp-web.js. Clean architecture, TypeScript, and Brazilian phone support.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm run build
npm start
```

## 📚 API Documentation

### Authentication

All requests require:

- `X-API-Key`: Your API key
- `X-Tenant-Id`: Your tenant identifier

### Initialize Session

```bash
POST /api/v1/sessions
X-API-Key: your-api-key
X-Tenant-Id: tenant-123

Response:
{
  "sessionId": "tenant-123",
  "status": "waiting_qr",
  "qrCode": "data:image/png;base64,..."
}
```

### Send Message

```bash
POST /api/v1/messages/send
X-API-Key: your-api-key
X-Tenant-Id: tenant-123
Content-Type: application/json

{
  "to": "11999887766",
  "message": "Hello from TickTick! ✓✓"
}

Response:
{
  "id": "3EB0B430E5...",
  "timestamp": "2024-01-20T10:30:00Z",
  "to": "5511999887766"
}
```

### Configure Webhook

```bash
POST /api/v1/webhooks
X-API-Key: your-api-key
X-Tenant-Id: tenant-123
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",
  "events": ["message", "message_ack"],
  "secret": "your-webhook-secret"
}

Response:
{
  "id": "webhook-uuid",
  "message": "Webhook created successfully"
}
```

### Health Check

```bash
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00Z",
  "version": "1.0.0",
  "uptime": 3600,
  "clients": [
    {
      "tenantId": "tenant-123",
      "connected": true
    }
  ]
}
```

## 🏗️ Architecture

### Feature-based Structure

```
src/
├── features/      # Domain features
├── shared/        # Shared utilities
│   ├── lib/       # Core utilities
│   ├── plugins/   # Fastify plugins
│   └── whatsapp/  # WhatsApp client
```

### Key Design Decisions

- **TypeScript**: Type safety and better DX
- **Fastify**: High performance, built-in validation
- **Feature folders**: Each feature is self-contained
- **Multi-tenant**: Support multiple WhatsApp accounts
- **Brazilian focus**: Proper phone formatting

## 🐳 Docker Deployment

```bash
# Build and run
docker-compose up -d

# With custom API key
API_KEY=your-secret-key docker-compose up -d
```

## 🔒 Environment Variables

```bash
# Required
API_KEY=your-secret-api-key
NODE_ENV=production

# Optional
PORT=3000
LOG_LEVEL=info
ENABLE_WEBHOOKS=true
ENABLE_RATE_LIMIT=true
```

## 📈 Production Checklist

- [ ] Set strong API_KEY
- [ ] Configure rate limiting
- [ ] Set up monitoring
- [ ] Configure webhooks
- [ ] Test error handling
- [ ] Set up backups

## 🤝 Contributing

This is v1 - we focus on reliability over features. Before adding:

1. Ensure it's essential
2. Write tests
3. Update documentation
4. Follow the patterns

---

Built with ❤️ by Brazilian developers who understand WhatsApp is not just an app, it's infrastructure.
