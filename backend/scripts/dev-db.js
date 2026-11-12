/**
 * Starts a local MongoDB for development (data kept in <repo>/.mongo-data).
 * Uses the MongoDB binary that mongodb-memory-server already downloads for
 * tests, so no separate MongoDB install is needed.
 * If something is already listening on the port, it does nothing.
 */
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { MongoBinary } = require('mongodb-memory-server');

const HOST = '127.0.0.1';
const PORT = 27017;
const DATA_DIR = path.resolve(__dirname, '../../.mongo-data');

function isPortInUse(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

async function main() {
  if (await isPortInUse(PORT, HOST)) {
    console.log(`[dev-db] MongoDB already running on ${HOST}:${PORT}, skipping.`);
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const binary = await MongoBinary.getPath();

  console.log(`[dev-db] Starting MongoDB on ${HOST}:${PORT} (data: ${DATA_DIR})`);
  const mongod = spawn(
    binary,
    ['--dbpath', DATA_DIR, '--bind_ip', HOST, '--port', String(PORT), '--quiet'],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );

  const stop = () => mongod.kill();
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  mongod.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error('[dev-db] Failed to start MongoDB:', error.message);
  process.exit(1);
});
