import { test, expect, type Page } from '@playwright/test';

/**
 * Server-side discovery filters (BACKEND_GAPS #49) — the category rail, price
 * chips and sort drive `GET /public/events` rather than filtering a fully-paged
 * client set. Runs against the live backend + dev server like the other specs.
 *
 * Assertions read the outgoing request params and the response `total_count`, so
 * they are seed-independent (no hardcoded slugs or event counts).
 */

interface DiscoveryTrace {
  readonly listUrls: string[];
  readonly lastTotal: number | undefined;
}

/** Record the `GET /public/events` list calls and the newest `total_count`. */
function trackDiscovery(page: Page): DiscoveryTrace {
  const listUrls: string[] = [];
  let lastTotal: number | undefined;
  page.on('request', (r) => {
    const u = r.url();
    if (u.includes(':3000/public/events')) listUrls.push(u);
  });
  page.on('response', async (r) => {
    if (!r.url().includes(':3000/public/events')) return;
    try {
      const body = await r.json();
      if (typeof body?.pagination?.total_count === 'number') {
        lastTotal = body.pagination.total_count;
      }
    } catch {
      /* aborted / non-JSON — ignore */
    }
  });
  return {
    listUrls,
    get lastTotal() {
      return lastTotal;
    },
  };
}

async function openDiscovery(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Worth showing up for.' })).toBeVisible({ timeout: 15_000 });
  // The full catalogue settles before we filter it.
  await expect(page.getByText(/\d+ events/)).toBeVisible({ timeout: 15_000 });
}

test('selecting a category narrows the grid through the server', async ({ page }) => {
  const trace = trackDiscovery(page);
  await openDiscovery(page);
  await expect.poll(() => trace.lastTotal ?? 0).toBeGreaterThan(0);
  const before = trace.lastTotal!;

  const sportsPill = page.getByRole('button', { name: 'Sports', exact: true });
  await expect(sportsPill).toBeVisible({ timeout: 15_000 });
  trace.listUrls.length = 0;
  await sportsPill.click();

  // The server owns the filter: a `category=<slug>` request goes out…
  await expect.poll(() => trace.listUrls.some((u) => /[?&]category=/.test(u))).toBe(true);
  // …and the server's result set narrows (fewer than the unfiltered catalogue).
  await expect.poll(() => trace.lastTotal ?? before).toBeLessThan(before);
});

test('the free price filter narrows through the server', async ({ page }) => {
  const trace = trackDiscovery(page);
  await openDiscovery(page);

  await page.getByRole('button', { name: 'Filters' }).click();
  trace.listUrls.length = 0;
  // Two "Free" chips (event access + price) both map to the same zero window.
  await page.getByRole('button', { name: 'Free', exact: true }).first().click();

  await expect
    .poll(() => trace.listUrls.some((u) => u.includes('max_price_minor=0') && u.includes('currency=ETB')))
    .toBe(true);
});

test('a price sort is sent to the server with the required currency', async ({ page }) => {
  const trace = trackDiscovery(page);
  await openDiscovery(page);

  await page.getByRole('button', { name: 'Filters' }).click();
  trace.listUrls.length = 0;
  await page.getByRole('button', { name: 'Price: Low' }).click();

  // The backend rejects a price sort without a currency — the query carries both.
  await expect
    .poll(() => trace.listUrls.some((u) => u.includes('sort=price_asc') && u.includes('currency=ETB')))
    .toBe(true);
});
