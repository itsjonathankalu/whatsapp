# WhatsApp HTTP Service

A simple HTTP service that sends WhatsApp messages. Built on [whatsapp-web.js](https://wwebjs.dev/).

⚠️ **Note:** Uses ~512MB RAM per session (Chromium). Plan accordingly.

## Features

- 🚀 Send WhatsApp **text messages** via HTTP API
- 📱 QR code authentication
- 🔄 **Multiple sessions support** (session IDs required)
- ⚡ Auto-reconnection
- 🔒 Bearer token authentication
- 💾 **Session persistence** via Docker volumes

## Quick Start

```bash
# Check you have 1GB+ free RAM
free -h

# Clone and install
git clone https://github.com/tictic-dev/whatsapp-http
cd whatsapp-http
npm install

# Configure
cp .env.example .env
# Edit .env with your AUTH_TOKEN

# Run
npm start

# Or with Docker (recommended - includes resource limits)
docker-compose up
```

## API Usage

All endpoints require a session ID via the `X-Session-Id` header.

### Basic Usage

```bash
# 1. Get QR Code (creates session)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Session-Id: my-session" \
  http://localhost:3000/qr

# 2. Send Message (once session is ready)
curl -X POST http://localhost:3000/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Session-Id: my-session" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999887766",
    "message": "Hello from WhatsApp HTTP!"
  }'
```

### Multiple Sessions

Manage different WhatsApp accounts with unique session IDs:

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
# Check session status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Session-Id: sales" \
  http://localhost:3000/status

# Get QR for authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Session-Id: sales" \
  http://localhost:3000/qr
```

📖 **See [SESSION_USAGE.md](SESSION_USAGE.md) for complete documentation and examples.**

### Health Check

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/health

# Returns session overview:
{
  "status": "ok",
  "sessions": {
    "total": 2,
    "ready": 1,
    "waiting_qr": 1
  },
  "uptime": 3600
}
```

## Session Requirements

- **Session ID is mandatory** for all operations except `/health`
- **Format**: Alphanumeric, hyphens, underscores only (max 50 chars)
- **Examples**: `sales`, `support-team`, `client-123`
- **Persistence**: Sessions survive container restarts via Docker volumes

## Configuration

| Variable   | Description                          | Default    |
| ---------- | ------------------------------------ | ---------- |
| AUTH_TOKEN | Bearer token for authentication      | Required   |
| PORT       | HTTP port                            | 3000       |
| NODE_ENV   | Environment (development/production) | production |

## Docker Deployment

```yaml
# docker-compose.yml
services:
  whatsapp:
    build: .
    ports:
      - '3000:3000'
    environment:
      - AUTH_TOKEN=${AUTH_TOKEN}
    volumes:
      - whatsapp-sessions:/app/.wwebjs_auth
    restart: unless-stopped
    mem_limit: 1g
    cpus: '1.0'

volumes:
  whatsapp-sessions:
```

## Dependencies

This service has minimal dependencies:

- **whatsapp-web.js** (v1.23.0) - The WhatsApp client library
- **Puppeteer** (bundled with whatsapp-web.js) - Controls Chromium
- **Chromium** - Required for WhatsApp Web

That's it. No web framework, no database, no complexity.

## Resource Requirements

**Minimum recommended:**

- RAM: 1GB (Puppeteer/Chromium needs ~512MB minimum)
- CPU: 1 vCPU
- Storage: 1GB

**Note:** These are estimates. Actual usage depends on message volume and session complexity.

## Multi-tenant Considerations

This service runs ONE WhatsApp session per instance. Running multiple instances on the same server is **not recommended** due to high resource usage (Puppeteer/Chromium).

For multi-tenant setups, consider:

- Separate VMs/containers per tenant
- Kubernetes with proper resource limits
- Or use a proper multi-session solution (not this service)

We haven't tested multi-session scenarios. This service is designed for simplicity, not scale.

## 📊 Architecture

```
Your App → API Gateway → WhatsApp HTTP → WhatsApp
          (handles:)     (handles:)
          - Auth         - WhatsApp connection
          - Rate limit   - Message sending
          - Routing      - That's it!
          - Multi-tenant
```

**Gateway Responsibilities:**

- Authentication/authorization
- Rate limiting
- Request routing
- Multi-tenancy
- Monitoring/metrics

**This Service Responsibilities:**

- Connect to WhatsApp
- Send messages
- Nothing else

## Deployment Options

1. **Single server** - One WhatsApp number
2. **Docker Swarm/K8s** - Multiple containers, each with own number
3. **Separate VMs** - Complete isolation per tenant

**Important:** Each instance maintains its own Chromium browser session. Plan resources accordingly.

## 🚀 **Modern JavaScript Setup**

- ✅ **ES Modules** - Modern import/export syntax
- ✅ **ESLint** - Code quality and error catching
- ✅ **Prettier** - Automatic code formatting
- ✅ **Husky** - Pre-commit hooks for quality
- ✅ **JSDoc** - Type annotations without TypeScript
- ✅ **Node --watch** - Hot reloading in development

## Development

### Quick Start

```bash
npm install          # Install dependencies + setup git hooks
npm run dev         # Start with hot reload
```

### Code Quality

```bash
npm run lint        # Check for issues
npm run lint:fix    # Fix auto-fixable issues
npm run format      # Format code with Prettier
npm run format:check # Check if code is formatted
```

### Production

```bash
npm start           # Run production server
```

### Docker

```bash
docker-compose up -d
```

## Environment Variables

```bash
# Required: Strong secret for API authentication
AUTH_TOKEN=your-secret-token-here

# Optional: Port for the service (defaults to 3000)
PORT=3000

# Optional: Node environment
NODE_ENV=development
```

## Gateway Integration Example

```javascript
// In your Cloudflare Worker or API Gateway
async function sendWhatsAppMessage(to, message, instanceUrl, token) {
  const response = await fetch(`${instanceUrl}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to, message }),
  });

  if (!response.ok) {
    throw new Error('WhatsApp service error');
  }

  return response.json();
}

