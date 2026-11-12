/**
 * Operational error with an HTTP status and a stable machine-readable code.
 * The message is safe to show to API clients.
 */
class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (code, message, details) => new AppError(400, code, message, details);
const unauthorized = (code = 'UNAUTHORIZED', message = 'Authentication required') =>
  new AppError(401, code, message);
const forbidden = (code = 'FORBIDDEN', message = 'You are not allowed to perform this action') =>
  new AppError(403, code, message);
const notFound = (code = 'NOT_FOUND', message = 'Resource not found') =>
  new AppError(404, code, message);
const conflict = (code, message) => new AppError(409, code, message);
const tooManyRequests = (message = 'Too many requests, please try again later') =>
  new AppError(429, 'RATE_LIMITED', message);

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
};
