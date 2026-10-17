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
    // Pick a non-featured event from the live API. Seed titles drift across
    // reseeds (e.g. a colon appeared in one title and broke the hardcoded
    // name), so never hardcode one — read it instead. Non-featured keeps the
    // card out of the featured carousel, whose embla drag layer swallows
    // synthetic clicks. The same title exists once in the grid —
    // .last() guards against any duplicate.
    const listRes = await page.request.get('http://localhost:3000/public/events');
    const listBody = (await listRes.json()) as {
      data?: {
        slug: string;
        title: string;
        event_setting?: { config?: { featured?: boolean } };
      }[];
    };
    const target = (listBody.data ?? []).find(
      (e) => e?.title && e?.slug && e.event_setting?.config?.featured !== true,
    );
    expect(target).toBeDefined();
    const gridCard = page
      .getByRole('heading', { level: 3, name: target!.title })
      .last();
    await expect(gridCard).toBeVisible({ timeout: 15_000 });
    await gridCard.click();
    // Card titles are h3; on the detail page the title becomes the page
    // heading with the feed unmounted, so it is unique there.
    await page.waitForURL(new RegExp(`/events/${target!.slug}`), { timeout: 15_000 });
    // AnimatePresence mode="wait" keeps the exiting feed mounted briefly and
    // its two same-titled h3s would trip the strict-mode check (not retried
    // by expect) — wait for the discovery hero to unmount first.
    await expect(page.getByRole('heading', { name: 'Worth showing up for.' })).toBeHidden({
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: target!.title })).toBeVisible({
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

  test('lineup renders iff the backend serves participants (contract guard)', async ({ page }) => {
    // The lineup was silently missing because the API never sent participants
    // (BACKEND_GAPS #36) and no test asserted the contract. This pins it: read
    // the live detail payload, then require the UI to match — section visible
    // when `event_participants` is served, hidden when it is not.
    const detailRes = await page.request.get('http://localhost:3000/public/events/on-on');
    expect(detailRes.status()).toBe(200);
    const body = (await detailRes.json()) as { data?: { event_participants?: unknown[] } };
    const served = Array.isArray(body.data?.event_participants) && body.data!.event_participants!.length > 0;

    await page.goto('/events/on-on');
    await expect(page.getByRole('heading', { name: 'On & On' })).toBeVisible({ timeout: 15_000 });

    const lineupHeading = page.getByRole('heading', { name: 'Lineup' });
    if (served) {
      await expect(lineupHeading.first()).toBeVisible({ timeout: 10_000 });
    } else {
      // Backend still omits it → the section must render nothing (no fabrication).
      await expect(page.getByRole('heading', { name: 'Lineup' })).toHaveCount(0);
    }
  });

  test('age card reflects the backend age_restriction (contract guard, #53)', async ({ page }) => {
    // The public list omits age_restriction (detail-only), and seed slugs drift,
    // so resolve at runtime: probe details until we have one bounded ("N+")
    // event and one explicit "no restriction" event.
    const listRes = await page.request.get('http://localhost:3000/public/events?per_page=100');
    const list = (await listRes.json()) as { data?: { slug: string }[] };
    let bounded: { slug: string; label: string } | undefined;
    let unrestricted: string | undefined;
    for (const e of (list.data ?? []).slice(0, 40)) {
      if (!e?.slug) continue;
      const res = await page.request.get(`http://localhost:3000/public/events/${e.slug}`);
      const ar = (await res.json())?.data?.event_setting?.config?.age_restriction as
        | { has_restriction?: boolean; min_age?: number; max_age?: number }
        | undefined;
      if (!bounded && ar?.has_restriction === true && typeof ar.min_age === 'number' && ar.max_age === undefined) {
        bounded = { slug: e.slug, label: `${ar.min_age}+` };
      }
      if (!unrestricted && ar?.has_restriction === false) unrestricted = e.slug;
      if (bounded && unrestricted) break;
    }
    expect(bounded ?? unrestricted, 'seed carries no age policy to pin').toBeDefined();

    if (bounded) {
      await page.goto(`/events/${bounded.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
      // The Age card flattens the structured restriction to "N+".
      await expect(page.getByText(bounded.label, { exact: true }).first()).toBeVisible({
        timeout: 15_000,
      });
    }
    if (unrestricted) {
      await page.goto(`/events/${unrestricted}`);
      await expect(page.getByText('Any Age', { exact: true }).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  });

  test('unknown slug redirects back to discovery', async ({ page }) => {
    await page.goto('/events/does-not-exist');
    await page.waitForURL('http://localhost:5173/', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Worth showing up for.' })).toBeVisible();
  });
});
