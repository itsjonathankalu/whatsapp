# Session Usage Guide

Your WhatsApp service requires session IDs for all operations, allowing you to manage multiple WhatsApp connections from a single service instance.

## How It Works

- **Session ID is mandatory** - Must be provided via `X-Session-Id` header
- **Sessions are lazy-loaded** - Created when first requested
- **Persistent storage** - Sessions survive container restarts via Docker volumes
- **Independent connections** - Each session maintains its own WhatsApp connection

## API Examples

### Basic Usage

Every operation requires a session ID:

```bash
# Get QR code to set up a session
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Session-Id: my-session" \
  http://localhost:3000/qr

# Send message once session is ready
curl -X POST http://localhost:3000/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Session-Id: my-session" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999887766",
    "message": "Hello from WhatsApp!"
  }'
```

### Multiple Sessions

Use different session IDs for different WhatsApp accounts:

```bash
# Sales team WhatsApp
curl -X POST http://localhost:3000/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Session-Id: sales" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999887766",
    "message": "Hello from Sales!"
  }'

# Support team WhatsApp
curl -X POST http://localhost:3000/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Session-Id: support" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999887766",
    "message": "Hello from Support!"
  }'
```

### Session Management

```bash
# Check specific session status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Session-Id: sales" \
  http://localhost:3000/status

# Response for ready session:
{
  "sessionId": "sales",
  "status": "ready",
  "message": "Connected and ready to send messages",
  "connectedAt": "2024-01-15T10:30:00.000Z",
  "messageCount": 5
}

# Response for new session:
{
  "sessionId": "new-session",
  "status": "not_found",
  "message": "Session does not exist. Request QR code to create."
}
```

### QR Code Setup

```bash
# Get QR for new session (creates session automatically)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Session-Id: marketing" \
  http://localhost:3000/qr

# Response when QR is ready:
{
  "sessionId": "marketing",
  "status": "waiting_qr",
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "message": "Scan this QR code with WhatsApp"
}
```

### Health Check (All Sessions)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/health

# Response:
{
  "status": "ok",
  "sessions": {
    "total": 3,
    "ready": 2,
    "waiting_qr": 1,
    "initializing": 0,
    "failed": 0
  },
  "uptime": 3600
}
```

## Session States

- **`not_found`** - Session doesn't exist (request QR to create)
- **`initializing`** - Session is starting up
- **`waiting_qr`** - Needs QR code scan
- **`ready`** - Connected and ready to send messages
- **`failed`** - Authentication failed (request new QR)

## Session ID Requirements

Session IDs must be:

- **Alphanumeric** with hyphens and underscores only: `a-z`, `A-Z`, `0-9`, `-`, `_`
- **Maximum 50 characters**
- **Examples**: `sales`, `support-team`, `client_123`, `production-br`

❌ **Invalid**: `sales@team`, `support team`, `client#123`
✅ **Valid**: `sales-team`, `support_team`, `client-123`

## Docker Persistence

Sessions persist across container restarts using Docker volumes:

```yaml
# docker-compose.yml
services:
  whatsapp:
    volumes:
      - whatsapp-sessions:/app/.wwebjs_auth
    # ... other config

volumes:
  whatsapp-sessions:
```

## Resource Usage

⚠️ **Important**: Each session uses ~512MB RAM (Chromium). Plan accordingly.

- 1 session = ~512MB RAM
- 3 sessions = ~1.5GB RAM
- 5 sessions = ~2.5GB RAM

## Common Workflows

### First Time Setup

1. **Request QR**: `GET /qr` with session ID
2. **Scan QR**: Use WhatsApp app to scan the code
3. **Check status**: `GET /status` until status is `ready`
4. **Send messages**: `POST /send` works now

### Session Recovery (after restart)

1. **Send message**: Try `POST /send` with existing session ID
2. **Auto-recovery**: Service automatically loads persisted session
3. **If failed**: Request new QR and re-authenticate

### Error Handling

```bash
# If session not ready
curl -X POST http://localhost:3000/send \
  -H "X-Session-Id: not-ready" \
  # ... other headers and data

# Response:
{
  "error": "Session 'not-ready' not ready. Status: waiting_qr. Please check QR code endpoint."
}

# Fix: Get QR and scan
curl -H "X-Session-Id: not-ready" http://localhost:3000/qr
```

## Example Use Cases

1. **Multi-department**: `sales`, `support`, `marketing`, `billing`
2. **Regional services**: `us-east`, `brazil`, `europe`, `asia`
3. **Environments**: `development`, `staging`, `production`
4. **Client isolation**: `client-acme`, `client-globo`, `client-tech`
5. **Product lines**: `ecommerce`, `saas`, `mobile-app`

## Best Practices

1. **Use descriptive session IDs**: `sales-team` not `session1`
2. **Monitor memory usage**: Each session needs ~512MB
3. **Plan authentication**: Each session needs QR scan setup
4. **Handle failures**: Sessions can disconnect, check status
5. **Start with one session**: Add more only when needed
6. **Use health endpoint**: Monitor overall service status

## Error Messages

| Error                         | Meaning                          | Solution                               |
| ----------------------------- | -------------------------------- | -------------------------------------- |
| `Missing X-Session-Id header` | No session ID provided           | Add `X-Session-Id` header              |
| `Invalid session ID`          | Session ID format wrong          | Use alphanumeric + hyphens/underscores |
| `Session not ready`           | Session exists but not connected | Check `/qr` or `/status` endpoints     |
| `Session does not exist`      | Session ID not found             | Request `/qr` to create session        |
