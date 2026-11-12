/**
 * Replaces global fetch with a route table, e.g.
 *
 *   mockApi({
 *     'POST /api/auth/login': { status: 200, body: { data: {...} } },
 *     'GET /api/auth/sessions': (request) => ({ status: 200, body: ... }),
 *   });
 *
 * Unmatched routes return 404. Returns the jest mock so tests can inspect calls.
 */
export function mockApi(routes) {
  const fetchMock = jest.fn(async (url, options = {}) => {
    const method = options.method ?? 'GET';
    const key = `${method} ${url}`;
    const route = routes[key];
    const request = { url, method, headers: options.headers ?? {}, body: parseBody(options.body) };
    const result = typeof route === 'function' ? route(request) : route;
    const { status = 200, body = null } = result ?? { status: 404, body: { error: { code: 'NOT_FOUND', message: `No mock for ${key}` } } };

    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  });

  globalThis.fetch = fetchMock;
  return fetchMock;
}

function parseBody(body) {
  return typeof body === 'string' ? JSON.parse(body) : undefined;
}

export const testUser = Object.freeze({
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'user',
  createdAt: '2026-01-01T00:00:00.000Z',
});

export const authResponse = (user = testUser) => ({
  status: 200,
  body: { data: { user, accessToken: 'access-token', expiresIn: 900 } },
});

export const unauthorized = (code = 'REFRESH_TOKEN_MISSING') => ({
  status: 401,
  body: { error: { code, message: 'Please sign in to continue.' } },
});
