import { env } from '@/config/env';

/**
 * Shared HTTP client for the backend API (native fetch).
 *
 * - The access token lives in memory only (never localStorage), which
 *   limits what an XSS bug could steal.
 * - The refresh token is an httpOnly cookie handled by the browser.
 * - On a 401, the client refreshes once and retries the request.
 * - Concurrent refreshes share one request ("single flight"), because the
 *   backend rotates the refresh token on every refresh.
 */

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let accessToken = null;
let refreshPromise = null;
const sessionExpiredListeners = new Set();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token ?? null;
}

/** Called when the session can no longer be refreshed. Returns an unsubscribe function. */
export function onSessionExpired(listener) {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function notifySessionExpired() {
  sessionExpiredListeners.forEach((listener) => listener());
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'HTTP_ERROR',
      body?.error?.message ?? 'Something went wrong. Please try again.',
      body?.error?.details,
    );
  }

  return body?.data ?? null;
}

async function send(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = { Accept: 'application/json' };
  // Blobs (for example images) are sent as-is with their own type; everything else as JSON.
  const isBlob = typeof Blob !== 'undefined' && body instanceof Blob;
  if (body !== undefined) {
    headers['Content-Type'] = isBlob ? body.type : 'application/json';
  }
  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response;
  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined || isBlob ? body : JSON.stringify(body),
      credentials: 'include',
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Check your connection.');
  }

  return parseResponse(response);
}

/** Exchanges the refresh cookie for a new access token. Resolves to `{ user, accessToken }`. */
export function refreshSession() {
  refreshPromise ??= send('/auth/refresh', { method: 'POST', auth: false })
    .then((data) => {
      setAccessToken(data.accessToken);
      return data;
    })
    .catch((error) => {
      setAccessToken(null);
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

/**
 * Sends an API request. Authenticated requests that fail with 401 are
 * retried once after refreshing the session.
 */
export async function apiRequest(path, options = {}) {
  try {
    return await send(path, options);
  } catch (error) {
    const shouldRefresh =
      options.auth !== false && error instanceof ApiError && error.status === 401;
    if (!shouldRefresh) {
      throw error;
    }

    try {
      await refreshSession();
    } catch {
      notifySessionExpired();
      throw error;
    }

    return send(path, options);
  }
}