async function getWhatsAppQR(instanceUrl, token) {
  const response = await fetch(`${instanceUrl}/qr`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
}
```

## Production Deployment

### Docker (Recommended)

```yaml
# docker-compose.yml
services:
  whatsapp:
    build: .
    ports:
      - '3000:3000'
    environment:
      - AUTH_TOKEN=${AUTH_TOKEN}
    volumes:
      - whatsapp-data:/app/.wwebjs_auth
    restart: unless-stopped
    mem_limit: 1g
    cpus: '1.0'

volumes:
  whatsapp-data:
```

### Gateway Examples

**Nginx with rate limiting:**

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;

server {
    location /whatsapp/ {
        limit_req zone=api burst=5;
        proxy_pass http://localhost:3000/;
        proxy_set_header Authorization "Bearer $WHATSAPP_TOKEN";
    }
}
```

**Node.js Express gateway:**

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
});

app.use('/whatsapp', limiter, proxy('http://localhost:3000'));
```

### Monitoring

Monitor these metrics:

- Memory usage (watch for leaks)
- CPU usage (spikes during QR scan)
- Disk usage (Chromium cache)

## ⚠️ Limitations

- **One WhatsApp session per instance** (by design)
- **Resource intensive** (~512MB RAM for Chromium)
- **Not tested for multi-session** on same server
- No message queuing (synchronous)
- No delivery receipts
- No rate limiting (implement in your gateway)

## When NOT to Use This

- Need 10+ WhatsApp sessions? Look elsewhere or help us implement multi-session support
- Need message queuing? Add RabbitMQ/Redis
- Need minimal resources? WhatsApp Web requires Chromium
- Need proven scale? This is for simple use cases

## File Structure

```
whatsapp-http/
├── src/
│   ├── server.js           # HTTP server with routing
│   └── manager.js          # Single WhatsApp session management
├── examples/
│   └── multi-tenant-gateway.js # Gateway example
├── .github/
│   ├── workflows/ci.yml    # CI pipeline
│   └── ISSUE_TEMPLATE/     # Issue templates
├── sessions/              # WhatsApp session storage
├── package.json          # Modern ES modules setup
├── .eslintrc.json        # Code quality rules
├── .prettierrc           # Formatting rules
├── Dockerfile            # Simple container build
├── docker-compose.yml    # Service orchestration
├── LICENSE               # MIT License
├── SECURITY.md          # Security policy
└── CONTRIBUTING.md      # Development guidelines
```

## Security

- Never expose this service directly to the internet
- Always use a reverse proxy or API gateway
- Use strong, random AUTH_TOKEN values (min 32 chars)
- Run in isolated network

## FAQ

**Q: Can I run 10 WhatsApp numbers on one server?**
A: Not recommended. Each session needs ~512MB RAM. Use separate servers or containers.

**Q: How do I send images/documents?**
A: Not supported yet. The underlying whatsapp-web.js supports it. PRs welcome!

**Q: How do I add message queuing?**
A: You don't. Use RabbitMQ/Redis and put this service behind it.

**Q: How do I add rate limiting?**
A: You don't. Implement it in your API gateway (nginx, Kong, etc).

**Q: Is this production-ready?**
A: Yes, for single-session text messaging. We use it ourselves.

**Q: Why only text messages?**
A: Simplicity. We built what we needed. Feel free to extend it.

**Q: Is this legal/allowed?**
A: WhatsApp doesn't officially support bots on personal accounts. Use at your own risk.

## Resources

- [whatsapp-web.js Documentation](https://docs.wwebjs.dev/)
- [whatsapp-web.js Guide](https://wwebjs.dev/guide/)
- [whatsapp-web.js GitHub](https://github.com/pedroslopez/whatsapp-web.js)
- [Official WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 🔒 Security

See [SECURITY.md](SECURITY.md) for security policy and best practices.

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

---

Built with ❤️ on top of [whatsapp-web.js](https://wwebjs.dev/)
