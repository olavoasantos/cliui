import {join} from 'node:path';
import {defineConfig, devices} from '@playwright/test';

function cwd(...paths: string[]) {
  return join(process.cwd(), ...paths);
}

export default defineConfig({
  testDir: './src',
  testMatch: 'specs/**/*.e2e.{ts,tsx}',

  /* Fail the build on CI if test.only is left in source */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Output directories */
  outputDir: cwd('.testing/test-results'),

  /* Reporter */
  reporter: process.env.CI ? 'dot' : [['html', {outputFolder: cwd('.testing/playwright-report')}]],

  /* Shared settings for all projects */
  use: {
    /* Base URL — override via PLAYWRIGHT_BASE_URL env var */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',

    /* Collect trace on first retry */
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
    {
      name: 'firefox',
      use: {...devices['Desktop Firefox']},
    },
    {
      name: 'safari',
      use: {...devices['Desktop Safari']},
    },
  ],
});
