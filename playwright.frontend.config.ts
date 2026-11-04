import { defineConfig } from '@playwright/test';
import regression from './playwright.config';

/** Deterministic browser/API tests. These do not prove real provider fulfillment. */
export default defineConfig({
  ...regression,
  testMatch: [
    'registration-schema', 'display-handoff', 'save-account', 'batch-gift', 'critical-journeys', 'payment-return', 'gift-claim', 'profile-handoff',
    'wallet-answers', 'venue-profile', 'follow-state', 'festival', 'recurring', 'transfer-accept', 'waitlist',
  ].map(name => `**/${name}.spec.ts`),
});
