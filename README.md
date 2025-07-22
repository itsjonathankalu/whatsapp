# Simplified WhatsApp Service

A focused WhatsApp service that does one thing well: **managing WhatsApp connections and sending messages**.

## What This Service Does

- ✅ Manages WhatsApp client sessions
- ✅ Sends text messages  
- ✅ Provides session status
- ✅ QR code generation for authentication
- ✅ Simple internal API for gateway integration

## What It Doesn't Do

- ❌ API authentication (gateway's job)
- ❌ Rate limiting (gateway's job)  
- ❌ User management (gateway's job)
- ❌ Complex error handling
- ❌ Database operations
- ❌ CORS, security headers, etc.

## Architecture

```
Gateway (handles API concerns) → WhatsApp Service (just WhatsApp operations)
   - Authentication ✓                - Validate internal secret
   - Rate limiting ✓                 - Manage WhatsApp clients  
   - API keys ✓                      - Send messages
   - User validation ✓                - Report status
   - Error formatting ✓
```

## API Endpoints

All requests require `X-Internal-Secret` and `X-Tenant-Id` headers.

### POST /send
Send a message to a phone number.
```json
{
  "to": "5511999999999",
  "message": "Hello from TicTic!"
}
```

### GET /status
Get session status for the tenant specified in headers.

### POST /session
Create/initialize a WhatsApp session for the tenant specified in headers.

### GET /health
Service health check with active session count. (No tenant required)

## Environment Variables

```bash
INTERNAL_SECRET=your-super-secret-key-here
PORT=3000  # optional, defaults to 3000
```

## Quick Start

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker
```bash
docker-compose up -d
```

## Benefits of This Approach

1. **Dead simple** - ~100 lines of code total
2. **Focused** - Only does WhatsApp, nothing else
3. **Fast** - No framework overhead
4. **Easy to debug** - Everything in two files
5. **Stateless API** - State only in WhatsApp clients
6. **Resource efficient** - Minimal memory footprint

## File Structure

```
whatsapp/
├── src/
│   ├── server.ts           # Simple HTTP server with routing
│   └── whatsapp-manager.ts # WhatsApp client management
├── sessions/               # WhatsApp session storage
├── package.json           # Minimal dependencies
├── Dockerfile             # Simple single-stage build
└── docker-compose.yml     # Basic service setup
```

## Gateway Integration Example

```typescript
// In your Cloudflare Worker or API Gateway
async function sendWhatsAppMessage(to: string, message: string, tenantId: string) {
  const response = await fetch(`${WHATSAPP_SERVICE_URL}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': INTERNAL_SECRET,
      'X-Tenant-Id': tenantId
    },
    body: JSON.stringify({ to, message })
  });

  if (!response.ok) {
    throw new Error('WhatsApp service error');
  }

  return response.json();
}

async function getWhatsAppStatus(tenantId: string) {
  const response = await fetch(`${WHATSAPP_SERVICE_URL}/status`, {
    method: 'GET',
    headers: {
      'X-Internal-Secret': INTERNAL_SECRET,
      'X-Tenant-Id': tenantId
    }
  });

  return response.json();
}

async function createWhatsAppSession(tenantId: string) {
  const response = await fetch(`${WHATSAPP_SERVICE_URL}/session`, {
    method: 'POST',
    headers: {
      'X-Internal-Secret': INTERNAL_SECRET,
      'X-Tenant-Id': tenantId
    }
  });

  return response.json();
}
```

## When to Add Complexity Back

Only add features when you actually need them:
- **Message queuing** - When you hit rate limits
- **Bulk sending** - When users ask for it  
- **Media support** - When text isn't enough
- **Webhooks** - When you need delivery status
- **Persistence** - When session loss becomes a problem

This service can handle hundreds of concurrent sessions with minimal resources. It's not fancy, but it's rock solid and maintainable.
