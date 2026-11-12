const request = require('supertest');
const { createApp } = require('../../src/app');
const { Session } = require('../../src/models/Session');
const { useTestDatabase } = require('../helpers/db');
const { getRefreshCookie, registerUser } = require('../helpers/auth');

useTestDatabase();

const app = createApp();

const refresh = (cookie) => {
  const req = request(app).post('/api/auth/refresh');
  return cookie ? req.set('Cookie', cookie) : req;
};

const authed = (method, path, token) =>
  request(app)[method](path).set('Authorization', `Bearer ${token}`);

describe('GET /api/auth/me', () => {
  it('returns the current user for a valid access token', async () => {
    const { accessToken, user } = await registerUser(app);
    const response = await authed('get', '/api/auth/me', accessToken).expect(200);

    expect(response.body.data.user).toEqual(user);
  });

  it('rejects missing, malformed, and tampered tokens', async () => {
    const { accessToken } = await registerUser(app);

    await request(app).get('/api/auth/me').expect(401);
    await request(app).get('/api/auth/me').set('Authorization', 'Basic abc').expect(401);

    const tampered = `${accessToken.slice(0, -2)}xx`;
    const response = await authed('get', '/api/auth/me', tampered).expect(401);
    expect(response.body.error.code).toBe('INVALID_ACCESS_TOKEN');
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates the refresh token and returns a new access token', async () => {
    const { refreshCookie } = await registerUser(app);

    const response = await refresh(refreshCookie).expect(200);
    const nextCookie = getRefreshCookie(response);

    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.user.email).toBeDefined();
    expect(nextCookie).toBeTruthy();
    expect(nextCookie).not.toBe(refreshCookie);

    // The new token works.
    await refresh(nextCookie).expect(200);
  });

  it('returns 401 without a refresh cookie', async () => {
    const response = await refresh().expect(401);
    expect(response.body.error.code).toBe('REFRESH_TOKEN_MISSING');
  });

  it('returns 401 for an unknown refresh token and clears the cookie', async () => {
    const response = await refresh('refresh_token=unknown-token').expect(401);

    expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    expect(response.headers['set-cookie'].join(';')).toMatch(/refresh_token=;/);
  });

  it('rejects a replayed token inside the grace window without revoking the session', async () => {
    const { refreshCookie } = await registerUser(app);
    const first = await refresh(refreshCookie).expect(200);

    const replay = await refresh(refreshCookie).expect(401);
    expect(replay.body.error.code).toBe('REFRESH_CONFLICT');

    // The legitimate, newest token still works.
    await refresh(getRefreshCookie(first)).expect(200);
  });

  it('revokes the session when an old token is replayed after the grace window', async () => {
    const { refreshCookie } = await registerUser(app);
    const first = await refresh(refreshCookie).expect(200);

    // Simulate the grace window having passed.
    await Session.updateMany({}, { $set: { rotatedAt: new Date(Date.now() - 60_000) } });

    const replay = await refresh(refreshCookie).expect(401);
    expect(replay.body.error.code).toBe('INVALID_REFRESH_TOKEN');

    // Reuse detection kills the whole session, including the newest token.
    await refresh(getRefreshCookie(first)).expect(401);
    const session = await Session.findOne();
    expect(session.revokedReason).toBe('reuse_detected');
  });

  it('rejects an expired session', async () => {
    const { refreshCookie } = await registerUser(app);
    await Session.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    await refresh(refreshCookie).expect(401);
  });

  it('rejects requests from an untrusted origin (CSRF defence)', async () => {
    const { refreshCookie } = await registerUser(app);
    const response = await refresh(refreshCookie).set('Origin', 'https://evil.example').expect(403);

    expect(response.body.error.code).toBe('UNTRUSTED_ORIGIN');
  });

  it('accepts requests from the configured origin', async () => {
    const { refreshCookie } = await registerUser(app);
    await refresh(refreshCookie).set('Origin', 'http://localhost:5173').expect(200);
  });
});

describe('logout', () => {
  it('POST /logout revokes the session, clears the cookie, and blocks the access token', async () => {
    const { refreshCookie, accessToken } = await registerUser(app);

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', refreshCookie)
      .expect(204);

    expect(response.headers['set-cookie'].join(';')).toMatch(/refresh_token=;/);
    await refresh(refreshCookie).expect(401);

    const me = await authed('get', '/api/auth/me', accessToken).expect(401);
    expect(me.body.error.code).toBe('SESSION_REVOKED');
  });

  it('POST /logout without a cookie still succeeds', async () => {
    await request(app).post('/api/auth/logout').expect(204);
  });

  it('POST /logout-all revokes every session of the user', async () => {
    const { accessToken, credentials, refreshCookie } = await registerUser(app);
    const secondLogin = await request(app).post('/api/auth/login').send(credentials).expect(200);

    await authed('post', '/api/auth/logout-all', accessToken).expect(204);

    await refresh(refreshCookie).expect(401);
    await refresh(getRefreshCookie(secondLogin)).expect(401);
  });
});

describe('sessions', () => {
  it('lists active sessions and marks the current one', async () => {
    const { accessToken, credentials } = await registerUser(app);
    await request(app)
      .post('/api/auth/login')
      .set('User-Agent', 'SecondDevice/1.0')
      .send(credentials)
      .expect(200);

    const response = await authed('get', '/api/auth/sessions', accessToken).expect(200);
    const { sessions } = response.body.data;

    expect(sessions).toHaveLength(2);
    expect(sessions.filter((session) => session.current)).toHaveLength(1);
    expect(sessions.some((session) => session.userAgent === 'SecondDevice/1.0')).toBe(true);
    expect(JSON.stringify(sessions)).not.toMatch(/tokenHash/);
  });

  it('revokes another session owned by the user', async () => {
    const { accessToken, credentials } = await registerUser(app);
    const second = await request(app).post('/api/auth/login').send(credentials).expect(200);
    const sessions = (await authed('get', '/api/auth/sessions', accessToken)).body.data.sessions;
    const other = sessions.find((session) => !session.current);

    await authed('delete', `/api/auth/sessions/${other.id}`, accessToken).expect(204);

    await refresh(getRefreshCookie(second)).expect(401);
    await authed('get', '/api/auth/me', accessToken).expect(200);
  });

  it("cannot revoke another user's session (returns 404)", async () => {
    const alice = await registerUser(app, { email: 'alice@example.com' });
    const bob = await registerUser(app, { email: 'bob@example.com' });
    const bobSessions = (await authed('get', '/api/auth/sessions', bob.accessToken)).body.data
      .sessions;

    const response = await authed(
      'delete',
      `/api/auth/sessions/${bobSessions[0].id}`,
      alice.accessToken,
    ).expect(404);

    expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    await refresh(bob.refreshCookie).expect(200);
  });

  it('validates the session id', async () => {
    const { accessToken } = await registerUser(app);
    const response = await authed('delete', '/api/auth/sessions/not-an-id', accessToken).expect(
      400,
    );
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
