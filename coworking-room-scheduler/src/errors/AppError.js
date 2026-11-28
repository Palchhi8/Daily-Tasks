/**
 * Custom Operational Application Error Class
 * Distinguishes anticipated client/auth/domain errors from unexpected server crashes.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {Array|Object} [details=null] - Optional field details or conflict reasons
   */
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details = null) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = 'Authentication required. Please provide a valid Bearer token.') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Access forbidden: Insufficient permissions for this resource.') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message, details = null) {
    return new AppError(message, 409, details);
  }
}

module.exports = AppError;
