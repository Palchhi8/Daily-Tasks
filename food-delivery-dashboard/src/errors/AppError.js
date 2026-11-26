/**
 * Custom Operational Application Error Class
 * Distinguishes expected business/client validation errors from unexpected runtime crashes.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {Array|Object} [details=null] - Validation issues or domain rejection reasons
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

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message, details = null) {
    return new AppError(message, 409, details);
  }

  static unprocessable(message, details = null) {
    return new AppError(message, 422, details);
  }
}

module.exports = AppError;
