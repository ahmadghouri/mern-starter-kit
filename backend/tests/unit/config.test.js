const { loadConfig } = require('../../src/config/env');

const baseEnv = {
  MONGODB_URI: 'mongodb://localhost/test',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
};

describe('loadConfig', () => {
  it('applies safe defaults', () => {
    const config = loadConfig(baseEnv);

    expect(config.env).toBe('development');
    expect(config.auth.accessTokenTtlSeconds).toBe(900);
    expect(config.auth.cookieSecure).toBe(false);
    expect(config.corsOrigins).toEqual(['http://localhost:5173']);
  });

  it('parses a comma separated origin list', () => {
    const config = loadConfig({ ...baseEnv, CORS_ORIGINS: 'https://a.com, https://b.com' });
    expect(config.corsOrigins).toEqual(['https://a.com', 'https://b.com']);
  });

  it('rejects a short JWT secret without printing its value', () => {
    expect(() => loadConfig({ ...baseEnv, JWT_ACCESS_SECRET: 'tiny-secret' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
    expect(() => loadConfig({ ...baseEnv, JWT_ACCESS_SECRET: 'tiny-secret' })).not.toThrow(
      /tiny-secret/,
    );
  });

  it('requires SMTP and secure cookies in production', () => {
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'production' })).toThrow(/EMAIL_TRANSPORT/);
    expect(() =>
      loadConfig({
        ...baseEnv,
        NODE_ENV: 'production',
        EMAIL_TRANSPORT: 'smtp',
        SMTP_HOST: 'smtp.example.com',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow(/COOKIE_SECURE/);
  });

  it('defaults to secure cookies in production', () => {
    const config = loadConfig({
      ...baseEnv,
      NODE_ENV: 'production',
      EMAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'smtp.example.com',
    });
    expect(config.auth.cookieSecure).toBe(true);
  });
});
