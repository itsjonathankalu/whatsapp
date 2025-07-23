# TicTic ✓✓ - Serviço HTTP WhatsApp

Um serviço HTTP simples que envia mensagens WhatsApp. Construído sobre [whatsapp-web.js](https://wwebjs.dev/).

⚠️ **Nota:** Usa ~512MB RAM por sessão (Chromium). Planeje adequadamente.

## Recursos

- 🚀 Envie **mensagens de texto** WhatsApp via HTTP API
- 📱 Autenticação por QR code
- 🔄 **Suporte a múltiplas sessões** (IDs de sessão obrigatórios)
- ⚡ Reconexão automática
- 🔒 Autenticação Bearer token
- 💾 **Persistência de sessão** via volumes Docker

## Início Rápido

```bash
# Verifique se você tem 1GB+ de RAM livre
free -h

# Clone e instale
git clone https://github.com/tictic-dev/whatsapp-http
cd whatsapp-http
npm install

# Configure
cp .env.example .env
# Edite .env com seu AUTH_TOKEN

# Execute
npm start

# Ou com Docker (recomendado - inclui limites de recursos)
docker-compose up
```

## Uso da API

Todos os endpoints requerem um ID de sessão via header `X-Session-Id`.

### Uso Básico

```bash
# 1. Obter QR Code (cria sessão)
curl -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Session-Id: minha-sessao" \
  http://localhost:3000/qr

# 2. Enviar Mensagem (quando a sessão estiver pronta)
curl -X POST http://localhost:3000/send \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Session-Id: minha-sessao" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999887766",
    "message": "Olá do WhatsApp HTTP!"
  }'
```

### Múltiplas Sessões

Gerencie diferentes contas WhatsApp com IDs únicos de sessão:

```bash
# WhatsApp da equipe de vendas
curl -X POST http://localhost:3000/send \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Session-Id: vendas" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999887766",
    "message": "Olá da equipe de Vendas!"
  }'

# WhatsApp da equipe de suporte
curl -X POST http://localhost:3000/send \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Session-Id: suporte" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999887766",
    "message": "Olá da equipe de Suporte!"
  }'
```

### Gerenciamento de Sessão

```bash
# Verificar status da sessão
curl -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Session-Id: vendas" \
  http://localhost:3000/status

# Obter QR para autenticação
curl -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Session-Id: vendas" \
  http://localhost:3000/qr
```

📖 **Veja [SESSION_USAGE.md](SESSION_USAGE.md) para documentação completa e exemplos.**

### Verificação de Saúde

```bash
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://localhost:3000/health

# Retorna visão geral das sessões:
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

## Requisitos de Sessão

- **ID de sessão é obrigatório** para todas as operações exceto `/health`
- **Formato**: Alfanumérico, hífens, underscores apenas (máx 50 chars)
- **Exemplos**: `vendas`, `suporte-equipe`, `cliente-123`
- **Persistência**: Sessões sobrevivem a reinicializações do container via volumes Docker

## Configuração

| Variável   | Descrição                         | Padrão      |
| ---------- | --------------------------------- | ----------- |
| AUTH_TOKEN | Token Bearer para autenticação    | Obrigatório |
| PORT       | Porta HTTP                        | 3000        |
| NODE_ENV   | Ambiente (development/production) | production  |

## Deploy Docker

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

## Dependências

Este serviço tem dependências mínimas:

- **whatsapp-web.js** (v1.23.0) - A biblioteca cliente WhatsApp
- **Puppeteer** (incluído com whatsapp-web.js) - Controla o Chromium
- **Chromium** - Necessário para WhatsApp Web

É isso. Sem framework web, sem banco de dados, sem complexidade.

## Requisitos de Recursos

**Mínimo recomendado:**

- RAM: 1GB (Puppeteer/Chromium precisa ~512MB mínimo)
- CPU: 1 vCPU
- Armazenamento: 1GB

**Nota:** Estas são estimativas. O uso real depende do volume de mensagens e complexidade da sessão.

## Considerações Multi-inquilino

Este serviço executa UMA sessão WhatsApp por instância. Executar múltiplas instâncias no mesmo servidor **não é recomendado** devido ao alto uso de recursos (Puppeteer/Chromium).

Para configurações multi-inquilino, considere:

- VMs/containers separados por inquilino
- Kubernetes com limites apropriados de recursos
- Ou use uma solução multi-sessão adequada (não este serviço)

Não testamos cenários multi-sessão. Este serviço é projetado para simplicidade, não escala.

## 📊 Arquitetura

```
Seu App → API Gateway → WhatsApp HTTP → WhatsApp
          (gerencia:)     (gerencia:)
          - Auth          - Conexão WhatsApp
          - Rate limit    - Envio mensagens
          - Roteamento    - É isso!
          - Multi-tenant
```

**Responsabilidades do Gateway:**

- Autenticação/autorização
- Rate limiting
- Roteamento de requisições
- Multi-tenancy
- Monitoramento/métricas

**Responsabilidades deste Serviço:**

- Conectar ao WhatsApp
- Enviar mensagens
- Nada mais

## Opções de Deploy

1. **Servidor único** - Um número WhatsApp
2. **Docker Swarm/K8s** - Múltiplos containers, cada um com seu número
3. **VMs separadas** - Isolamento completo por inquilino

**Importante:** Cada instância mantém sua própria sessão de navegador Chromium. Planeje recursos adequadamente.

## 🚀 **Configuração JavaScript Moderna**

- ✅ **ES Modules** - Sintaxe moderna import/export
- ✅ **ESLint** - Qualidade de código e detecção de erros
- ✅ **Prettier** - Formatação automática de código
- ✅ **Husky** - Hooks pre-commit para qualidade
- ✅ **JSDoc** - Anotações de tipo sem TypeScript
- ✅ **Node --watch** - Hot reload em desenvolvimento

## Desenvolvimento

### Início Rápido

```bash
npm install          # Instalar dependências + configurar git hooks
npm run dev         # Iniciar com hot reload
```

### Qualidade de Código

```bash
npm run lint        # Verificar problemas
npm run lint:fix    # Corrigir problemas auto-corrigíveis
npm run format      # Formatar código com Prettier
npm run format:check # Verificar se código está formatado
```

### Produção

```bash
npm start           # Executar servidor de produção
```

### Docker

```bash
docker-compose up -d
```

## Variáveis de Ambiente

```bash
# Obrigatório: Segredo forte para autenticação da API
AUTH_TOKEN=seu-token-secreto-aqui

# Opcional: Porta para o serviço (padrão 3000)
PORT=3000

# Opcional: Ambiente Node
NODE_ENV=development
```

## Exemplo de Integração Gateway

```javascript
// No seu Cloudflare Worker ou API Gateway
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
    throw new Error('Erro do serviço WhatsApp');
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

## Deploy de Produção

### Docker (Recomendado)

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

### Exemplos de Gateway

**Nginx com rate limiting:**

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

**Gateway Node.js Express:**

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // limitar cada IP a 30 requisições por minuto
});

