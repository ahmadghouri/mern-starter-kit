const { Router } = require('express');
const { config } = require('../config/env');
const { GoogleAuthError } = require('../lib/google');
const { setRefreshCookie, readRefreshCookie } = require('../lib/cookies');
const { notFound } = require('../lib/errors');
const googleAuth = require('../services/google-auth.service');
const sessionService = require('../services/session.service');

const STATE_COOKIE_NAME = 'oauth_state';
const STATE_COOKIE_PATH = '/api/auth/google';
const STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

function stateCookieOptions() {
  return {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    // Lax (not Strict) so the cookie is sent when Google redirects back.
    sameSite: 'lax',
    path: STATE_COOKIE_PATH,
  };
}

function appUrl(pathname, params = {}) {
  const url = new URL(pathname, config.appUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function readQueryString(value) {
  return typeof value === 'string' && value.length <= 2048 ? value : undefined;
}

/**
 * Google sign-in (OAuth 2.0 authorization code flow with PKCE).
 * Mounted at /api/auth/google. Every route returns 404 when Google is not configured.
 */
function createGoogleRouter({ limiters, google = config.google }) {
  const router = Router();

  router.use((req, res, next) => next(google.enabled ? undefined : notFound()));

  // GET /api/auth/google            -> sign in or sign up
  // GET /api/auth/google?intent=link -> connect Google to the signed-in account
  router.get('/', limiters.auth, async (req, res) => {
    let linkUserId = null;

    if (req.query.intent === 'link') {
      // Browser navigations carry no bearer token, so the refresh cookie identifies the user.
      const session = await sessionService.findActiveSessionByToken(readRefreshCookie(req));
      if (!session) {
        return res.redirect(appUrl('/login', { error: 'google_link_signin' }));
      }
      linkUserId = session.user;
    }

    const { state, url } = await googleAuth.startGoogleSignIn({ linkUserId });
    res.cookie(STATE_COOKIE_NAME, state, { ...stateCookieOptions(), maxAge: STATE_COOKIE_MAX_AGE_MS });
    return res.redirect(url);
  });

  router.get('/callback', limiters.auth, async (req, res) => {
    const cookieState = req.cookies?.[STATE_COOKIE_NAME];
    res.clearCookie(STATE_COOKIE_NAME, stateCookieOptions());

    try {
      const outcome = await googleAuth.completeGoogleSignIn({
        state: readQueryString(req.query.state),
        code: readQueryString(req.query.code),
        error: readQueryString(req.query.error),
        cookieState,
        context: { userAgent: req.get('user-agent') ?? '', ip: req.ip ?? '' },
      });

      if (outcome.type === 'linked') {
        return res.redirect(appUrl('/profile', { google: 'linked' }));
      }

      setRefreshCookie(res, outcome.result.refreshToken, outcome.result.refreshTokenExpiresAt);
      return res.redirect(appUrl('/'));
    } catch (error) {
      // This is a browser navigation, so always land on a page with a readable error.
      if (error instanceof GoogleAuthError) {
        req.log.warn({ code: error.code, reason: error.message }, 'Google sign-in failed');
        return res.redirect(appUrl(error.linking ? '/profile' : '/login', { error: error.code }));
      }
      req.log.error({ err: error }, 'Google sign-in crashed');
      return res.redirect(appUrl('/login', { error: 'google_failed' }));
    }
  });

  return router;
}

module.exports = { createGoogleRouter, STATE_COOKIE_NAME };
