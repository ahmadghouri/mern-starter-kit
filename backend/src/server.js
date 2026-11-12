const { config } = require('./config/env');
const { logger } = require('./lib/logger');
const { connectDatabase, disconnectDatabase } = require('./config/db');
const { createApp } = require('./app');

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start() {
  await connectDatabase(config.mongodbUri);

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'API server listening');
  });

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(async () => {
      await disconnectDatabase();
      logger.info('Shutdown complete');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});

start().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
