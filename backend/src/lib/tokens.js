const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

const ACCESS_TOKEN_ALGORITHM = 'HS256';

function signAccessToken({ userId, role, sessionId }) {
  return jwt.sign({ role, sid: String(sessionId) }, config.auth.accessTokenSecret, {
    algorithm: ACCESS_TOKEN_ALGORITHM,
    subject: String(userId),
    expiresIn: config.auth.accessTokenTtlSeconds,
    issuer: config.auth.issuer,
    audience: config.auth.audience,
  });
}

/**
 * Verifies signature, algorithm, expiry, issuer, and audience.
 * Throws jsonwebtoken errors (TokenExpiredError, JsonWebTokenError) on failure.
 */
function verifyAccessToken(token) {
  return jwt.verify(token, config.auth.accessTokenSecret, {
    algorithms: [ACCESS_TOKEN_ALGORITHM],
    issuer: config.auth.issuer,
    audience: config.auth.audience,
  });
}

/** Cryptographically random, URL-safe opaque token. */
function generateOpaqueToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Opaque tokens are stored as SHA-256 hashes so a database leak does not
 * expose usable refresh or reset tokens. A fast hash is fine here because
 * the tokens have high entropy (unlike passwords).
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { signAccessToken, verifyAccessToken, generateOpaqueToken, hashToken };
