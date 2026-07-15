const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        hasTouch: true
      },
    },
  ],
  webServer: {
    command: 'cross-env NODE_ENV=test USE_MOCK_MCP=true node --experimental-require-module server.js',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'test',
      USE_MOCK_MCP: 'true',
      GOOGLE_DRIVE_FOLDER_ID: 'dummy-root-folder-id',
      GOOGLE_CLIENT_ID: 'dummy-client-id',
      GOOGLE_CLIENT_SECRET: 'dummy-client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/google/callback',
      GOOGLE_REFRESH_TOKEN: 'dummy-refresh-token',
      META_APP_ID: 'dummy-meta-app-id',
      META_APP_SECRET: 'dummy-meta-app-secret',
      META_REDIRECT_URI: 'http://localhost:3000/api/meta/callback',
      META_ACCESS_TOKEN: 'dummy-meta-access-token',
      META_AD_ACCOUNT_ID: 'dummy-meta-ad-account-id',
      DASH_USER: 'admin',
      DASH_PASSWORD: 'password123'
    }
  },
});
