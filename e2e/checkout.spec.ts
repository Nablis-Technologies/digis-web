import { test, expect, type Page } from '@playwright/test';

/**
 * Checkout e2e — the real purchase chain through the UI against the live
 * backend: login → event detail → tier → checkout → consent (when the
 * event publishes terms) → pay → registration → quote → order →
 * payment attempt.
 *
 * Consent documents are optional per event, so the suite never assumes the
 * box exists: acceptConsentIfPresent ticks it when one renders and moves
 * on when the event has no terms.
 *
 * Hosted initialization must succeed. Errors and conflicts fail this check.
 * Full payment and ticket issuance are required by test:acceptance.
 *
 * Stateful: it buys a real registration and the backend allows one active
 * registration per identity + ticket type. Re-run the seed before a repeat
 * run, or a leftover registration surfaces `active_registration_conflict`.
 */

const BUYER_IDENTIFIER = '+251900123456'; // seeded verified attendee (chapa.test@gmail.com)
const BUYER_PASSWORD = 'password123';

test.describe.configure({ mode: 'serial' });

async function loginThroughUi(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByPlaceholder('Phone number', { exact: true }).fill(BUYER_IDENTIFIER);
  await page.getByPlaceholder('Your password', { exact: true }).fill(BUYER_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).last().click();
  await expect(page.getByText('Welcome to Digis')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByPlaceholder('Phone number', { exact: true })).toBeHidden({
    timeout: 10_000,
  });
}

async function openCheckoutForTier(page: Page, tierName: string) {
  await page.goto('/events/on-on');
  await expect(page.getByRole('heading', { name: 'Select Your Ticket' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('heading', { name: tierName }).first().click();
  await page.getByRole('button', { name: /Buy Now/i }).click();
  await expect(page.getByText('Review', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
}

/**
 * Terms consent is its own box on the review step — but only when the event
 * publishes consent documents (they are optional). Wait briefly for a box;
 * when none renders, the event has no terms and checkout proceeds without.
 */
async function acceptConsentIfPresent(page: Page) {
  const consentToggle = page.locator('button[aria-label^="Accept "]').first();
  try {
    await consentToggle.waitFor({ state: 'visible', timeout: 3_000 });
    await consentToggle.click();
  } catch {
    /* no terms on this event — nothing to accept */
  }
}

test('live purchase initializes a hosted payment', async ({ page }) => {
  test.setTimeout(90_000);
  await loginThroughUi(page);
  await openCheckoutForTier(page, 'Regular');
  await acceptConsentIfPresent(page);
  await page.getByRole('button', { name: /Continue/i }).click();
  const payNow = page.getByRole('button', { name: /^Pay .*/ });
  if (await payNow.count() === 0) await page.getByRole('button', { name: /Continue/i }).click();
  await expect(payNow).toBeEnabled();
  // Subscribe before the click: a fast popup/response must not be missed.
  const initialized = page.waitForResponse(response => response.request().method() === 'POST' && /\/payment_attempts$/.test(new URL(response.url()).pathname));
  const hosted = page.waitForEvent('popup');
  await payNow.click();
  const response = await initialized;
  expect(response.ok(), 'Payment initialization must succeed; an error or conflict is not a purchase').toBe(true);
  const popup = await hosted;
  await popup.waitForURL(/^https:\/\/checkout\.chapa\.(co|global)\//);
  await popup.close();
});

test('guest checkout blocks invalid contact details before payment', async ({ page }) => {
  test.setTimeout(60_000);
  const paymentRequests: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().includes('/payment_attempts')) paymentRequests.push(request.url());
  });
  await openCheckoutForTier(page, 'Regular');

  // Terms consent is its own box on the review step, below the order summary.
  await acceptConsentIfPresent(page);

  // Guests walk the same step path as the (passing) logged-in test, plus the
  // Details form. Keep clicking Continue; the Pay button appears at the end.
  for (let i = 0; i < 5; i++) {
    const payNow = page.getByRole('button', { name: /^Pay .*/ });
    expect(await payNow.count(), 'Invalid guest details must not reach payment').toBe(0);
    // Details step: fill it once, it validates and blocks otherwise.
    // Fields are placeholder-addressed (AppInput): "Abebe" (name),
    // "you@example.com" (email), "+251 9 XX XXX XXX" (phone).
    const nameField = page.getByPlaceholder('Abebe');
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Test Guest');
      const emailField = page.getByPlaceholder('you@example.com');
      if (await emailField.isVisible().catch(() => false)) await emailField.fill('guest@example.com');
      const phoneField = page.getByPlaceholder('+251 9 XX XXX XXX');
      if (await phoneField.isVisible().catch(() => false)) await phoneField.fill('123');
      await page.getByRole('button', { name: /Continue/i }).click();
      await expect(page.getByText('Enter a valid Ethiopian phone', { exact: true })).toBeVisible();
      await expect(nameField).toBeVisible();
      expect(paymentRequests).toHaveLength(0);
      return;
    }
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.waitForTimeout(400);
  }

  throw new Error('Guest details form did not appear; validation was not exercised');
});
