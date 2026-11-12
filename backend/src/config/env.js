const { z } = require('zod');

const booleanString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const commaSeparatedList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5050),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    // pretty: short readable lines in the terminal. json: one JSON object per line.
    LOG_FORMAT: z.enum(['pretty', 'json']).optional(),
    // Folder for app.log and error.log. Empty disables log files.
    LOG_DIR: z.string().trim().optional(),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_ISSUER: z.string().min(1).default('starter-kit-api'),
    JWT_AUDIENCE: z.string().min(1).default('starter-kit-web'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    SESSION_MAX_AGE_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    REFRESH_REUSE_GRACE_SECONDS: z.coerce.number().int().min(0).max(60).default(10),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(120).default(30),

    COOKIE_SECURE: booleanString.optional(),
    CORS_ORIGINS: commaSeparatedList.default(['http://localhost:5173']),
    APP_URL: z.url().default('http://localhost:5173'),

    RATE_LIMIT_API_MAX: z.coerce.number().int().min(1).default(300),
    RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(20),
    RATE_LIMIT_REFRESH_MAX: z.coerce.number().int().min(1).default(100),

    EMAIL_TRANSPORT: z.enum(['smtp', 'console', 'memory']).default('console'),
    EMAIL_FROM: z.string().min(1).default('Starter Kit <no-reply@example.com>'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: booleanString.default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') {
      return;
    }

    if (env.EMAIL_TRANSPORT !== 'smtp') {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_TRANSPORT'],
        message: 'EMAIL_TRANSPORT must be "smtp" in production',
      });
    }

    if (env.COOKIE_SECURE === false) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE cannot be false in production',
      });
    }
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_TRANSPORT === 'smtp' && !env.SMTP_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST is required when EMAIL_TRANSPORT is "smtp"',
      });
    }
  });

/**
 * Parses and validates environment variables.
 * Error messages list variable names only, never their values.
 */
function loadConfig(source = process.env) {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  const env = result.data;
  const isProduction = env.NODE_ENV === 'production';

  return Object.freeze({
    env: env.NODE_ENV,
    isProduction,
    isTest: env.NODE_ENV === 'test',
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    log: {
      // Production defaults to JSON on stdout for log collectors, and no files.
      format: env.LOG_FORMAT ?? (isProduction ? 'json' : 'pretty'),
      dir: env.LOG_DIR === undefined ? (isProduction ? null : 'logs') : env.LOG_DIR || null,
    },
    trustProxy: env.TRUST_PROXY,
    mongodbUri: env.MONGODB_URI,
    appUrl: env.APP_URL,
    corsOrigins: env.CORS_ORIGINS,
    auth: {
      accessTokenSecret: env.JWT_ACCESS_SECRET,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
      sessionMaxAgeDays: env.SESSION_MAX_AGE_DAYS,
      refreshReuseGraceSeconds: env.REFRESH_REUSE_GRACE_SECONDS,
      bcryptRounds: env.BCRYPT_ROUNDS,
      passwordResetTtlMinutes: env.PASSWORD_RESET_TTL_MINUTES,
      cookieSecure: env.COOKIE_SECURE ?? isProduction,
    },
    rateLimit: {
      apiMax: env.RATE_LIMIT_API_MAX,
      authMax: env.RATE_LIMIT_AUTH_MAX,
      refreshMax: env.RATE_LIMIT_REFRESH_MAX,
    },
    email: {
      transport: env.EMAIL_TRANSPORT,
      from: env.EMAIL_FROM,
      smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    },
  });
}

const config = loadConfig();

module.exports = { config, loadConfig };
