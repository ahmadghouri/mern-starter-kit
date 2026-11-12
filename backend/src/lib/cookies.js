const { config } = require('../config/env');

const REFRESH_COOKIE_NAME = 'refresh_token';

// Scope the cookie to auth endpoints so it is not sent with every API call.
const REFRESH_COOKIE_PATH = '/api/auth';

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  };
}

function setRefreshCookie(res, token, expiresAt) {
  res.cookie(REFRESH_COOKIE_NAME, token, { ...baseCookieOptions(), expires: expiresAt });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
}

function readRefreshCookie(req) {
  const value = req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

module.exports = {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  setRefreshCookie,
  clearRefreshCookie,
  readRefreshCookie,
};
