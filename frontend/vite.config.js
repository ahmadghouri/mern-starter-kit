import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Same-origin proxy in development so the refresh cookie (SameSite=Strict)
// works without cross-site cookie configuration.
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:5050';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(rootDir, 'src') },
  },
  server: {
    // If 5173 is busy, Vite uses the next free port. The API trusts any
    // localhost origin outside production, so auth keeps working.
    port: 5173,
    proxy: {
      '/api': { target: apiProxyTarget, changeOrigin: false },
    },
  },
  build: {
    sourcemap: false,
  },
});
