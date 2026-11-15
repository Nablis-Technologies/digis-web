import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // The backend is a single dev container (Puma, 5 threads) — more workers
  // than this and API round-trips queue up long enough to trip assertions.
  workers: 2,
  // TEMP one-off proof scripts (zz-*) are manual verification tools that need
  // a live-Chapa environment + specific seed buyers/events; they are NOT part
  // of the deterministic regression suite. Exclude them from default runs
  // (run explicitly with `npx playwright test e2e/zz-*.spec.ts` when Chapa is
  // enabled and the seed is loaded).
  testIgnore: process.env.RUN_ZZ === '1' ? [] : ['e2e/zz-*.spec.ts'],
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
