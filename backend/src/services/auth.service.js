const bcrypt = require('bcryptjs');
const { config } = require('../config/env');
const { logger } = require('../lib/logger');
const { unauthorized, conflict, badRequest } = require('../lib/errors');
const { signAccessToken, generateOpaqueToken, hashToken } = require('../lib/tokens');
const { User, toPublicUser } = require('../models/User');
const { PasswordResetToken } = require('../models/PasswordResetToken');
const sessionService = require('./session.service');
const { sendEmail } = require('./email.service');
const { passwordResetEmail } = require('../emails/passwordReset');

const DUPLICATE_KEY_ERROR = 11000;

let dummyHashPromise;

/**
 * Used when the email does not exist, so login takes about the same time
 * whether or not the account exists (reduces user enumeration by timing).
 */
function getDummyHash() {
  dummyHashPromise ??= bcrypt.hash('dummy-password-for-timing', config.auth.bcryptRounds);
  return dummyHashPromise;
}

function hashPassword(password) {
  return bcrypt.hash(password, config.auth.bcryptRounds);
}

async function issueAuthResult(user, context) {
  const { session, refreshToken } = await sessionService.createSession({
    userId: user._id,
    ...context,
  });

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({ userId: user._id, role: user.role, sessionId: session._id }),
    refreshToken,
    refreshTokenExpiresAt: session.expiresAt,
  };
}

async function register({ name, email, password }, context) {
  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await User.create({ name, email, passwordHash });
  } catch (error) {
    if (error.code === DUPLICATE_KEY_ERROR) {
      throw conflict('EMAIL_TAKEN', 'An account with this email already exists');
    }
    throw error;
  }

  return issueAuthResult(user, context);
}

async function login({ email, password }, context) {
  const user = await User.findOne({ email }).select('+passwordHash');
  // Google-only accounts have no password; compare against the dummy hash so they fail the same way.
  const hashToCompare = user?.passwordHash ?? (await getDummyHash());
  const passwordMatches = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordMatches) {
    throw unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  return issueAuthResult(user, context);
}

async function refresh(refreshToken, context) {
  if (!refreshToken) {
    throw unauthorized('REFRESH_TOKEN_MISSING', 'Please sign in to continue.');
  }

  const { session, refreshToken: nextRefreshToken } = await sessionService.rotateSession(
    refreshToken,
    context,
  );

  const user = await User.findById(session.user);
  if (!user) {
    await sessionService.revokeSessionById(session._id, 'user_missing');
    throw unauthorized('INVALID_REFRESH_TOKEN', 'Your session has expired. Please sign in again.');
  }

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({ userId: user._id, role: user.role, sessionId: session._id }),
    refreshToken: nextRefreshToken,
    refreshTokenExpiresAt: session.expiresAt,
  };
}

async function logout(refreshToken) {
  if (!refreshToken) {
    return;
  }
  await sessionService.revokeSessionByToken(refreshToken, 'logout');
}

async function getUserById(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw unauthorized('USER_NOT_FOUND', 'Please sign in again.');
  }
  return toPublicUser(user);
}

/**
 * Always resolves the same way whether or not the email exists, so callers
 * cannot use this endpoint to discover registered emails.
 */
async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) {
    return;
  }

  const token = generateOpaqueToken(32);
  const ttlMinutes = config.auth.passwordResetTtlMinutes;

  // Only the newest link is valid.
  await PasswordResetToken.deleteMany({ user: user._id });
  await PasswordResetToken.create({
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
  });

  const resetUrl = new URL('/reset-password', config.appUrl);
  resetUrl.searchParams.set('token', token);

  const message = passwordResetEmail({
    name: user.name,
    resetUrl: resetUrl.toString(),
    expiresInMinutes: ttlMinutes,
  });

  // Not awaited: response time should not depend on email delivery.
  sendEmail({ to: user.email, ...message }).catch((error) => {
    logger.error({ err: error, userId: String(user._id) }, 'Failed to send password reset email');
  });
}

async function resetPassword({ token, password }) {
  // findOneAndDelete makes the token single-use, even with concurrent requests.
  const resetToken = await PasswordResetToken.findOneAndDelete({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) {
    throw badRequest('INVALID_RESET_TOKEN', 'This reset link is invalid or has expired.');
  }

  const passwordHash = await hashPassword(password);
  const result = await User.updateOne(
    { _id: resetToken.user },
    { $set: { passwordHash, passwordChangedAt: new Date() } },
  );

  if (result.matchedCount === 0) {
    throw badRequest('INVALID_RESET_TOKEN', 'This reset link is invalid or has expired.');
  }

  // Sign out every device after a password reset.
  await sessionService.revokeAllUserSessions(resetToken.user, 'password_reset');
}

module.exports = {
  issueAuthResult,
  register,
  login,
  refresh,
  logout,
  getUserById,
  requestPasswordReset,
  resetPassword,
};
