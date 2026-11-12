module.exports = async function globalTeardown() {
  await globalThis.__MONGO_SERVER__?.stop();
};
