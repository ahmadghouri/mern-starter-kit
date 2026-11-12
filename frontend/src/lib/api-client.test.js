import {
  ApiError,
  apiRequest,
  getAccessToken,
  onSessionExpired,
  refreshSession,
  setAccessToken,
} from './api-client';
import { authResponse, mockApi, unauthorized } from '@/test/mock-api';

describe('apiRequest', () => {
  it('returns the data envelope and sends the bearer token', async () => {
    setAccessToken('token-1');
    const fetchMock = mockApi({ 'GET /api/things': { status: 200, body: { data: { ok: true } } } });

    await expect(apiRequest('/things')).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token-1');
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  });

  it('does not send the token when auth is false', async () => {
    setAccessToken('token-1');
    const fetchMock = mockApi({ 'POST /api/auth/login': authResponse() });

    await apiRequest('/auth/login', { method: 'POST', body: {}, auth: false });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('throws ApiError with the server code, message, and details', async () => {
    mockApi({
      'POST /api/auth/register': {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please check the highlighted fields',
            details: [{ field: 'email', message: 'Enter a valid email address' }],
          },
        },
      },
    });

    const error = await apiRequest('/auth/register', { method: 'POST', body: {}, auth: false }).catch(
      (caught) => caught,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toHaveLength(1);
  });

  it('maps network failures to a friendly NETWORK_ERROR', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiRequest('/things')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('returns null for 204 responses', async () => {
    mockApi({ 'DELETE /api/things/1': { status: 204 } });
    await expect(apiRequest('/things/1', { method: 'DELETE' })).resolves.toBeNull();
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    setAccessToken('expired');
    let calls = 0;
    const fetchMock = mockApi({
      'GET /api/things': (request) => {
        calls += 1;
        return request.headers.Authorization === 'Bearer access-token'
          ? { status: 200, body: { data: { ok: true } } }
          : unauthorized('ACCESS_TOKEN_EXPIRED');
      },
      'POST /api/auth/refresh': authResponse(),
    });

    await expect(apiRequest('/things')).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
    expect(getAccessToken()).toBe('access-token');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('notifies listeners and rethrows when the refresh fails', async () => {
    setAccessToken('expired');
    mockApi({
      'GET /api/things': unauthorized('ACCESS_TOKEN_EXPIRED'),
      'POST /api/auth/refresh': unauthorized('INVALID_REFRESH_TOKEN'),
    });
    const listener = jest.fn();
    const unsubscribe = onSessionExpired(listener);

    await expect(apiRequest('/things')).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
    unsubscribe();
  });
});

describe('refreshSession', () => {
  it('shares one request between concurrent callers (single flight)', async () => {
    const fetchMock = mockApi({ 'POST /api/auth/refresh': authResponse() });

    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });
});
