const { Writable } = require('node:stream');

const LEVEL_NAMES = { 10: 'TRACE', 20: 'DEBUG', 30: 'INFO', 40: 'WARN', 50: 'ERROR', 60: 'FATAL' };
const LEVEL_COLORS = { 10: 90, 20: 90, 30: 32, 40: 33, 50: 31, 60: 35 };
// Fields already shown in the line, or noise in a terminal.
const HIDDEN_KEYS = new Set([
  'level', 'time', 'pid', 'hostname', 'service', 'msg', 'req', 'res', 'responseTime', 'err', 'reqId',
]);

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatTime(time) {
  const date = new Date(time);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatExtras(entry) {
  const extras = Object.entries(entry)
    .filter(([key, value]) => !HIDDEN_KEYS.has(key) && value !== undefined)
    .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`);
  return extras.length ? ` ${extras.join(' ')}` : '';
}

/**
 * Turns one pino JSON entry into a short line, for example:
 *   12:30:05 INFO  POST /api/auth/login 200 45ms user=665f...
 */
function formatLogLine(entry, { colors = false } = {}) {
  const levelName = (LEVEL_NAMES[entry.level] ?? 'LOG').padEnd(5);
  const level = colors ? `\x1b[${LEVEL_COLORS[entry.level] ?? 0}m${levelName}\x1b[0m` : levelName;
  const duration = entry.responseTime === undefined ? '' : ` ${Math.round(entry.responseTime)}ms`;

  let line = `${formatTime(entry.time)} ${level} ${entry.msg ?? ''}${duration}${formatExtras(entry)}`;

  if (entry.err?.stack) {
    line += `\n${entry.err.stack}`;
  } else if (entry.err?.message) {
    line += `\n  ${entry.err.type ?? 'Error'}: ${entry.err.message}`;
  }
  return `${line}\n`;
}

/** A stream that pino writes JSON lines to and that prints readable lines instead. */
function createPrettyStream(output = process.stdout) {
  const colors = Boolean(output.isTTY);

  return new Writable({
    write(chunk, encoding, callback) {
      for (const raw of chunk.toString().split('\n')) {
        if (!raw) continue;
        try {
          output.write(formatLogLine(JSON.parse(raw), { colors }));
        } catch {
          output.write(`${raw}\n`);
        }
      }
      callback();
    },
  });
}

module.exports = { formatLogLine, createPrettyStream };
