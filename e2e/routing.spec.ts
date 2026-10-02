import { test, expect, type Page } from '@playwright/test';

const API = 'http://localhost:3000';
// Seeded verified attendee with active paid tickets in the wallet.
const BUYER = '+251900123456';
const BUYER_PASSWORD = 'password123';

async function loginThroughUi(page: Page, identifier: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in' }).first().click();
  await page.getByPlaceholder('Phone number or email', { exact: true }).fill(identifier);
  await page.getByPlaceholder('Your password', { exact: true }).fill(BUYER_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).last().click();
  await expect(page.getByText('Welcome to Digis')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Welcome to Digis')).toBeHidden({ timeout: 20_000 });
}

/**
 * Routing e2e — auth is a modal ROUTE (/login, /signup) layered over the page
 * you came from, and discovery search lives in ?q=. Runs against the live
 * backend + dev server like the other specs.
 *
 * The auth modals animate (AnimatePresence mode="wait"), so assertions use
 * `.first()` where a heading can briefly coexist with an exiting one.
 */
test.describe('routing', () => {
  test('login is a modal route: Back closes it and restores the page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Log in' }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Log in' }).first()).toBeVisible();

    // Back closes the modal and returns to the page underneath.
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Log in' })).toHaveCount(0);
  });

  test('switching sign-in to sign-up updates the URL', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Log in' }).first()).toBeVisible();
    await page.getByRole('button', { name: "Don't have an account? Create one" }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole('heading', { name: 'Create an account' }).first()).toBeVisible();
  });

  test('direct deep link to /signup renders the signup form', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Create an account' }).first()).toBeVisible();
    await expect(page.getByPlaceholder('Name', { exact: true })).toBeVisible();
  });

  test('discovery search is written to ?q= and survives reload', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Search events, venues, artists...');
    await input.fill('jazz');
    await expect(page).toHaveURL(/\?q=jazz/);
    await page.reload();
    await expect(page.getByPlaceholder('Search events, venues, artists...')).toHaveValue('jazz');
  });

  test('ticket detail is deep-linkable at /tickets/:id and Back closes it', async ({ page }) => {
    await loginThroughUi(page, BUYER);

    // Fetch a real wallet ticket id for this buyer.
    const session = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('digis_session') ?? 'null'),
    );
    expect(session?.access_token).toBeTruthy();
    const res = await page.request.get(`${API}/tickets`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const id = (await res.json())?.data?.[0]?.id as string | undefined;
    expect(id, 'buyer should have at least one wallet ticket').toBeTruthy();

    // Deep link straight to the ticket — the detail opens for that id.
    await page.goto(`/tickets/${id}`);
    await expect(page).toHaveURL(new RegExp(`/tickets/${id}$`));
    await expect(page.getByRole('button', { name: 'Close ticket' })).toBeVisible({ timeout: 10_000 });

    // Closing returns to the list route.
    await page.getByRole('button', { name: 'Close ticket' }).click();
    await expect(page).toHaveURL(/\/tickets$/);
    await expect(page.getByRole('button', { name: 'Close ticket' })).toHaveCount(0);
  });

  test('resale event + listing routes resolve (no redirect away)', async ({ page }) => {
    // The per-event page is a real route (stays on the URL).
    await page.goto('/resale/events/does-not-exist');
    await expect(page).toHaveURL(/\/resale\/events\/does-not-exist$/);

    // A listing link resolves; an unavailable listing shows the notice.
    await page.goto('/resale/listings/does-not-exist');
    await expect(page).toHaveURL(/\/resale\/listings\/does-not-exist$/);
    await expect(page.getByText('This listing is no longer available.')).toBeVisible({ timeout: 10_000 });
  });
});
