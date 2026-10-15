import { test, expect } from '@playwright/test';

/**
 * Live multi-day festival (seed fixture).
 *
 * `e2e/festival.spec.ts` route-mocks a festival because the dev seed had none —
 * every "multi-day" entry in the mock-mirror is really a separate single-day
 * event. The seed now carries a genuinely multi-day one
 * (`digis_backend` `db/seeds/dev_demo.rb`, slug `addis-sound-festival-2026`), so
 * this spec exercises the festival surface end to end against the real payload:
 * the day bar, the all-days pass next to the per-night tiers, and the per-day
 * ticket scoping.
 *
 * The per-day roster stays absent while the public payload omits
 * `event_participants` (BACKEND_GAPS #36) — pinned here as a contract guard so
 * the section lights up the moment the backend serves it.
 */

const FESTIVAL_SLUG = 'addis-sound-festival-2026';

type DetailPayload = {
  data?: {
    title?: string;
    event_dates?: { id: string; name?: string }[];
    event_participants?: unknown[];
  };
};

async function fetchDetail(page: import('@playwright/test').Page) {
  const res = await page.request.get(`http://localhost:3000/public/events/${FESTIVAL_SLUG}`);
  expect(res.status()).toBe(200);
  return (await res.json()) as DetailPayload;
}

test.describe('live multi-day festival fixture', () => {
  test('day bar scopes the ticket selector to the picked night', async ({ page }) => {
    const detail = await fetchDetail(page);
    const dates = detail.data?.event_dates ?? [];
    // The fixture must stay multi-day — with one date the festival resolver
    // never fires and this spec would silently stop testing anything.
    expect(dates.length).toBeGreaterThan(1);

    await page.goto(`/events/${FESTIVAL_SLUG}`);
    await expect(page.getByRole('heading', { name: detail.data!.title! })).toBeVisible({
      timeout: 15_000,
    });

    // The all-days pass tab plus one tab per date.
    const dayBar = page.getByRole('tablist', { name: 'Choose your days' }).first();
    await expect(dayBar.getByRole('tab')).toHaveCount(dates.length + 1);

    // Untouched, the selector covers the whole festival.
    await expect(page.getByText(`All ${dates.length} days`).first()).toBeVisible();

    // Picking a single night re-scopes the selector to that date.
    await dayBar.getByRole('tab').nth(1).click();
    await expect(page.getByText(/Day 1 ·/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('per-day roster stays absent while participants are not public (#36)', async ({ page }) => {
    const detail = await fetchDetail(page);
    const served = (detail.data?.event_participants?.length ?? 0) > 0;

    await page.goto(`/events/${FESTIVAL_SLUG}`);
    await expect(page.getByRole('heading', { name: detail.data!.title! })).toBeVisible({
      timeout: 15_000,
    });

    const guests = page.getByRole('heading', { name: /Special guests/i });
    if (served) {
      await expect(guests.first()).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(guests).toHaveCount(0);
    }
  });
});
