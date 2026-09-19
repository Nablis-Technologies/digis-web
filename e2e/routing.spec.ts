import { test, expect } from '@playwright/test';

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
    await expect(page.getByPlaceholder('Full name', { exact: true })).toBeVisible();
  });

  test('discovery search is written to ?q= and survives reload', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Search events, venues, artists...');
    await input.fill('jazz');
    await expect(page).toHaveURL(/\?q=jazz/);
    await page.reload();
    await expect(page.getByPlaceholder('Search events, venues, artists...')).toHaveValue('jazz');
  });
});
