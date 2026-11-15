import { test, expect } from '@playwright/test';

/**
 * State-gating checks against the live dev seed.
 *
 * The 2026-09-30 composable-admission release removed the event-level
 * `event_type` / `sold_out` / `tickets_left` keys, so the old "RSVP section"
 * and "Sold Out label" checks no longer apply: admission is offer-driven and
 * the card renders from the products endpoint, not event_setting.config.
 */

test('ended gating: a past-dated event shows the ended state, not a buy CTA', async ({ page }) => {
  await page.goto('/events/unity-in-beats');
  await expect(page.getByText('Event ended', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  // No purchase entry: the Buy/Tickets button must not be present.
  await expect(page.getByRole('button', { name: /Buy|Tickets/, exact: false })).toHaveCount(0);
});

test('offer-driven: a free-ticket event renders its admission offer', async ({ page }) => {
  await page.goto('/events/friends');
  // `friends` seeds a $0 "Free Entry" ticket offer — it must render (a free
  // offer used to be dropped by the products mapper).
  await expect(page.getByText('Free Entry').first()).toBeVisible({ timeout: 15_000 });
});

test('discovery renders the event grid from the live list payload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Worth showing up for.' })).toBeVisible({ timeout: 15_000 });
  // The discovery controls render from the live list payload.
  await expect(page.getByPlaceholder(/Search events/).first()).toBeVisible({ timeout: 15_000 });
});
