const AppError = require('../errors/AppError');

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

    req[source] = result.data;
    next();
  };
}

module.exports = validate;
