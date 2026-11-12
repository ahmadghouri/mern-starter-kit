import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const API_PORT = 5191;
const WEB_PORT = 5190;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const isCI = Boolean(process.env.CI);
// Reusing a running server is opt-in, so tests never hit another project's dev server by accident.
const reuseExistingServer = process.env.E2E_REUSE_SERVER === '1';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // API with a throwaway in-memory MongoDB (see backend/scripts/start-e2e.js).
      command: 'pnpm run start:e2e',
      cwd: path.join(rootDir, '../backend'),
      url: `http://localhost:${API_PORT}/api/health/ready`,
      env: { PORT: String(API_PORT), CORS_ORIGINS: WEB_URL, APP_URL: WEB_URL },
      reuseExistingServer,
      timeout: 180_000,
    },
    {
      command: `pnpm run dev --port ${WEB_PORT} --strictPort`,
      cwd: path.join(rootDir, '../frontend'),
      url: WEB_URL,
      env: { VITE_API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
});
