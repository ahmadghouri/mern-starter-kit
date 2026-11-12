const { config } = require('../config/env');
const { logger } = require('../lib/logger');
const { unauthorized, notFound } = require('../lib/errors');
const { generateOpaqueToken, hashToken } = require('../lib/tokens');
const { Session } = require('../models/Session');

const DAY_MS = 24 * 60 * 60 * 1000;

const invalidRefreshToken = () =>
  unauthorized('INVALID_REFRESH_TOKEN', 'Your session has expired. Please sign in again.');

function computeSlidingExpiry(now, absoluteExpiresAt) {
  const sliding = now.getTime() + config.auth.refreshTokenTtlDays * DAY_MS;
  return new Date(Math.min(sliding, absoluteExpiresAt.getTime()));
}

function normalizeContext({ userAgent = '', ip = '' } = {}) {
  return { userAgent: String(userAgent).slice(0, 512), ip: String(ip).slice(0, 64) };
}

async function createSession({ userId, userAgent, ip }) {
  const refreshToken = generateOpaqueToken();
  const now = new Date();
  const absoluteExpiresAt = new Date(now.getTime() + config.auth.sessionMaxAgeDays * DAY_MS);

  const session = await Session.create({
    user: userId,
    tokenHash: hashToken(refreshToken),
    ...normalizeContext({ userAgent, ip }),
    lastUsedAt: now,
    expiresAt: computeSlidingExpiry(now, absoluteExpiresAt),
    absoluteExpiresAt,
  });

  return { session, refreshToken };
}

/**
 * A token that matches `previousTokenHash` was already rotated.
 * Inside the grace window it is most likely two parallel requests from the
 * same browser, so we only reject it. Outside the window it is treated as a
 * replayed (possibly stolen) token and the whole session is revoked.
 */
async function handleRotatedTokenReplay(session, now) {
  const graceMs = config.auth.refreshReuseGraceSeconds * 1000;
  const rotatedRecently = session.rotatedAt && now - session.rotatedAt <= graceMs;

  if (rotatedRecently) {
    throw unauthorized('REFRESH_CONFLICT', 'Session was refreshed by another request.');
  }

  await Session.updateOne(
    { _id: session._id, revokedAt: null },
    { $set: { revokedAt: now, revokedReason: 'reuse_detected' } },
  );
  logger.warn({ sessionId: String(session._id) }, 'Refresh token reuse detected, session revoked');
  throw invalidRefreshToken();
}

async function rotateSession(refreshToken, context) {
  const tokenHash = hashToken(refreshToken);
  const now = new Date();

  const session = await Session.findOne({ tokenHash });

  if (!session) {
    const replayed = await Session.findOne({ previousTokenHash: tokenHash, revokedAt: null });
    if (replayed) {
      await handleRotatedTokenReplay(replayed, now);
    }
    throw invalidRefreshToken();
  }

  if (session.revokedAt || session.expiresAt <= now) {
    throw invalidRefreshToken();
  }

  const newRefreshToken = generateOpaqueToken();

  // The tokenHash condition makes rotation atomic: if two requests race,
  // only one of them can swap the hash.
  const rotated = await Session.findOneAndUpdate(
    { _id: session._id, tokenHash, revokedAt: null },
    {
      $set: {
        tokenHash: hashToken(newRefreshToken),
        previousTokenHash: tokenHash,
        rotatedAt: now,
        lastUsedAt: now,
        expiresAt: computeSlidingExpiry(now, session.absoluteExpiresAt),
        ...normalizeContext(context),
      },
    },
    { new: true },
  );

  if (!rotated) {
    throw unauthorized('REFRESH_CONFLICT', 'Session was refreshed by another request.');
  }

  return { session: rotated, refreshToken: newRefreshToken };
}

async function revokeSessionByToken(refreshToken, reason) {
  await Session.updateOne(
    { tokenHash: hashToken(refreshToken), revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}

async function revokeSessionById(sessionId, reason) {
  await Session.updateOne(
    { _id: sessionId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}

/** Revokes a session only if it belongs to the given user. */
async function revokeUserSession({ userId, sessionId }) {
  const result = await Session.updateOne(
    { _id: sessionId, user: userId, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date(), revokedReason: 'user_revoked' } },
  );

  if (result.matchedCount === 0) {
    throw notFound('SESSION_NOT_FOUND', 'Session not found');
  }
}

async function revokeAllUserSessions(userId, reason) {
  await Session.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}

/** Revokes every session of the user except the given one (the current device). */
async function revokeOtherUserSessions(userId, keepSessionId, reason) {
  await Session.updateMany(
    { user: userId, _id: { $ne: keepSessionId }, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}

async function isSessionActive({ sessionId, userId }) {
  const session = await Session.exists({
    _id: sessionId,
    user: userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  return Boolean(session);
}

async function listActiveUserSessions(userId) {
  return Session.find({ user: userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .sort({ lastUsedAt: -1 })
    .limit(50)
    .lean();
}

module.exports = {
  createSession,
  rotateSession,
  revokeSessionByToken,
  revokeSessionById,
  revokeUserSession,
  revokeAllUserSessions,
  revokeOtherUserSessions,
  isSessionActive,
  listActiveUserSessions,
};
