const request = require('supertest');
const { createApp } = require('../../src/app');
const { User } = require('../../src/models/User');
const { resolveSeedUsers, seedUsers, DEV_DEFAULTS } = require('../../scripts/seed');
const { useTestDatabase } = require('../helpers/db');

useTestDatabase();

const app = createApp();

describe('resolveSeedUsers', () => {
  it('uses development defaults outside production', () => {
    const users = resolveSeedUsers({}, { isProduction: false });

    expect(users).toEqual([
      expect.objectContaining({ email: DEV_DEFAULTS.admin.email, role: 'admin' }),
      expect.objectContaining({ email: DEV_DEFAULTS.user.email, role: 'user' }),
    ]);
  });

  it('treats empty env values as unset', () => {
    const [admin] = resolveSeedUsers(
      { SEED_ADMIN_EMAIL: '', SEED_ADMIN_PASSWORD: '  ' },
      { isProduction: false },
    );
    expect(admin.email).toBe(DEV_DEFAULTS.admin.email);
  });

  it('reads and normalizes values from env', () => {
    const [admin] = resolveSeedUsers(
      { SEED_ADMIN_EMAIL: ' Boss@Example.com ', SEED_ADMIN_PASSWORD: 'StrongPass99' },
      { isProduction: false },
    );
    expect(admin).toMatchObject({ email: 'boss@example.com', password: 'StrongPass99' });
  });

  it('requires explicit credentials in production', () => {
    expect(() => resolveSeedUsers({}, { isProduction: true })).toThrow(/SEED_ADMIN_EMAIL/);
  });

  it('enforces the password policy without printing the password', () => {
    const run = () =>
      resolveSeedUsers({ SEED_USER_PASSWORD: 'weakpass' }, { isProduction: false });

    expect(run).toThrow(/SEED_USER_PASSWORD/);
    expect(run).not.toThrow(/weakpass/);
  });
});

describe('seedUsers', () => {
  it('creates an admin and a normal user who can log in', async () => {
    const users = resolveSeedUsers({}, { isProduction: false });
    const results = await seedUsers(users);

    expect(results.map((r) => r.status)).toEqual(['created', 'created']);

    const admin = await User.findOne({ email: DEV_DEFAULTS.admin.email }).select('+passwordHash');
    expect(admin.role).toBe('admin');
    expect(admin.passwordHash).toMatch(/^\$2[aby]\$/);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: DEV_DEFAULTS.user.email, password: DEV_DEFAULTS.user.password })
      .expect(200);
    expect(login.body.data.user.role).toBe('user');
  });

  it('is idempotent and never overwrites existing users', async () => {
    const users = resolveSeedUsers({}, { isProduction: false });
    await seedUsers(users);
    const before = await User.findOne({ email: DEV_DEFAULTS.admin.email }).select('+passwordHash');

    const changed = users.map((u) => ({ ...u, password: 'Different123' }));
    const results = await seedUsers(changed);
    const after = await User.findOne({ email: DEV_DEFAULTS.admin.email }).select('+passwordHash');

    expect(results.map((r) => r.status)).toEqual(['exists', 'exists']);
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(await User.countDocuments()).toBe(2);
  });
});
