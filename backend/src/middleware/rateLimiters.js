const { rateLimit } = require('express-rate-limit');
const { tooManyRequests } = require('../lib/errors');

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function createLimiter(limit) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next) => next(tooManyRequests()),
  });
}

/**
 * Each call creates fresh in-memory stores.
 * NOTE: the memory store is per process. Use a shared store (for example
 * Redis) when running more than one API instance.
 */
function createRateLimiters({ apiMax, authMax, refreshMax }) {
  return {
    api: createLimiter(apiMax),
    auth: createLimiter(authMax),
    refresh: createLimiter(refreshMax),
  };
}

module.exports = { createRateLimiters };
