import { test, expect } from '@playwright/test';

/**
 * Event detail wiring — the router now fetches /public/events/:slug for
 * deep links (no location.state), and eventPath prefers the backend slug.
 */

test.describe('event detail', () => {
  test('deep link loads the event by slug from the backend', async ({ page }) => {
    await page.goto('/events/on-on');
    await expect(page.getByRole('heading', { name: 'On & On' })).toBeVisible({ timeout: 15_000 });
    // Venue comes from the backend detail payload (event_dates[0].venue).
    await expect(page.getByText('The Venue Warehouse').first()).toBeVisible();
  });

  test('clicking a discovery card opens detail via the backend slug', async ({ page }) => {
    await page.goto('/');
    // The first grid card (the featured carousel's embla drag layer swallows
    // synthetic clicks). The same title exists in both carousel and grid —
    // .last() is the grid instance, which sits near the top of the feed.
    // Card titles are h3; on the detail page the title becomes the page
    // heading with the feed unmounted, so it is unique there.
    const gridCard = page
      .getByRole('heading', { level: 3, name: 'Avenida Desperados Pregame Edition' })
      .last();
    await expect(gridCard).toBeVisible({ timeout: 15_000 });
    await gridCard.click();
    await page.waitForURL(/\/events\//, { timeout: 15_000 });
    // AnimatePresence mode="wait" keeps the exiting feed mounted briefly and
    // its two same-titled h3s would trip the strict-mode check (not retried
    // by expect) — wait for the discovery hero to unmount first.
    await expect(page.getByRole('heading', { name: 'Worth showing up for.' })).toBeHidden({
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: 'Avenida Desperados Pregame Edition' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('detail page fetches live products for ticket tiers', async ({ page }) => {
    // The ticket tiers/extras on the detail page come from
    // GET /public/events/:slug/products (price_options + available) — not
    // from the mock. Assert the request fires; tier names render from either
    // source (the seed mirrors the mock), so the request itself is the proof.
    const productsResponse = page.waitForResponse(
      (res) => res.url().includes('/public/events/on-on/products') && res.status() === 200,
      { timeout: 15_000 },
    );
    await page.goto('/events/on-on');
    await expect(page.getByRole('heading', { name: 'On & On' })).toBeVisible({ timeout: 15_000 });
    const productsRes = await productsResponse;
    // Live tiers render from the backend — assert a product name the API
    // actually returned (don't hardcode seed names, which drift).
    const body = await productsRes.json();
    const products = (body?.data ?? []) as { name: string }[];
    expect(products.length).toBeGreaterThan(0);
    await expect(page.getByText(products[0].name).first()).toBeVisible({ timeout: 15_000 });
  });

  test('unknown slug redirects back to discovery', async ({ page }) => {
    await page.goto('/events/does-not-exist');
    await page.waitForURL('http://localhost:5173/', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Worth showing up for.' })).toBeVisible();
  });
});
