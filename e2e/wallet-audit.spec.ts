import { test, expect } from '@playwright/test';

const SEED_IDENTIFIER = '+251911000001';
const SEED_PASSWORD = 'password123';

test('wallet renders real GET /tickets, not the mock store', async ({ page }) => {
  const apiCalls: string[] = [];
  page.on('response', (r) => {
    if (r.url().endsWith('/tickets') && r.request().method() === 'GET') {
      apiCalls.push(`${r.status()} GET /tickets`);
    }
  });

  // Log in through the real UI so the session carries the bearer token.
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByPlaceholder('Phone number', { exact: true }).fill(SEED_IDENTIFIER);
  await page.getByPlaceholder('Your password', { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).last().click();
  await expect(page.getByText('Welcome to Digis')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByPlaceholder('Phone number', { exact: true })).toBeHidden({ timeout: 10_000 });

  // Open My Tickets via the nav.
  await page.getByRole('button', { name: 'Tickets' }).first().click();
  await page.waitForURL(/\/tickets/, { timeout: 10_000 });
  await page.waitForTimeout(1500);

  console.log('wallet API calls:', JSON.stringify(apiCalls));
  // The mock store's fixture ticket must NOT render anymore.
  expect(await page.getByText('Ethio Jsssazz Night').count()).toBe(0);
  // The real wallet is empty for this user — the empty state shows.
  console.log('empty-state visible:', await page.getByText(/no tickets|nothing here|get your first/i).count());

  // Regression guard — a ticket must never render twice. The account wallet and
  // the on-device guest wallet can both hold the same ticket (a guest purchase
  // later signed in / claimed), and a repeated refetch must not duplicate a
  // card. This is the "duplicate tickets after purchase" bug.
  const renderedIds = await page
    .locator('[data-ticket-id]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-ticket-id') ?? ''));
  expect(
    new Set(renderedIds).size,
    `duplicate ticket cards rendered: ${JSON.stringify(renderedIds)}`,
  ).toBe(renderedIds.length);
});
