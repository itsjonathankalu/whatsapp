// error.js - Error handling middleware

export function errorHandler(error, req, res) {
  console.error('Error:', error);

  const status = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      error: message,
      timestamp: new Date().toISOString(),
    })
  );
}
