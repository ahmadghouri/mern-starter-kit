/**
 * Seeds one admin and one normal user.
 *
 *   pnpm --filter backend seed
 *
 * - Non-destructive: existing users are left unchanged (no password reset,
 *   nothing deleted). Safe to run many times.
 * - Credentials come from SEED_* env variables. Development defaults are
 *   used only outside production; production requires explicit values.
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { config } = require('../src/config/env');
const { User } = require('../src/models/User');
const { registerBody } = require('../src/validators/auth.validators');

const DEV_DEFAULTS = Object.freeze({
  admin: { name: 'Admin User', email: 'admin@example.com', password: 'Admin12345' },
  user: { name: 'Normal User', email: 'user@example.com', password: 'User12345' },
});

/** Builds the list of users to seed from env, validating every value. */
function resolveSeedUsers(env = process.env, { isProduction = config.isProduction } = {}) {
  const roles = [
    { role: 'admin', prefix: 'SEED_ADMIN', defaults: DEV_DEFAULTS.admin },
    { role: 'user', prefix: 'SEED_USER', defaults: DEV_DEFAULTS.user },
  ];

  // Empty values (e.g. `SEED_ADMIN_EMAIL=` copied from .env.example) count as unset.
  const read = (name) => env[name]?.trim() || undefined;

  return roles.map(({ role, prefix, defaults }) => {
    const email = read(`${prefix}_EMAIL`);
    const password = read(`${prefix}_PASSWORD`);

    if (isProduction && (!email || !password)) {
      throw new Error(`${prefix}_EMAIL and ${prefix}_PASSWORD are required in production`);
    }

    const result = registerBody.safeParse({
      name: read(`${prefix}_NAME`) ?? defaults.name,
      email: email ?? defaults.email,
      password: password ?? defaults.password,
    });

    if (!result.success) {
      const problems = result.error.issues
        .map((issue) => `${prefix}_${issue.path.join('.').toUpperCase()}: ${issue.message}`)
        .join('; ');
      throw new Error(`Invalid seed data: ${problems}`);
    }

    return { ...result.data, role };
  });
}

/** Creates users that do not exist yet. Returns `{ email, role, status }` per user. */
async function seedUsers(users) {
  const results = [];

  for (const { name, email, password, role } of users) {
    const existing = await User.findOne({ email });
    if (existing) {
      results.push({ email, role: existing.role, status: 'exists' });
      continue;
    }

    const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
    await User.create({ name, email, passwordHash, role });
    results.push({ email, role, status: 'created' });
  }

  return results;
}

async function main() {
  const users = resolveSeedUsers();
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10_000 });

  try {
    const results = await seedUsers(users);
    for (const { email, role, status } of results) {
      console.log(`[seed] ${status === 'created' ? 'Created' : 'Already exists'}: ${email} (${role})`);
    }
    if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_USER_PASSWORD) {
      console.log('[seed] Development default passwords are listed in backend/.env.example');
    }
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[seed] Failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { resolveSeedUsers, seedUsers, DEV_DEFAULTS };