app.use('/whatsapp', limiter, proxy('http://localhost:3000'));
```

### Monitoramento

Monitore estas métricas:

- Uso de memória (cuidado com vazamentos)
- Uso de CPU (picos durante scan QR)
- Uso de disco (cache Chromium)

## ⚠️ Limitações

- **Uma sessão WhatsApp por instância** (por design)
- **Intensivo em recursos** (~512MB RAM para Chromium)
- **Não testado para multi-sessão** no mesmo servidor
- Sem fila de mensagens (síncrono)
- Sem confirmações de entrega
- Sem rate limiting (implemente no seu gateway)

## Quando NÃO Usar

- Precisa de 10+ sessões WhatsApp? Procure alternativas ou nos ajude a implementar suporte multi-sessão
- Precisa de fila de mensagens? Adicione RabbitMQ/Redis
- Precisa de recursos mínimos? WhatsApp Web requer Chromium
- Precisa de escala comprovada? Isto é para casos de uso simples

## Estrutura de Arquivos

```
whatsapp-http/
├── src/
│   ├── server.js           # Servidor HTTP com roteamento
│   └── manager.js          # Gerenciamento de sessão WhatsApp única
├── examples/
│   └── multi-tenant-gateway.js # Exemplo de gateway
├── .github/
│   ├── workflows/ci.yml    # Pipeline CI
│   └── ISSUE_TEMPLATE/     # Templates de issue
├── sessions/              # Armazenamento de sessão WhatsApp
├── package.json          # Configuração ES modules moderna
├── .eslintrc.json        # Regras de qualidade de código
├── .prettierrc           # Regras de formatação
├── Dockerfile            # Build simples de container
├── docker-compose.yml    # Orquestração de serviços
├── LICENSE               # Licença MIT
├── SECURITY.md          # Política de segurança
└── CONTRIBUTING.md      # Diretrizes de desenvolvimento
```

## Segurança

- Nunca exponha este serviço diretamente à internet
- Sempre use um proxy reverso ou API gateway
- Use valores AUTH_TOKEN fortes e aleatórios (mín 32 chars)
- Execute em rede isolada

## FAQ

**P: Posso executar 10 números WhatsApp em um servidor?**
R: Não recomendado. Cada sessão precisa ~512MB RAM. Use servidores ou containers separados.

**P: Como envio imagens/documentos?**
R: Ainda não suportado. O whatsapp-web.js subjacente suporta. PRs são bem-vindos!

**P: Como adiciono fila de mensagens?**
R: Você não faz. Use RabbitMQ/Redis e coloque este serviço atrás dele.

**P: Como adiciono rate limiting?**
R: Você não faz. Implemente no seu API gateway (nginx, Kong, etc).

**P: Isto está pronto para produção?**
R: Sim, para mensagens de texto de sessão única. Nós mesmos usamos.

**P: Por que apenas mensagens de texto?**
R: Simplicidade. Construímos o que precisávamos. Sinta-se livre para estender.

**P: Isto é legal/permitido?**
R: WhatsApp não suporta oficialmente bots em contas pessoais. Use por sua conta e risco.

## Recursos

- [Documentação whatsapp-web.js](https://docs.wwebjs.dev/)
- [Guia whatsapp-web.js](https://wwebjs.dev/guide/)
- [GitHub whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- [API Oficial WhatsApp Business](https://developers.facebook.com/docs/whatsapp)

## 🤝 Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes.

## 🔒 Segurança

Veja [SECURITY.md](SECURITY.md) para política de segurança e melhores práticas.

## 📄 Licença

Licença MIT - veja arquivo [LICENSE](LICENSE).

---

## English Documentation

### TicTic ✓✓ - WhatsApp HTTP Service

A simple HTTP service that sends WhatsApp messages. Built on [whatsapp-web.js](https://wwebjs.dev/).

⚠️ **Note:** Uses ~512MB RAM per session (Chromium). Plan accordingly.

### Features

- 🚀 Send WhatsApp **text messages** via HTTP API
- 📱 QR code authentication
- 🔄 **Multiple sessions support** (session IDs required)
- ⚡ Auto-reconnection
- 🔒 Bearer token authentication
- 💾 **Session persistence** via Docker volumes

### Quick Start

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

### API Usage

All endpoints require a session ID via the `X-Session-Id` header.

#### Basic Usage

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

#### Multiple Sessions

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

#### Session Management

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

#### Health Check

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

### Session Requirements

- **Session ID is mandatory** for all operations except `/health`
- **Format**: Alphanumeric, hyphens, underscores only (max 50 chars)
- **Examples**: `sales`, `support-team`, `client-123`
- **Persistence**: Sessions survive container restarts via Docker volumes

### Configuration

| Variable   | Description                          | Default    |
| ---------- | ------------------------------------ | ---------- |
| AUTH_TOKEN | Bearer token for authentication      | Required   |
| PORT       | HTTP port                            | 3000       |
| NODE_ENV   | Environment (development/production) | production |

### Docker Deployment

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

### Dependencies

This service has minimal dependencies:

- **whatsapp-web.js** (v1.23.0) - The WhatsApp client library
- **Puppeteer** (bundled with whatsapp-web.js) - Controls Chromium
- **Chromium** - Required for WhatsApp Web

That's it. No web framework, no database, no complexity.

### Resource Requirements

**Minimum recommended:**

- RAM: 1GB (Puppeteer/Chromium needs ~512MB minimum)
- CPU: 1 vCPU
- Storage: 1GB

**Note:** These are estimates. Actual usage depends on message volume and session complexity.

### Multi-tenant Considerations

This service runs ONE WhatsApp session per instance. Running multiple instances on the same server is **not recommended** due to high resource usage (Puppeteer/Chromium).

For multi-tenant setups, consider:

- Separate VMs/containers per tenant
- Kubernetes with proper resource limits
- Or use a proper multi-session solution (not this service)

We haven't tested multi-session scenarios. This service is designed for simplicity, not scale.

### 📊 Architecture

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

### Deployment Options

1. **Single server** - One WhatsApp number
2. **Docker Swarm/K8s** - Multiple containers, each with own number
3. **Separate VMs** - Complete isolation per tenant

**Important:** Each instance maintains its own Chromium browser session. Plan resources accordingly.

### 🚀 **Modern JavaScript Setup**

- ✅ **ES Modules** - Modern import/export syntax
- ✅ **ESLint** - Code quality and error catching
- ✅ **Prettier** - Automatic code formatting
- ✅ **Husky** - Pre-commit hooks for quality
- ✅ **JSDoc** - Type annotations without TypeScript
- ✅ **Node --watch** - Hot reloading in development

### Development

#### Quick Start

```bash
npm install          # Install dependencies + setup git hooks
npm run dev         # Start with hot reload
```

#### Code Quality

```bash
npm run lint        # Check for issues
npm run lint:fix    # Fix auto-fixable issues
npm run format      # Format code with Prettier
npm run format:check # Check if code is formatted
```

#### Production

```bash
npm start           # Run production server
```

#### Docker

```bash
docker-compose up -d
```

### Environment Variables

```bash
# Required: Strong secret for API authentication
AUTH_TOKEN=your-secret-token-here

