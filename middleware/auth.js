// auth.js - Authentication middleware

export function authMiddleware(req, res, next) {
  // Skip auth for health check
  if (req.url === '/health') {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const authToken = process.env.AUTH_TOKEN;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing authorization header' }));
    return;
  }

  const token = authHeader.substring(7);
  if (token !== authToken) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid token' }));
    return;
  }

  next();
}
