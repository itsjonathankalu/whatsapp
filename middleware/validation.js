// validation.js - Request validation and response helpers

export function validateRequest(req, res, next) {
  // Add JSON response helper
  res.json = function (data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  res.status = function (code) {
    res.statusCode = code;
    return res;
  };

  next();
}
