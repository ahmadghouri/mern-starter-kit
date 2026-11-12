/** @type {import('jest').Config} */
export default {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/src/test/polyfills.js'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup-tests.js'],
  // Order matters: the first matching pattern wins.
  moduleNameMapper: {
    '\\.css$': 'identity-obj-proxy',
    '\\.(svg|png|jpe?g|webp|avif|gif)$': '<rootDir>/src/test/file.mock.js',
    // import.meta.env is Vite-only, so tests use a static config.
    '^@/config/env$': '<rootDir>/src/test/env.mock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/main.jsx', '!src/test/**'],
};
