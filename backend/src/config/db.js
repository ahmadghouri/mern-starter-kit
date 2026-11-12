const mongoose = require('mongoose');
const { logger } = require('../lib/logger');

// Drop unknown fields from query filters instead of passing them to MongoDB.
mongoose.set('strictQuery', true);

async function connectDatabase(uri) {
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info('MongoDB connected');
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDatabase, disconnectDatabase, isDatabaseReady };
