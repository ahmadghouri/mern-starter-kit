const request = require('supertest');
const { createApp } = require('../../src/app');
const { config } = require('../../src/config/env');
const { User } = require('../../src/models/User');
const { OAuthState } = require('../../src/models/OAuthState');
const { validateClaims } = require('../../src/lib/google');
const { useTestDatabase } = require('../helpers/db');
const { VALID_USER, getRefreshCookie, registerUser } = require('../helpers/auth');

useTestDatabase();

const app = createApp();
const CLIENT_ID = config.google.clientId;
const GOOGLE_PROFILE = {
  sub: 'google-user-123',
  email: 'Sara.Google@Gmail.com',
  email_verified: true,
  name: 'Sara Google',
};

function fakeIdToken(claims) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const payload = {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...claims,
  };
  return `${encode({ alg: 'RS256' })}.${encode(payload)}.signature`;
}

/** Mocks Google's token endpoint. Returns the jest spy. */
function mockGoogleToken(claims = GOOGLE_PROFILE, { status = 200 } = {}) {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status === 200,
    status,
    json: async () =>
      status === 200 ? { id_token: fakeIdToken(claims) } : { error: 'invalid_grant' },
  });
}

function getCookie(response, name) {
  const cookie = (response.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${name}=`));
  return cookie ?? null;
}

/** Starts the flow like a browser and returns the state and its cookie. */
async function startFlow(cookie) {
  const req = request(app).get(`/api/auth/google${cookie ? '?intent=link' : ''}`);
  const response = await (cookie ? req.set('Cookie', cookie) : req).expect(302);
  const location = new URL(response.headers.location);
  const stateCookie = getCookie(response, 'oauth_state');
  return { response, location, state: location.searchParams.get('state'), stateCookie };
}

function callback({ state, stateCookie, code = 'auth-code', extra = '' }) {
  const req = request(app).get(
    `/api/auth/google/callback?state=${encodeURIComponent(state)}&code=${code}${extra}`,
  );
  return stateCookie ? req.set('Cookie', stateCookie.split(';')[0]) : req;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/auth/providers', () => {
  it('reports Google as enabled when configured', async () => {
    const response = await request(app).get('/api/auth/providers').expect(200);
    expect(response.body.data.providers).toEqual({ google: true });
  });

  it('reports Google as disabled and hides its routes when not configured', async () => {
    const disabledApp = createApp({ google: { enabled: false } });

    const response = await request(disabledApp).get('/api/auth/providers').expect(200);
    expect(response.body.data.providers).toEqual({ google: false });
    await request(disabledApp).get('/api/auth/google').expect(404);
    await request(disabledApp).get('/api/auth/google/callback').expect(404);
  });
});

describe('GET /api/auth/google', () => {
  it('redirects to Google with state, PKCE, and a short-lived state cookie', async () => {
    const { location, state, stateCookie } = await startFlow();

    expect(location.origin + location.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(location.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(location.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/api/auth/google/callback',
    );
    expect(location.searchParams.get('scope')).toBe('openid email profile');
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('code_challenge')).toMatch(/^[\w-]{43}$/);
    expect(location.toString()).not.toContain(config.google.clientSecret);

    expect(stateCookie).toContain(`oauth_state=${state}`);
    expect(stateCookie).toMatch(/HttpOnly/i);
    expect(stateCookie).toMatch(/SameSite=Lax/i);
    expect(stateCookie).toMatch(/Path=\/api\/auth\/google/);

    // Only the hash of the state is stored.
    const record = await OAuthState.findOne();
    expect(record.stateHash).not.toBe(state);
  });
});

describe('GET /api/auth/google/callback', () => {
  it('creates a new user, signs them in, and redirects to the app', async () => {
    const fetchSpy = mockGoogleToken();
    const { state, stateCookie } = await startFlow();

    const response = await callback({ state, stateCookie }).expect(302);

    expect(response.headers.location).toBe('http://localhost:5173/');
    const refreshCookie = getRefreshCookie(response);
    expect(refreshCookie).toBeTruthy();

    const user = await User.findOne({ email: 'sara.google@gmail.com' }).select('+passwordHash');
    expect(user).toMatchObject({ name: 'Sara Google', googleId: 'google-user-123', role: 'user' });
    expect(user.passwordHash).toBeUndefined();

    // The token request used the PKCE verifier and the client secret.
    const body = new URLSearchParams(fetchSpy.mock.calls[0][1].body);
    expect(body.get('code')).toBe('auth-code');
    expect(body.get('code_verifier')).toMatch(/^[\w-]{40,}$/);
    expect(body.get('client_secret')).toBe(config.google.clientSecret);

    const refreshed = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);
    expect(refreshed.body.data.user).toMatchObject({ email: 'sara.google@gmail.com', googleLinked: true });
  });

  it('signs in an existing Google user without creating a duplicate', async () => {
    mockGoogleToken();
    const first = await startFlow();
    await callback(first).expect(302);
    const second = await startFlow();

    const response = await callback(second).expect(302);

    expect(response.headers.location).toBe('http://localhost:5173/');
    expect(await User.countDocuments()).toBe(1);
  });

  it('never links automatically to an existing password account with the same email', async () => {
    await registerUser(app, { email: 'sara.google@gmail.com' });
    mockGoogleToken();
    const flow = await startFlow();

    const response = await callback(flow).expect(302);

    expect(response.headers.location).toBe(
      'http://localhost:5173/login?error=google_account_exists',
    );
    expect(getRefreshCookie(response)).toBeNull();
    const user = await User.findOne({ email: 'sara.google@gmail.com' });
    expect(user.googleId).toBeUndefined();
  });

  it.each([
    ['a missing state cookie', (flow) => ({ ...flow, stateCookie: null })],
    ['a state that does not match the cookie', (flow) => ({ ...flow, state: `${flow.state}x` })],
  ])('rejects %s', async (label, change) => {
    const fetchSpy = mockGoogleToken();
    const flow = await startFlow();

    const response = await callback(change(flow)).expect(302);

    expect(response.headers.location).toBe('http://localhost:5173/login?error=google_state_invalid');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('accepts each state only once', async () => {
    mockGoogleToken();
    const flow = await startFlow();
    await callback(flow).expect(302);

    const replay = await callback(flow).expect(302);
    expect(replay.headers.location).toContain('error=google_state_invalid');
  });

  it('handles a cancelled Google consent screen', async () => {
    const flow = await startFlow();

    const response = await callback({ ...flow, extra: '&error=access_denied' }).expect(302);
    expect(response.headers.location).toBe('http://localhost:5173/login?error=google_cancelled');
  });

  it('rejects unverified Google emails and failed token exchanges', async () => {
    mockGoogleToken({ ...GOOGLE_PROFILE, email_verified: false });
    const unverified = await callback(await startFlow()).expect(302);
    expect(unverified.headers.location).toContain('error=google_email_unverified');

    jest.restoreAllMocks();
    mockGoogleToken(GOOGLE_PROFILE, { status: 400 });
    const failed = await callback(await startFlow()).expect(302);
    expect(failed.headers.location).toContain('error=google_failed');

    expect(await User.countDocuments()).toBe(0);
  });
});

describe('connecting Google to an existing account', () => {
  it('links Google to the signed-in user and allows Google sign-in afterwards', async () => {
    const { refreshCookie } = await registerUser(app, { email: 'owner@example.com' });
    mockGoogleToken({ ...GOOGLE_PROFILE, email: 'other.address@gmail.com' });

    const flow = await startFlow(refreshCookie);
    const linked = await callback(flow).expect(302);

    expect(linked.headers.location).toBe('http://localhost:5173/profile?google=linked');
    const user = await User.findOne({ email: 'owner@example.com' });
    expect(user.googleId).toBe('google-user-123');

    const login = await callback(await startFlow()).expect(302);
    expect(login.headers.location).toBe('http://localhost:5173/');
    expect(await User.countDocuments()).toBe(1);
  });

  it('asks to sign in first when there is no valid session', async () => {
    const response = await request(app).get('/api/auth/google?intent=link').expect(302);
    expect(response.headers.location).toBe('http://localhost:5173/login?error=google_link_signin');
  });

  it('refuses a Google account that already belongs to another user', async () => {
    mockGoogleToken();
    await callback(await startFlow()).expect(302); // creates the Google user
    const { refreshCookie } = await registerUser(app, { email: 'owner@example.com' });

    const response = await callback(await startFlow(refreshCookie)).expect(302);

    expect(response.headers.location).toBe(
      'http://localhost:5173/profile?error=google_already_linked',
    );
  });
});

describe('Google-only accounts', () => {
  async function signUpWithGoogle() {
    mockGoogleToken();
    const response = await callback(await startFlow()).expect(302);
    const refreshed = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', getRefreshCookie(response))
      .expect(200);
    return refreshed.body.data.accessToken;
  }

  it('cannot sign in with a password', async () => {
    await signUpWithGoogle();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sara.google@gmail.com', password: 'Anything123' })
      .expect(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('gets a clear error when changing a password it does not have', async () => {
    const accessToken = await signUpWithGoogle();

    const response = await request(app)
      .put('/api/profile/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'x', newPassword: 'BrandNew123' })
      .expect(400);
    expect(response.body.error.code).toBe('NO_PASSWORD_SET');
  });

  it('cannot disconnect Google without a password, but password accounts can', async () => {
    const googleOnly = await signUpWithGoogle();
    const blocked = await request(app)
      .delete('/api/profile/google')
      .set('Authorization', `Bearer ${googleOnly}`)
      .expect(400);
    expect(blocked.body.error.code).toBe('NO_PASSWORD_SET');

    const owner = await registerUser(app, { email: 'owner@example.com' });
    await User.updateOne({ email: 'owner@example.com' }, { googleId: 'google-owner-1' });
    const response = await request(app)
      .delete('/api/profile/google')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(response.body.data.user.googleLinked).toBe(false);
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: VALID_USER.password })
      .expect(200);
  });
});

describe('validateClaims', () => {
  const valid = {
    iss: 'https://accounts.google.com',
    aud: 'client-1',
    exp: Math.floor(Date.now() / 1000) + 60,
    sub: '1',
    email: 'A@B.com',
    email_verified: true,
  };

  it('returns a normalized profile', () => {
    expect(validateClaims(valid, { clientId: 'client-1' })).toEqual({
      googleId: '1',
      email: 'a@b.com',
      name: null,
    });
  });

  it.each([
    ['issuer', { iss: 'https://evil.example' }],
    ['audience', { aud: 'another-client' }],
    ['expiry', { exp: Math.floor(Date.now() / 1000) - 1 }],
    ['subject', { sub: '' }],
  ])('rejects a wrong %s', (label, change) => {
    expect(() => validateClaims({ ...valid, ...change }, { clientId: 'client-1' })).toThrow();
  });
});
