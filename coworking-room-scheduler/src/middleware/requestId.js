const crypto = require('crypto');

function requestIdMiddleware(req, res, next) {
  const existingId = req.headers['x-request-id'];
  const requestId = existingId || crypto.randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = requestIdMiddleware;
