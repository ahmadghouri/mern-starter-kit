const path = require('node:path');
const pino = require('pino');
const { config } = require('../config/env');
const { createPrettyStream } = require('./log-format');

const BACKEND_ROOT = path.resolve(__dirname, '../..');

// Never log credentials. These paths are redacted from every log line.
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.currentPassword',
  '*.newPassword',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
];

function fileStream(dir, fileName) {
  return pino.destination({ dest: path.join(dir, fileName), mkdir: true, sync: false });
}

/**
 * Where logs go:
 * - Terminal: readable lines (pretty) or JSON (production default).
 * - LOG_DIR/app.log: every entry at LOG_LEVEL and above, as JSON.
 * - LOG_DIR/error.log: errors only, as JSON with stack traces.
 */
function buildStreams() {
  const streams = [
    {
      level: config.logLevel,
      stream: config.log.format === 'pretty' ? createPrettyStream() : process.stdout,
    },
  ];

  if (config.log.dir) {
    const dir = path.resolve(BACKEND_ROOT, config.log.dir);
    streams.push({ level: config.logLevel, stream: fileStream(dir, 'app.log') });
    streams.push({ level: 'error', stream: fileStream(dir, 'error.log') });
  }

  return streams;
}

const options = {
  level: config.isTest ? 'silent' : config.logLevel,
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  base: { service: 'starter-kit-api' },
};

// Tests stay silent and never create log files.
const logger = config.isTest || config.logLevel === 'silent'
  ? pino(options)
  : pino(options, pino.multistream(buildStreams()));

module.exports = { logger };
