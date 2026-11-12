const express = require('express');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { authenticate, requireRole } = require('../../src/middleware/authenticate');
const { errorHandler } = require('../../src/middleware/errorHandler');
const { User } = require('../../src/models/User');
const { useTestDatabase } = require('../helpers/db');
const { registerUser } = require('../helpers/auth');

useTestDatabase();

const app = createApp();

describe('health checks', () => {
  it('GET /api/health/live returns ok', async () => {
    const response = await request(app).get('/api/health/live').expect(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('GET /api/health/ready reports the database as up', async () => {
    const response = await request(app).get('/api/health/ready').expect(200);
    expect(response.body.data.database).toBe('up');
  });
});

describe('app hardening', () => {
  it('sets security headers and hides Express', async () => {
    const response = await request(app).get('/api/health/live');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/api/does-not-exist').expect(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('returns 413 for oversized bodies', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'x'.repeat(20_000) })
      .expect(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('hides internal error details', async () => {
    const broken = express();
    broken.get('/boom', () => {
      throw new Error('database password is hunter2');
    });
    broken.use(errorHandler);

    const response = await request(broken).get('/boom').expect(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toMatch(/hunter2/);
  });
});

describe('requireRole', () => {
  const adminApp = express();
  adminApp.get('/admin', authenticate, requireRole('admin'), (req, res) => res.json({ ok: true }));
  adminApp.use(errorHandler);

  it('blocks users without the role', async () => {
    const { accessToken } = await registerUser(app);
    await request(adminApp).get('/admin').set('Authorization', `Bearer ${accessToken}`).expect(403);
  });

  it('allows users with the role', async () => {
    const { user, credentials } = await registerUser(app);
    await User.updateOne({ _id: user.id }, { $set: { role: 'admin' } });
    const login = await request(app).post('/api/auth/login').send(credentials).expect(200);

    await request(adminApp)
      .get('/admin')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .expect(200);
  });
});
