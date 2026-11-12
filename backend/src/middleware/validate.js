const { badRequest } = require('../lib/errors');

const REQUEST_PARTS = ['params', 'query', 'body'];

/**
 * Validates request parts with Zod schemas.
 * Parsed (trimmed, normalized) values are stored on `req.validated`
 * because Express 5 does not allow reassigning `req.query`.
 */
function validate(schemas) {
  return (req, res, next) => {
    const validated = { ...req.validated };

    for (const part of REQUEST_PARTS) {
      const schema = schemas[part];
      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return next(badRequest('VALIDATION_ERROR', 'Please check the highlighted fields', details));
      }

      validated[part] = result.data;
    }

    req.validated = validated;
    return next();
  };
}

module.exports = { validate };
