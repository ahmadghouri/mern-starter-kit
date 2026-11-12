const crypto = require('node:crypto');
const { config } = require('../config/env');

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const REQUEST_TIMEOUT_MS = 10_000;

/** Error raised for any failed step with Google. `code` is safe to show in a URL. */
class GoogleAuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GoogleAuthError';
    this.code = code;
  }
}

/** PKCE (RFC 7636): the verifier stays on the server, Google only sees its hash. */
function createPkcePair() {
  const codeVerifier = crypto.randomBytes(48).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

function buildAuthorizationUrl({ state, codeChallenge, google = config.google }) {
  const url = new URL(AUTH_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: google.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return url.toString();
}

function decodeJwtPayload(token) {
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 3) {
    throw new GoogleAuthError('google_failed', 'Google returned an invalid ID token');
  }
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new GoogleAuthError('google_failed', 'Google returned an invalid ID token');
  }
}

/**
 * Checks the ID token claims. The token comes straight from Google's token
 * endpoint over TLS, so per OpenID Connect Core 3.1.3.7 the TLS connection
 * authenticates it and a separate signature check is not required.
 */
function validateClaims(claims, { clientId, now = Date.now() }) {
  if (!ISSUERS.has(claims.iss)) {
    throw new GoogleAuthError('google_failed', 'Unexpected ID token issuer');
  }
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(clientId)) {
    throw new GoogleAuthError('google_failed', 'ID token is for another client');
  }
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now) {
    throw new GoogleAuthError('google_failed', 'ID token has expired');
  }
  if (typeof claims.sub !== 'string' || !claims.sub || typeof claims.email !== 'string') {
    throw new GoogleAuthError('google_failed', 'ID token is missing required claims');
  }
  if (claims.email_verified !== true && claims.email_verified !== 'true') {
    throw new GoogleAuthError('google_email_unverified', 'Google email address is not verified');
  }

  return {
    googleId: claims.sub,
    email: claims.email.trim().toLowerCase(),
    name: typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim() : null,
  };
}

/** Exchanges the authorization code for tokens and returns the verified Google profile. */
async function exchangeCodeForProfile({ code, codeVerifier, google = config.google }) {
  let response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        code,
        client_id: google.clientId,
        client_secret: google.clientSecret,
        redirect_uri: google.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GoogleAuthError('google_unavailable', 'Could not reach Google');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.id_token) {
    // `body.error` is a short code such as "invalid_grant"; it never contains secrets.
    throw new GoogleAuthError('google_failed', `Token exchange failed: ${body?.error ?? response.status}`);
  }

  return validateClaims(decodeJwtPayload(body.id_token), { clientId: google.clientId });
}

module.exports = {
  GoogleAuthError,
  createPkcePair,
  buildAuthorizationUrl,
  exchangeCodeForProfile,
  validateClaims,
};
