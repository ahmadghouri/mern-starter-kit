const request = require('supertest');
const { createApp } = require('../../src/app');
const { User } = require('../../src/models/User');
const { Session } = require('../../src/models/Session');
const { useTestDatabase } = require('../helpers/db');
const { registerUser } = require('../helpers/auth');

useTestDatabase();

const app = createApp();

const authed = (method, path, token) =>
  request(app)[method](path).set('Authorization', `Bearer ${token}`);

/** Registers a user, promotes them to admin, and signs in again for a fresh token. */
async function createAdmin(overrides = {}) {
  const { user, credentials } = await registerUser(app, {
    name: 'Admin',
    email: 'admin@example.com',
    ...overrides,
  });
  await User.updateOne({ _id: user.id }, { role: 'admin' });
  const login = await request(app).post('/api/auth/login').send(credentials).expect(200);
  return { user: login.body.data.user, accessToken: login.body.data.accessToken };
}

describe('admin access control', () => {
  it('rejects requests without a token', async () => {
    await request(app).get('/api/admin/stats').expect(401);
  });

  it('rejects normal users with 403', async () => {
    const { accessToken } = await registerUser(app);
    const response = await authed('get', '/api/admin/users', accessToken).expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/admin/stats', () => {
  it('returns user and session counts', async () => {
    const admin = await createAdmin();
    await registerUser(app);

    const response = await authed('get', '/api/admin/stats', admin.accessToken).expect(200);

    // The admin has two sessions (register + login), the normal user one.
    expect(response.body.data.stats).toEqual({
      totalUsers: 2,
      admins: 1,
      newUsersLast7Days: 2,
      activeSessions: 3,
    });
  });
});

describe('GET /api/admin/users', () => {
  it('lists users with session counts and without password hashes', async () => {
    const admin = await createAdmin();
    await registerUser(app);

    const response = await authed('get', '/api/admin/users', admin.accessToken).expect(200);
    const { users, pagination } = response.body.data;

    expect(pagination).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
    expect(users).toHaveLength(2);
    expect(users[0]).toEqual(
      expect.objectContaining({ email: 'test.user@example.com', role: 'user', activeSessions: 1 }),
    );
    expect(JSON.stringify(users)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('searches by name or email and treats the term as plain text', async () => {
    const admin = await createAdmin();
    await registerUser(app, { name: 'Sara Khan', email: 'sara@example.com' });
    await registerUser(app, { name: 'Bilal', email: 'bilal@example.com' });

    const byName = await authed('get', '/api/admin/users?search=sara', admin.accessToken);
    expect(byName.body.data.users.map((u) => u.email)).toEqual(['sara@example.com']);

    const regexLike = await authed('get', '/api/admin/users?search=.*', admin.accessToken);
    expect(regexLike.body.data.users).toEqual([]);
  });

  it('filters by role and paginates', async () => {
    const admin = await createAdmin();
    await registerUser(app, { email: 'a@example.com' });
    await registerUser(app, { email: 'b@example.com' });

    const admins = await authed('get', '/api/admin/users?role=admin', admin.accessToken);
    expect(admins.body.data.users.map((u) => u.role)).toEqual(['admin']);

    const page2 = await authed('get', '/api/admin/users?limit=2&page=2', admin.accessToken);
    expect(page2.body.data.users).toHaveLength(1);
    expect(page2.body.data.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('validates query parameters', async () => {
    const admin = await createAdmin();

    for (const query of ['limit=0', 'limit=500', 'page=abc', 'role=owner', 'unknown=1']) {
      const response = await authed('get', `/api/admin/users?${query}`, admin.accessToken);
      expect(response.status).toBe(400);
    }
  });
});

describe('PATCH /api/admin/users/:userId/role', () => {
  const changeRole = (token, userId, role) =>
    authed('patch', `/api/admin/users/${userId}/role`, token).send({ role });

  it('promotes a user and signs them out so the new role applies', async () => {
    const admin = await createAdmin();
    const target = await registerUser(app);

    const response = await changeRole(admin.accessToken, target.user.id, 'admin').expect(200);

    expect(response.body.data.user.role).toBe('admin');
    await authed('get', '/api/auth/me', target.accessToken).expect(401);

    const revoked = await Session.findOne({ user: target.user.id });
    expect(revoked.revokedReason).toBe('role_changed');
  });

  it('demoted admins lose admin access immediately', async () => {
    const admin = await createAdmin();
    const other = await createAdmin({ email: 'second.admin@example.com' });

    await changeRole(admin.accessToken, other.user.id, 'user').expect(200);

    await authed('get', '/api/admin/stats', other.accessToken).expect(401);
  });

  it('does not revoke sessions when the role is unchanged', async () => {
    const admin = await createAdmin();
    const target = await registerUser(app);

    await changeRole(admin.accessToken, target.user.id, 'user').expect(200);

    await authed('get', '/api/auth/me', target.accessToken).expect(200);
  });

  it('blocks admins from changing their own role', async () => {
    const admin = await createAdmin();

    const response = await changeRole(admin.accessToken, admin.user.id, 'user').expect(400);

    expect(response.body.error.code).toBe('CANNOT_CHANGE_OWN_ROLE');
  });

  it('returns 404 for unknown users and 400 for bad input', async () => {
    const admin = await createAdmin();

    await changeRole(admin.accessToken, 'aaaaaaaaaaaaaaaaaaaaaaaa', 'admin').expect(404);
    await changeRole(admin.accessToken, 'not-an-id', 'admin').expect(400);
    await changeRole(admin.accessToken, admin.user.id, 'owner').expect(400);
  });
});

describe('DELETE /api/admin/users/:userId/sessions', () => {
  const revokeAll = (token, userId) => authed('delete', `/api/admin/users/${userId}/sessions`, token);

  it('signs a user out on every device', async () => {
    const admin = await createAdmin();
    const target = await registerUser(app);

    await revokeAll(admin.accessToken, target.user.id).expect(204);

    await authed('get', '/api/auth/me', target.accessToken).expect(401);
  });

  it('blocks admins from revoking their own sessions here', async () => {
    const admin = await createAdmin();

    await revokeAll(admin.accessToken, admin.user.id).expect(400);
  });

  it('returns 404 for unknown users', async () => {
    const admin = await createAdmin();

    await revokeAll(admin.accessToken, 'aaaaaaaaaaaaaaaaaaaaaaaa').expect(404);
  });
});
