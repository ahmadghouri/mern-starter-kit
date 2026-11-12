const { unauthorized, forbidden } = require('../lib/errors');
const { verifyAccessToken } = require('../lib/tokens');
const sessionService = require('../services/session.service');

function readBearerToken(req) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/**
 * Requires a valid access token for an active session.
 * The session lookup makes logout and "sign out all devices" take effect
 * immediately instead of waiting for the access token to expire.
 */
async function authenticate(req, res, next) {
  const token = readBearerToken(req);
  if (!token) {
    throw unauthorized('AUTH_REQUIRED', 'Authentication required');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw unauthorized('ACCESS_TOKEN_EXPIRED', 'Access token expired');
    }
    throw unauthorized('INVALID_ACCESS_TOKEN', 'Invalid access token');
  }

  const active = await sessionService.isSessionActive({
    sessionId: payload.sid,
    userId: payload.sub,
  });
  if (!active) {
    throw unauthorized('SESSION_REVOKED', 'Your session has ended. Please sign in again.');
  }

  req.auth = { userId: payload.sub, role: payload.role, sessionId: payload.sid };
  next();
}

/** Use after `authenticate`. Allows only the listed roles. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return next(forbidden());
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };
