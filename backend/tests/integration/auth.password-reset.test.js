const request = require('supertest');
const { createApp } = require('../../src/app');
const { outbox } = require('../../src/services/email.service');
const { PasswordResetToken } = require('../../src/models/PasswordResetToken');
const { useTestDatabase } = require('../helpers/db');
const { VALID_USER, registerUser } = require('../helpers/auth');

useTestDatabase();

const app = createApp();

beforeEach(() => {
  outbox.length = 0;
});

function extractResetToken(email) {
  const match = email.text.match(/token=([\w-]+)/);
  return match ? match[1] : null;
}

async function requestReset(email = VALID_USER.email) {
  return request(app).post('/api/auth/forgot-password').send({ email }).expect(200);
}

describe('POST /api/auth/forgot-password', () => {
  it('sends a reset email with a link to the frontend', async () => {
    await registerUser(app);
    const response = await requestReset();

    expect(response.body.data.message).toMatch(/if an account exists/i);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe(VALID_USER.email);
    expect(outbox[0].text).toContain('http://localhost:5173/reset-password?token=');
  });

  it('returns the same response for unknown emails and sends nothing', async () => {
    const response = await requestReset('nobody@example.com');

    expect(response.body.data.message).toMatch(/if an account exists/i);
    expect(outbox).toHaveLength(0);
  });

  it('stores only a hash of the reset token', async () => {
    await registerUser(app);
    await requestReset();
    const token = extractResetToken(outbox[0]);
    const stored = await PasswordResetToken.findOne();

    expect(stored.tokenHash).not.toBe(token);
    expect(stored.tokenHash).toMatch(/^[a-f\d]{64}$/);
  });

  it('keeps only the newest reset token', async () => {
    await registerUser(app);
    await requestReset();
    await requestReset();

    expect(await PasswordResetToken.countDocuments()).toBe(1);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('updates the password, signs out all sessions, and is single use', async () => {
    const { refreshCookie } = await registerUser(app);
    await requestReset();
    const token = extractResetToken(outbox[0]);
    const newPassword = 'NewPassword456';

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: newPassword })
      .expect(200);

    // Old sessions are revoked.
    await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie).expect(401);

    // Old password fails, new password works.
    await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password })
      .expect(401);
    await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: newPassword })
      .expect(200);

    // Token cannot be reused.
    const reuse = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'AnotherPass789' })
      .expect(400);
    expect(reuse.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('rejects an expired token', async () => {
    await registerUser(app);
    await requestReset();
    const token = extractResetToken(outbox[0]);
    await PasswordResetToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'NewPassword456' })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('rejects an unknown token', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'x'.repeat(43), password: 'NewPassword456' })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('enforces the password policy', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'x'.repeat(43), password: 'short' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
