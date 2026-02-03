import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3001',
    headless: false, // Set to true for CI
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3001,
    reuseExistingServer: true,
  },
});
