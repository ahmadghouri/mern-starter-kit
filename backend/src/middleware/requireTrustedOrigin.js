const { forbidden } = require('../lib/errors');

/**
 * CSRF defence for cookie-authenticated endpoints (refresh, logout).
 * Browsers always send `Origin` on cross-site POST requests, so a request
 * from an untrusted origin is rejected. Requests without `Origin` (curl,
 * server-to-server) are allowed; the SameSite=Strict cookie is the
 * primary protection.
 */
function requireTrustedOrigin(isTrustedOrigin) {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (origin && !isTrustedOrigin(origin)) {
      return next(forbidden('UNTRUSTED_ORIGIN', 'Request origin is not allowed'));
    }
    return next();
  };
}

module.exports = { requireTrustedOrigin };
