const { config } = require('../config/env');

const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d{1,5}$/;

/**
 * Returns a function that decides whether a browser origin is trusted.
 * Production: only the configured CORS_ORIGINS.
 * Development/test: also any localhost port, so the Vite dev server can
 * fall back to another port when 5173 is busy.
 */
function createOriginChecker({ allowedOrigins, allowAnyLocalhost }) {
  const allowed = new Set(allowedOrigins);
  return (origin) => allowed.has(origin) || (allowAnyLocalhost && LOCALHOST_ORIGIN.test(origin));
}

const isTrustedOrigin = createOriginChecker({
  allowedOrigins: config.corsOrigins,
  allowAnyLocalhost: !config.isProduction,
});

module.exports = { createOriginChecker, isTrustedOrigin };
