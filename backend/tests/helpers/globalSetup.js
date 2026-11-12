const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async function globalSetup() {
  const mongo = await MongoMemoryServer.create();
  globalThis.__MONGO_SERVER__ = mongo;
  // Workers read this and append their own database name.
  process.env.TEST_MONGODB_BASE_URI = mongo.getUri();
};
