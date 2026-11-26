const crypto = require('crypto');

/**
 * Custom Request ID Middleware
 * - Accepts incoming 'X-Request-Id' (for tracing across microservices/proxies) or generates a secure UUID v4.
 * - Injects 'req.id' for downstream structured logging and error handlers.
 * - Sets 'X-Request-Id' response header so dashboards/clients can correlate API calls.
 */
function requestIdMiddleware(req, res, next) {
  const existingId = req.headers['x-request-id'];
  const requestId = existingId || crypto.randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = requestIdMiddleware;
