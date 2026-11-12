// Runs before every test file, before any application module is loaded.
const baseUri = process.env.TEST_MONGODB_BASE_URI ?? 'mongodb://127.0.0.1:27017/';
const workerId = process.env.JEST_WORKER_ID ?? '1';
const databaseUri = new URL(baseUri);
databaseUri.pathname = `/starter-kit-test-${workerId}`;

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: databaseUri.toString(),
  JWT_ACCESS_SECRET: 'test-only-secret-value-that-is-long-enough-123',
  BCRYPT_ROUNDS: '4',
  EMAIL_TRANSPORT: 'memory',
  CORS_ORIGINS: 'http://localhost:5173',
  APP_URL: 'http://localhost:5173',
  RATE_LIMIT_API_MAX: '10000',
  RATE_LIMIT_AUTH_MAX: '10000',
  RATE_LIMIT_REFRESH_MAX: '10000',
});
