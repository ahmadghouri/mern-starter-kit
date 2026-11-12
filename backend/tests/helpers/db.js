const mongoose = require('mongoose');
const { config } = require('../../src/config/env');

async function connectTestDatabase() {
  if (!config.isTest) {
    throw new Error('Refusing to use a non-test database in tests');
  }
  await mongoose.connect(config.mongodbUri);
  await mongoose.connection.syncIndexes();
}

/** Clears the in-memory test database only. */
async function clearTestDatabase() {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

async function disconnectTestDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

/** Registers the standard lifecycle hooks for a test file. */
function useTestDatabase() {
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);
}

module.exports = { useTestDatabase };
