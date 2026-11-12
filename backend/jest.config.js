/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
  globalTeardown: '<rootDir>/tests/helpers/globalTeardown.js',
  setupFiles: ['<rootDir>/tests/helpers/setupEnv.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageThreshold: {
    global: { branches: 70, functions: 80, lines: 80, statements: 80 },
  },
  testTimeout: 30_000,
};
