const { AppError } = require('../lib/errors');
const { logger } = require('../lib/logger');

function sendError(res, statusCode, code, message, details) {
  res.status(statusCode).json({
    error: { code, message, ...(details ? { details } : {}) },
  });
}

function notFoundHandler(req, res) {
  sendError(res, 404, 'ROUTE_NOT_FOUND', 'Route not found');
}

// Express identifies error middleware by its four arguments.
function errorHandler(err, req, res, next) {
  const log = req.log ?? logger;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      log.error({ err }, 'Application error');
    }
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  // Errors raised by express.json()
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'INVALID_JSON', 'Request body is not valid JSON');
  }
  if (err.type === 'entity.too.large') {
    return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }

  // Unknown error: log details server side, return a generic message.
  log.error({ err }, 'Unhandled error');
  return sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}

module.exports = { errorHandler, notFoundHandler };
