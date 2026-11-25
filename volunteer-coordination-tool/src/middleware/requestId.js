const crypto = require('crypto');

/**
 * Custom Request ID Middleware
 * - Accepts incoming 'X-Request-Id' header if present (for distributed tracing) or generates a secure UUID v4.
 * - Attaches id to req.id for downstream logging and error handlers.
 * - Sets 'X-Request-Id' on the outgoing response header so clients can correlate logs.
 */
function requestIdMiddleware(req, res, next) {
  const existingId = req.headers['x-request-id'];
  const requestId = existingId || crypto.randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = requestIdMiddleware;
