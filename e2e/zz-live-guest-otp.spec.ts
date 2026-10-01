import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * LIVE drill — guest $0 admission through the inline phone-OTP step, against the
 * real backend (no route mocking). Excluded from the default suite; run with:
 *
 *   $env:RUN_ZZ=1; npx playwright test e2e/zz-live-guest-otp.spec.ts
 *
 * Requires: the dev backend up, `friends` seeded with its $0 "Free Entry" offer,
 * and the dev OTP sender writing `[DEV OTP] challenge=… phone=… code=…` lines to
 * `digis_backend/log/development.log` (the file is bind-mounted on the host).
 *
 * The OTP code is read from that log — the same signal `script/tail_otp.ps1`
 * surfaces — so the drill exercises the true request_otp → verify → resubmit
 * chain and a real free ticket is issued.
 */

// A phone with no seeded account, so the selection resolves to a guest identity.
const GUEST_PHONE = '+251911222333';
const EVENT_SLUG = 'friends';
const TIER = 'Free Entry';

const LOG_PATH = path.resolve(process.cwd(), '..', 'digis_backend', 'log', 'development.log');

/** All `[DEV OTP]` codes logged for a phone so far (used to detect the new one). */
function otpCodesFor(phone: string, content: string): string[] {
  const re = /\[DEV OTP\][^\n]*phone=(\+?\d+)[^\n]*code=(\d+)/g;
  return [...content.matchAll(re)]
    .filter((m) => m[1] === phone || m[1] === phone.replace('+', ''))
    .map((m) => m[2]);
}

function readLog(): string {
  try { return fs.readFileSync(LOG_PATH, 'utf8'); } catch { return ''; }
}

/**
 * Wait for a NEW `[DEV OTP] … phone=<phone> … code=<code>` line to appear.
 * `seenCount` is how many codes the phone already had before Pay, so a stale
 * line from an earlier run can't be mistaken for this one. (Count matches, not
 * byte offsets — the log is full of multi-byte ANSI sequences, so a byte offset
 * can't index a JS string.)
 */
async function waitForNewOtp(phone: string, seenCount: number, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const codes = otpCodesFor(phone, readLog());
    if (codes.length > seenCount) return codes[codes.length - 1];
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No new [DEV OTP] line for ${phone} in ${LOG_PATH} after ${timeoutMs}ms`);
}

async function fillGuestDetailsIfPresent(page: Page) {
  const nameField = page.getByPlaceholder('Abebe Bekele');
  if (!(await nameField.isVisible().catch(() => false))) return;
  await nameField.fill('Free Drill Guest');
  const emailField = page.getByPlaceholder('you@example.com');
  if (await emailField.isVisible().catch(() => false)) await emailField.fill('free-drill@example.com');
  const phoneField = page.getByPlaceholder('+251 9 XX XXX XXX');
  if (await phoneField.isVisible().catch(() => false)) await phoneField.fill(GUEST_PHONE);
}

test('LIVE: guest $0 admission completes through OTP (real backend)', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto(`/events/${EVENT_SLUG}`);
  await expect(page.getByText(TIER).first()).toBeVisible({ timeout: 20_000 });
  await page.getByText(TIER).first().click();
  await page.getByRole('button', { name: /Buy Now|Get Tickets/ }).first().click();
  await expect(page.getByText('Review', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  // Walk the guest steps: consent (if any) → extras (if any) → details → payment.
  for (let i = 0; i < 6; i++) {
    const payBtn = page.getByRole('button', { name: /^Pay .*/ });
    if (await payBtn.count() > 0) break;
    const consent = page.locator('[role="checkbox"]').first();
    if (await consent.isVisible().catch(() => false)) await consent.click().catch(() => {});
    await fillGuestDetailsIfPresent(page);
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.waitForTimeout(400);
  }

  // Remember how many codes this phone already had, so a stale line can't match.
  const seenCodes = otpCodesFor(GUEST_PHONE, readLog()).length;

  await page.getByRole('button', { name: /^Pay .*/ }).click();

  // Backend 422 phone_verification_required → the inline OTP step.
  await expect(page.getByText('Confirm your phone number')).toBeVisible({ timeout: 20_000 });

  const code = await waitForNewOtp(GUEST_PHONE, seenCodes);
  console.log(`[drill] dev OTP for ${GUEST_PHONE}: ${code}`);

  await page.getByPlaceholder('6-digit code').fill(code);
  await page.getByRole('button', { name: /Verify & continue/i }).click();

  // Real free order: backend confirms + fulfills synchronously.
  await expect(page.getByText("You're going!")).toBeVisible({ timeout: 30_000 });
  console.log('[drill] guest $0 admission confirmed via live OTP');
});
