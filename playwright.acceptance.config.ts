import { defineConfig, devices } from '@playwright/test';
import regression from './playwright.config';

/** Real stack gate. Missing infrastructure is a failed check, never a skip. */
export default defineConfig({
  ...regression,
  testDir: './e2e/live',
  testMatch: '**/*.spec.ts',
  testIgnore: [],
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 360_000,
  projects: [{ name: 'live-acceptance', use: { ...devices['Desktop Chrome'] } }],
  use: {
    baseURL: process.env.ACCEPTANCE_BASE_URL ?? 'http://localhost:5173',
    // A trace contains authentication and private credential responses.
    trace: 'off', screenshot: 'off', video: 'off',
  },
});
