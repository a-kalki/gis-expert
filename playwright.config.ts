import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    baseURL: 'http://localhost:3001',
  },
  webServer: {
    command: 'bun run src/api/server.ts',
    port: 3001,
    env: {
      PORT: '3001',
      DB_PATH: ':memory:',
      NODE_ENV: 'test'
    }
  },
});