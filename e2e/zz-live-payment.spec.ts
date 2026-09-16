import { test, expect, type Page } from '@playwright/test';

const BUYER = '+251900123456';
const PASS = 'password123';
// Seed-drift note (2026-09-07): the second avenida event is gone — one remains,
// titled with a colon — and its only ticket tier is now 'Final Wave'. Verified
// against GET /public/events before running; update these if the seed changes.
const EVENT_SLUG = 'avenida-desperados-pregame-edition';
const TIER = 'Final Wave';

async function login(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByPlaceholder('Phone number or email', { exact: true }).fill(BUYER);
  await page.getByPlaceholder('Your password', { exact: true }).fill(PASS);
  await page.getByRole('button', { name: 'Log in' }).last().click();
  await expect(page.getByPlaceholder('Phone number or email', { exact: true })).toBeHidden({ timeout: 15_000 });
}

test('LIVE: full real payment → ticket lands in wallet (no mocks)', async ({ page }) => {
  test.setTimeout(300_000);
  await login(page);

  await page.goto(`/events/${EVENT_SLUG}`);
  await page.getByText(TIER).first().waitFor({ timeout: 20_000 });
  await page.getByText(TIER).first().click().catch(() => {});
  await page.getByRole('button', { name: /Buy Now|Get Tickets/ }).first().click();
  await page.waitForTimeout(1500);

  // Chapa V2 ignores return_url, so the hosted checkout opens in a NEW tab
  // ("popup") and this tab stays on the app for the confirmation poll.
  const popupPromise = page.waitForEvent('popup', { timeout: 120_000 }).catch(() => null);

  let step = 0;
  while (step < 10) {
    const cb = page.locator('input[type=checkbox]');
    if ((await cb.count()) > 0) {
      await cb.first().check({ force: true }).catch(() => {});
      await page.waitForTimeout(800);
      continue;
    }
    const continueBtn = page.getByRole('button', { name: 'Continue' }).last();
    const payBtn = page.getByRole('button').filter({ hasText: /^Pay / }).last();
    if (await payBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await payBtn.click();
      break;
    }
    if (await continueBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await continueBtn.click();
      step++;
      await page.waitForTimeout(1200);
      continue;
    }
    await page.waitForTimeout(1500);
    step++;
  }

  const chapa = (await popupPromise) ?? page;
  await chapa.waitForURL(/chapa\.(co|global)/, { timeout: 30_000 });
  console.log('at Chapa hosted checkout:', chapa.url());

  await chapa.waitForTimeout(2500);
  const testBank = chapa.getByText(/Test Bank Payment/i).first();
  if ((await testBank.count()) > 0) await testBank.click();
  const phoneField = chapa.getByPlaceholder(/Testing phone number/i).first();
  if (await phoneField.count() > 0) {
    await phoneField.fill('251900000000');
  } else {
    await chapa.locator('#test-number').fill('0900123456');
  }
  await chapa.getByRole('button', { name: 'Pay using Test Mode' }).click();
  await chapa.waitForTimeout(3000);
  console.log('paid on Chapa (no return_url) — app tab confirms:', chapa.url());

  const t0 = Date.now();

  await expect(page.getByText('Confirming your payment').first()).toBeVisible({ timeout: 15_000 });
  console.log(`t=${((Date.now() - t0) / 1000).toFixed(1)}s confirming sheet visible — ticket not yet in wallet`);

  // Wait for the ACTUAL ticket: the sheet transitions to "You're going!" and
  // navigates to /tickets?ticket=<id> where the QR ("Scan at entry") opens.
  await expect(page.getByText("You're going!").first()).toBeVisible({ timeout: 240_000 });
  console.log(`t=${((Date.now() - t0) / 1000).toFixed(1)}s sheet confirmed — ticket landed in wallet`);
  await page.getByRole('button', { name: 'View My Ticket' }).click();
  await page.waitForURL(/\/tickets/, { timeout: 15_000 });
  await expect(page.getByText('Scan at entry').first()).toBeVisible({ timeout: 15_000 });
  console.log(`t=${((Date.now() - t0) / 1000).toFixed(1)}s QR visible — full real flow complete`);
});