# Optional: Port for the service (defaults to 3000)
PORT=3000

# Optional: Node environment
NODE_ENV=development
```

### Gateway Integration Example

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

### Production Deployment

#### Docker (Recommended)

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

#### Gateway Examples

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

#### Monitoring

Monitor these metrics:

- Memory usage (watch for leaks)
- CPU usage (spikes during QR scan)
- Disk usage (Chromium cache)

### ⚠️ Limitations

- **One WhatsApp session per instance** (by design)
- **Resource intensive** (~512MB RAM for Chromium)
- **Not tested for multi-session** on same server
- No message queuing (synchronous)
- No delivery receipts
- No rate limiting (implement in your gateway)

### When NOT to Use This

- Need 10+ WhatsApp sessions? Look elsewhere or help us implement multi-session support
- Need message queuing? Add RabbitMQ/Redis
- Need minimal resources? WhatsApp Web requires Chromium
- Need proven scale? This is for simple use cases

### File Structure

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

### Security

- Never expose this service directly to the internet
- Always use a reverse proxy or API gateway
- Use strong, random AUTH_TOKEN values (min 32 chars)
- Run in isolated network

### FAQ

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

### Resources

- [whatsapp-web.js Documentation](https://docs.wwebjs.dev/)
- [whatsapp-web.js Guide](https://wwebjs.dev/guide/)
- [whatsapp-web.js GitHub](https://github.com/pedroslopez/whatsapp-web.js)
- [Official WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

### 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### 🔒 Security

See [SECURITY.md](SECURITY.md) for security policy and best practices.

### 📄 License

MIT License - see [LICENSE](LICENSE) file.

---

Construído com ❤️ sobre [whatsapp-web.js](https://wwebjs.dev/)
