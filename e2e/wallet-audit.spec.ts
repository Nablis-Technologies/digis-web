import { test, expect } from '@playwright/test';

const SEED_IDENTIFIER = '+251911000001';
const SEED_PASSWORD = 'password123';

test('wallet renders real GET /tickets, not the mock store', async ({ page }) => {
  const walletResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/tickets') && response.request().method() === 'GET');

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
  const response = await walletResponse;
  expect(response.ok(), 'Wallet API must succeed; a failed fetch cannot pass an empty-wallet test').toBe(true);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
  const expectedIds: string[] = body.data.filter((ticket: { product: { type: string } }) => ticket.product.type === 'ticket').map((ticket: { id: string }) => ticket.id);
  const renderedIds: string[] = [];
  for (const tab of ['Upcoming', 'Past']) {
    await page.getByRole('button', { name: new RegExp(`^${tab}`, 'i') }).click();
    if (expectedIds.length === 0) await expect(page.getByText(tab === 'Upcoming' ? 'No plans yet?' : 'No memories yet', { exact: true })).toBeVisible();
    renderedIds.push(...await page.locator('[data-ticket-id]').evaluateAll(els => els.map(el => el.getAttribute('data-ticket-id')!)));
  }
  expect([...renderedIds].sort()).toEqual([...expectedIds].sort());
  expect(new Set(renderedIds).size, 'A server ticket must render once across wallet tabs').toBe(renderedIds.length);
});
