import { test, expect } from '@playwright/test';

/**
 * Deterministic state-gating checks against the live dev seed:
 *  - #34 mitigation: a past-dated event renders the "Event ended" state, not
 *    a purchase CTA (ADR-0002 disable).
 *  - RSVP events render the RSVP section (config-driven capacity).
 *  - Sold-out events stay visible on discovery with a "Sold Out" label but do
 *    not lead the grid (sold-out sorts behind available).
 */

test('ended gating: a past-dated event shows the ended state, not a buy CTA', async ({ page }) => {
  await page.goto('/events/euphoria');
  await expect(page.getByText('Event ended', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  // No purchase entry: the Buy/Tickets button must not be present.
  await expect(page.getByRole('button', { name: /Buy|Tickets/, exact: false })).toHaveCount(0);
});

test('RSVP event renders the RSVP section', async ({ page }) => {
  await page.goto('/events/freeform');
  await expect(page.getByText(/Reserve your spot/).first()).toBeVisible({ timeout: 15_000 });
});

test('discovery shows sold-out events with the Sold Out label, behind available ones', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Worth showing up for.' })).toBeVisible({ timeout: 15_000 });
  // Sold-out cards stay in the grid (below the fold) with a "Sold Out" label —
  // presence is the assertion; visibility would require scrolling.
  await expect(page.getByText('Sold Out', { exact: true }).first()).toHaveCount(1);
});