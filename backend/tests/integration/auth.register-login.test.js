const request = require('supertest');
const { createApp } = require('../../src/app');
const { User } = require('../../src/models/User');
const { useTestDatabase } = require('../helpers/db');
const { VALID_USER, getRefreshCookie, registerUser } = require('../helpers/auth');

useTestDatabase();

const app = createApp();

describe('POST /api/auth/register', () => {
  it('creates a user, returns an access token, and sets a secure refresh cookie', async () => {
    const response = await request(app).post('/api/auth/register').send(VALID_USER).expect(201);

    expect(response.body.data.user).toEqual({
      id: expect.any(String),
      name: VALID_USER.name,
      email: VALID_USER.email,
      role: 'user',
      avatarVersion: null,
      createdAt: expect.any(String),
    });
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.expiresIn).toBe(900);

    const setCookie = response.headers['set-cookie'].join(';');
    expect(setCookie).toMatch(/refresh_token=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(setCookie).toMatch(/Path=\/api\/auth/);
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    await registerUser(app);
    const user = await User.findOne({ email: VALID_USER.email }).select('+passwordHash');

    expect(user.passwordHash).not.toBe(VALID_USER.password);
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('normalizes email to lowercase', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, email: '  Mixed.Case@Example.COM ' })
      .expect(201);

    expect(response.body.data.user.email).toBe('mixed.case@example.com');
  });

  it('rejects a duplicate email with 409', async () => {
    await registerUser(app);
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, email: VALID_USER.email.toUpperCase() })
      .expect(409);

    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it.each([
    ['missing name', { name: '' }, 'name'],
    ['invalid email', { email: 'not-an-email' }, 'email'],
    ['short password', { password: 'abc1' }, 'password'],
    ['password without number', { password: 'onlyletters' }, 'password'],
    ['password over 72 bytes', { password: `${'a'.repeat(72)}1` }, 'password'],
  ])('rejects %s with field details', async (_label, overrides, field) => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, ...overrides })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field })]),
    );
  });

  it('rejects unknown fields such as role (mass assignment)', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, role: 'admin' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects non-string values (NoSQL injection attempt)', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: 'x' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials', async () => {
    await registerUser(app);
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password })
      .expect(200);

    expect(response.body.data.user.email).toBe(VALID_USER.email);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(getRefreshCookie(response)).toBeTruthy();
  });

  it('returns the same generic error for wrong password and unknown email', async () => {
    await registerUser(app);

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'WrongPassword1' })
      .expect(401);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPassword1' })
      .expect(401);

    expect(wrongPassword.body.error).toEqual(unknownEmail.body.error);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('never returns the password hash', async () => {
    await registerUser(app);
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});

describe('rate limiting', () => {
  it('returns 429 after too many auth attempts', async () => {
    const limitedApp = createApp({ rateLimit: { apiMax: 1000, authMax: 2, refreshMax: 1000 } });
    const attempt = () =>
      request(limitedApp).post('/api/auth/login').send({ email: 'a@example.com', password: 'x' });

    await attempt().expect(401);
    await attempt().expect(401);
    const response = await attempt().expect(429);

    expect(response.body.error.code).toBe('RATE_LIMITED');
  });
});
