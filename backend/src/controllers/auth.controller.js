const { config } = require('../config/env');
const authService = require('../services/auth.service');
const sessionService = require('../services/session.service');
const { toPublicSession } = require('../models/Session');
const { setRefreshCookie, clearRefreshCookie, readRefreshCookie } = require('../lib/cookies');

const PASSWORD_RESET_REQUESTED_MESSAGE =
  'If an account exists for this email, a password reset link has been sent.';

function requestContext(req) {
  return { userAgent: req.get('user-agent') ?? '', ip: req.ip ?? '' };
}

function sendAuthResult(res, statusCode, result) {
  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
  res.status(statusCode).json({
    data: {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: config.auth.accessTokenTtlSeconds,
    },
  });
}

async function register(req, res) {
  const result = await authService.register(req.validated.body, requestContext(req));
  sendAuthResult(res, 201, result);
}

async function login(req, res) {
  const result = await authService.login(req.validated.body, requestContext(req));
  sendAuthResult(res, 200, result);
}

async function refresh(req, res) {
  try {
    const result = await authService.refresh(readRefreshCookie(req), requestContext(req));
    sendAuthResult(res, 200, result);
  } catch (error) {
    // A conflict means another request already rotated the cookie; keep it.
    if (error.code !== 'REFRESH_CONFLICT') {
      clearRefreshCookie(res);
    }
    throw error;
  }
}

async function logout(req, res) {
  await authService.logout(readRefreshCookie(req));
  clearRefreshCookie(res);
  res.status(204).end();
}

async function logoutAll(req, res) {
  await sessionService.revokeAllUserSessions(req.auth.userId, 'logout_all');
  clearRefreshCookie(res);
  res.status(204).end();
}

async function me(req, res) {
  const user = await authService.getUserById(req.auth.userId);
  res.json({ data: { user } });
}

async function forgotPassword(req, res) {
  await authService.requestPasswordReset(req.validated.body.email);
  res.json({ data: { message: PASSWORD_RESET_REQUESTED_MESSAGE } });
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.validated.body);
  clearRefreshCookie(res);
  res.json({ data: { message: 'Your password has been updated. Please sign in.' } });
}

async function listSessions(req, res) {
  const sessions = await sessionService.listActiveUserSessions(req.auth.userId);
  res.json({
    data: { sessions: sessions.map((session) => toPublicSession(session, req.auth.sessionId)) },
  });
}

async function revokeSession(req, res) {
  const { sessionId } = req.validated.params;
  await sessionService.revokeUserSession({ userId: req.auth.userId, sessionId });

  if (sessionId === req.auth.sessionId) {
    clearRefreshCookie(res);
  }
  res.status(204).end();
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  forgotPassword,
  resetPassword,
  listSessions,
  revokeSession,
};
