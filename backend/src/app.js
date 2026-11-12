const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const { config } = require('./config/env');
const { logger } = require('./lib/logger');
const { isTrustedOrigin } = require('./lib/origins');
const { createRateLimiters } = require('./middleware/rateLimiters');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { createAdminRouter } = require('./routes/admin.routes');
const { createAuthRouter } = require('./routes/auth.routes');
const { createGoogleRouter } = require('./routes/google.routes');
const { createProfileRouter, createAvatarRouter } = require('./routes/profile.routes');
const { healthRouter } = require('./routes/health.routes');

const REQUEST_ID_PATTERN = /^[\w-]{1,64}$/;

function requestId(req, res) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming)
    ? incoming
    : crypto.randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}

/** "POST /api/auth/login 200", or "... aborted" when the client left before a response. */
function requestLogMessage(req, res) {
  const status = res.headersSent ? res.statusCode : 'aborted';
  return `${req.method} ${req.originalUrl} ${status}`;
}

/**
 * Builds the Express app without connecting to the database or listening,
 * so tests can use it with Supertest.
 */
function createApp({ rateLimit = config.rateLimit, google = config.google } = {}) {
  const app = express();
  const limiters = createRateLimiters(rateLimit);

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(
    pinoHttp({
      logger,
      genReqId: requestId,
      autoLogging: !config.isTest,
      // One line per API call, e.g. "POST /api/auth/login 200".
      customSuccessMessage: requestLogMessage,
      customErrorMessage: requestLogMessage,
      customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400 || !res.headersSent) return 'warn';
        return 'info';
      },
      // Runs when the response finishes, so `req.auth` is set for signed-in calls.
      customProps: (req) => (req.auth ? { userId: req.auth.userId } : {}),
      // Keep log entries small: no headers, no bodies (they can hold passwords).
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url, ip: req.remoteAddress }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || isTrustedOrigin(origin)),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.use('/api/health', healthRouter);
  app.use('/api', limiters.api);
  app.use('/api/auth/google', createGoogleRouter({ limiters, google }));
  app.use('/api/auth', createAuthRouter({ limiters, isTrustedOrigin, google }));
  app.use('/api/admin', createAdminRouter());
  app.use('/api/profile', createProfileRouter({ limiters }));
  app.use('/api/avatars', createAvatarRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
