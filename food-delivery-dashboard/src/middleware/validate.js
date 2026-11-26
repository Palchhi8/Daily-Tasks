const AppError = require('../errors/AppError');

/**
 * Higher-order validation middleware leveraging Zod schemas.
 * Validates request components (body, params, query) and passes formatted field-level errors to next().
 *
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 * @param {'body'|'params'|'query'} [source='body'] - Target request property to validate
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const formattedErrors = issues.map((err) => ({
        field: err.path.length > 0 ? err.path.join('.') : source,
        message: err.message,
        rule: err.code
      }));

      return next(
        new AppError(
          `Validation failed for ${source}`,
          400,
          formattedErrors
        )
      );
    }

    // Replace target source with sanitized and parsed data
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
