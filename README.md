# Simplified WhatsApp Service

A focused WhatsApp service built with **modern JavaScript** that does one thing well: **managing WhatsApp connections and sending messages**.

## 🚀 **Modern JavaScript Setup**

- ✅ **ES Modules** - Modern import/export syntax
- ✅ **ESLint** - Code quality and error catching
- ✅ **Prettier** - Automatic code formatting
- ✅ **Husky** - Pre-commit hooks for quality
- ✅ **JSDoc** - Type annotations without TypeScript
- ✅ **Node --watch** - Hot reloading in development

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

## Code Quality Features

### 🔍 **ESLint Rules**

- Catches unused variables
- Enforces consistent equality (`===`)
- Requires curly braces
- Prefers `const` over `let`
- Warns about awaiting in loops

### 🎨 **Prettier Formatting**

- Single quotes
- Semicolons
- 100 character line width
- 2 space indentation
- Trailing commas in ES5

### 🪝 **Pre-commit Hooks**

- Automatically runs ESLint + Prettier
- Can't commit broken/unformatted code
- Ensures team consistency

## File Structure

```
whatsapp/
├── src/
│   ├── server.js           # HTTP server with routing
│   └── whatsapp-manager.js # WhatsApp client management
├── .vscode/
│   └── settings.json       # VSCode configuration
├── .husky/
│   └── pre-commit         # Git hooks
├── sessions/              # WhatsApp session storage
├── package.json          # Modern ES modules setup
├── .eslintrc.json        # Code quality rules
├── .prettierrc           # Formatting rules
├── Dockerfile            # Simple container build
└── docker-compose.yml    # Service orchestration
```

## Benefits of This Approach

1. **🧠 Dead Simple** - Pure JavaScript, no build step
2. **⚡ Fast Development** - Hot reload, instant feedback
3. **🔧 Professional Quality** - Linting + formatting built-in
4. **👥 Team Ready** - Pre-commit hooks ensure consistency
5. **📝 Self-Documenting** - JSDoc provides type hints
6. **🐛 Bug Prevention** - ESLint catches issues early
7. **💾 Minimal Dependencies** - Only one runtime dependency

## Gateway Integration Example

```javascript
// In your Cloudflare Worker or API Gateway
async function sendWhatsAppMessage(to, message, tenantId) {
  const response = await fetch(`${WHATSAPP_SERVICE_URL}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': INTERNAL_SECRET,
      'X-Tenant-Id': tenantId,
    },
    body: JSON.stringify({ to, message }),
  });

  if (!response.ok) {
    throw new Error('WhatsApp service error');
  }

  return response.json();
}

async function getWhatsAppStatus(tenantId) {
  const response = await fetch(`${WHATSAPP_SERVICE_URL}/status`, {
    method: 'GET',
    headers: {
      'X-Internal-Secret': INTERNAL_SECRET,
      'X-Tenant-Id': tenantId,
    },
  });

  return response.json();
}

async function createWhatsAppSession(tenantId) {
  const response = await fetch(`${WHATSAPP_SERVICE_URL}/session`, {
    method: 'POST',
    headers: {
      'X-Internal-Secret': INTERNAL_SECRET,
      'X-Tenant-Id': tenantId,
    },
  });

  return response.json();
}
```

## Development Workflow

1. **Write code** - VSCode formats on save
2. **ESLint feedback** - See errors as you type
3. **Commit changes** - Pre-commit hook runs automatically
4. **All checks pass** - Code is formatted and linted
5. **Clean history** - No formatting commits needed

## When to Add Complexity Back

Only add features when you actually need them:

- **Message queuing** - When you hit rate limits
- **Bulk sending** - When users ask for it
- **Media support** - When text isn't enough
- **Webhooks** - When you need delivery status
- **TypeScript** - When team grows or types become critical

This service gives you **90% of TypeScript benefits with 10% of the complexity**. Perfect for a focused internal service that needs to be maintainable and professional! 🚀
