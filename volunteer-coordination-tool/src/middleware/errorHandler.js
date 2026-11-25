/**
 * Centralized Express Error Handling Middleware
 * Catch-all error boundary for all synchronous and asynchronous route failures.
 */
function errorHandler(err, req, res, next) {
  const requestId = req.id || 'N/A';
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Handle Express body-parser malformed JSON syntax errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON body in request payload';
  }

  // Determine error status category
  const status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

  // Server-side diagnostic log
  if (statusCode >= 500) {
    console.error(`[ERROR] [${requestId}] Unhandled Server Error:`, err);
  } else {
    console.warn(`[WARN]  [${requestId}] Client Error (${statusCode}): ${message}`, details || '');
  }

  // Consistent API error envelope
  const responsePayload = {
    success: false,
    status,
    statusCode,
    message,
    requestId,
    timestamp: new Date().toISOString()
  };

  if (details) {
    responsePayload.errors = details;
  }

  // Include stack trace only in explicit development environment
  if (process.env.NODE_ENV === 'development') {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
}

module.exports = errorHandler;
