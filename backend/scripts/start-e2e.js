/**
 * Starts the API against a throwaway in-memory MongoDB for E2E tests.
 * Never use this for development or production data.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

/** Creates the default admin and normal user (see scripts/seed.js) for E2E tests. */
async function seedE2eUsers() {
  // Required here because they read env variables set in main().
  const mongoose = require('mongoose');
  const { config } = require('../src/config/env');
  const { resolveSeedUsers, seedUsers } = require('./seed');

  await mongoose.connect(config.mongodbUri);
  try {
    await seedUsers(resolveSeedUsers({}, { isProduction: false }));
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  const mongo = await MongoMemoryServer.create();

  process.env.NODE_ENV = 'development';
  process.env.PORT = process.env.PORT ?? '5191';
  process.env.MONGODB_URI = mongo.getUri('starter-kit-e2e');
  process.env.JWT_ACCESS_SECRET = 'e2e-only-secret-value-that-is-long-enough-123';
  process.env.EMAIL_TRANSPORT = 'memory';
  process.env.BCRYPT_ROUNDS = '4';
  process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:5190';
  process.env.APP_URL = process.env.APP_URL ?? 'http://localhost:5190';
  process.env.RATE_LIMIT_AUTH_MAX = '1000';
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'warn';

  const stop = async () => {
    await mongo.stop();
  };
  process.on('exit', () => {
    void stop();
  });

  await seedE2eUsers();
  require('../src/server');
}

main().catch((error) => {
  console.error('Failed to start E2E server', error);
  process.exit(1);
});
