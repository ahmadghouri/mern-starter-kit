const { PassThrough } = require('node:stream');
const { formatLogLine, createPrettyStream } = require('../../src/lib/log-format');
const { loadConfig } = require('../../src/config/env');

const time = new Date(2026, 0, 1, 12, 30, 5).getTime();

describe('formatLogLine', () => {
  it('formats an API call as one short line', () => {
    const line = formatLogLine({
      level: 30,
      time,
      pid: 1,
      hostname: 'pc',
      service: 'starter-kit-api',
      msg: 'POST /api/auth/login 200',
      responseTime: 44.6,
      userId: 'abc123',
      req: { method: 'POST' },
      res: { statusCode: 200 },
    });

    expect(line).toBe('12:30:05 INFO  POST /api/auth/login 200 45ms userId=abc123\n');
  });

  it('includes the stack trace for errors', () => {
    const line = formatLogLine({
      level: 50,
      time,
      msg: 'Unhandled error',
      err: { type: 'Error', message: 'boom', stack: 'Error: boom\n    at handler (app.js:1:1)' },
    });

    expect(line).toBe('12:30:05 ERROR Unhandled error\nError: boom\n    at handler (app.js:1:1)\n');
  });

  it('adds colors only when asked', () => {
    expect(formatLogLine({ level: 40, time, msg: 'x' }, { colors: true })).toContain('\x1b[33m');
    expect(formatLogLine({ level: 40, time, msg: 'x' })).not.toContain('\x1b[');
  });
});

describe('createPrettyStream', () => {
  it('prints readable lines and passes through non-JSON text', async () => {
    const output = new PassThrough();
    let text = '';
    output.on('data', (chunk) => {
      text += chunk;
    });

    const stream = createPrettyStream(output);
    stream.write(`${JSON.stringify({ level: 30, time, msg: 'hello' })}\nplain text\n`);
    await new Promise((resolve) => stream.end(resolve));

    expect(text).toBe('12:30:05 INFO  hello\nplain text\n');
  });
});

describe('log config', () => {
  const baseEnv = { MONGODB_URI: 'mongodb://localhost/test', JWT_ACCESS_SECRET: 'a'.repeat(32) };

  it('uses pretty output and a logs folder in development', () => {
    expect(loadConfig(baseEnv).log).toEqual({ format: 'pretty', dir: 'logs' });
  });

  it('uses JSON and no files in production by default', () => {
    const config = loadConfig({
      ...baseEnv,
      NODE_ENV: 'production',
      EMAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'smtp.example.com',
      COOKIE_SECURE: 'true',
      CORS_ORIGINS: 'https://app.example.com',
      APP_URL: 'https://app.example.com',
    });
    expect(config.log).toEqual({ format: 'json', dir: null });
  });

  it('lets an empty LOG_DIR disable files', () => {
    expect(loadConfig({ ...baseEnv, LOG_DIR: '' }).log.dir).toBeNull();
    expect(loadConfig({ ...baseEnv, LOG_DIR: 'var/log' }).log.dir).toBe('var/log');
  });
});
