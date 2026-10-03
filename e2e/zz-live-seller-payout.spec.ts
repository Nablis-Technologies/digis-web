import { test, expect, type Page } from '@playwright/test';

/**
 * LIVE drill — seller cash-out against the real backend (no route mocking).
 * Excluded from the default suite; run with:
 *
 *   $env:RUN_ZZ=1; npx playwright test e2e/zz-live-seller-payout.spec.ts
 *
 * Needs the dev backend up with the payout demo seed (`db/seeds/dev_demo.rb`):
 * the payout seller owns a verified destination and a positive balance. The
 * drill asserts the UI posts a real payout, that it shows `pending`, and that
 * the available balance drops by the reserved amount. Dispatch (→ Chapa) is
 * async and is out of scope here — see BACKEND_GAPS #65.
 */

const API = 'http://localhost:3000';
const SELLER = { identifier: '+251911000007', password: 'password123' };

async function login(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByPlaceholder('Phone number or email', { exact: true }).fill(SELLER.identifier);
  await page.getByPlaceholder('Your password', { exact: true }).fill(SELLER.password);
  await page.getByRole('button', { name: 'Log in' }).last().click();
  await expect(page.getByPlaceholder('Phone number or email', { exact: true })).toBeHidden({ timeout: 15_000 });
}

test('LIVE: seller cashes out a real payout (pending) and the balance drops', async ({ page, request }) => {
  test.setTimeout(120_000);

  // Read the true available balance straight from the API first.
  const loginRes = await request.post(`${API}/auth/login`, { data: SELLER });
  expect(loginRes.ok()).toBeTruthy();
  const token = (await loginRes.json()).data.access_token as string;
  const balanceBefore = (
    await (await request.get(`${API}/marketplace/seller/balance`, { headers: { Authorization: `Bearer ${token}` } })).json()
  ).data as Array<{ currency: string; available_minor: number }>;
  const availableBefore = balanceBefore.find((b) => b.currency === 'ETB')?.available_minor ?? 0;
  expect(availableBefore, 'seed a positive balance (db/seeds/dev_demo.rb)').toBeGreaterThan(0);

  await login(page);
  await page.goto('/payouts');
  await expect(page.getByRole('heading', { name: 'Payouts' })).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Cash out' }).click();
  // The amount defaults to the full available balance.
  await expect(page.locator('input[inputmode="decimal"]')).toHaveValue(String(availableBefore / 100));
  await page.getByRole('button', { name: 'Confirm cash out' }).click();

  // The real backend creates a `pending` payout (never "paid out" — dispatch is
  // async through the outbox).
  await expect(page.getByText('Pending', { exact: true })).toBeVisible({ timeout: 15_000 });

  // The reservation moved the balance out of `available`.
  await expect(async () => {
    const after = (
      await (await request.get(`${API}/marketplace/seller/balance`, { headers: { Authorization: `Bearer ${token}` } })).json()
    ).data as Array<{ currency: string; available_minor: number }>;
    const availableAfter = after.find((b) => b.currency === 'ETB')?.available_minor ?? 0;
    expect(availableAfter).toBeLessThan(availableBefore);
  }).toPass({ timeout: 15_000 });

  console.log(`[drill] payout requested: available ${availableBefore} → reserved; real pending row rendered`);
});
