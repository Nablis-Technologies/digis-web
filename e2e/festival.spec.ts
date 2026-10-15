import { test, expect, type Route } from '@playwright/test';

/**
 * Multi-day festival + ended-event detail wiring.
 *
 * The dev seed has no genuinely multi-day event (the festival fixture carries a
 * single date), so the detail + products endpoints are mocked at the network
 * boundary with the exact wire shapes the public serializers produce. Every
 * other request (event list, auth, notifications) still hits the live dev
 * backend, exactly like `guest-free-otp.spec.ts`.
 *
 * Pins the ported wiring:
 *   - `FestivalDayBar` day track renders for a multi-day event
 *   - `SessionGuests` ("Special guests") renders the festival roster
 *   - picking a day re-scopes the festival ticket selector title
 *   - an ended event renders `EventEndedNotice` with a working "Browse" CTA
 */

const MULTI_SLUG = 'zz-multi-day';
const ENDED_SLUG = 'zz-ended-event';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function fulfillJson(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    headers: CORS,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** A 1x1 transparent PNG so the hero has an image without a network fetch. */
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function multiDayDetail() {
  const dates = [1, 2, 3].map((n) => ({
    id: `d${n}`,
    starts_at: `2030-08-0${n}T19:00:00Z`,
    ends_at: `2030-08-0${n}T23:00:00Z`,
    status: 'scheduled',
    venue: { id: 'v1', name: 'Millennium Hall', city: 'Addis Ababa' },
  }));
  return {
    success: true,
    data: {
      id: 'evt-multi',
      slug: MULTI_SLUG,
      title: 'Multi Day Fest',
      description: 'Three nights of music.',
      currency: 'ETB',
      price_from_minor: 60000,
      categories: [{ id: 'c1', name: 'Festivals' }],
      event_dates: dates,
      event_media: [
        { id: 'm1', type: 'cover', file: { medium: PIXEL, thumbnail: PIXEL } },
      ],
      event_participants: [
        { id: 'p1', name: 'Teddy Afro', role: 'Headliner' },
        { id: 'p2', name: 'Aster Aweke', role: 'Headliner' },
        { id: 'p3', name: 'Jano Band', role: 'Support' },
      ],
      organization: { id: 'o1', name: 'Addis Music Fest', slug: 'addis-music-fest' },
      event_lifecycle: 'upcoming',
      ticket_availability: 'available',
    },
  };
}

function endedDetail() {
  return {
    success: true,
    data: {
      id: 'evt-ended',
      slug: ENDED_SLUG,
      title: 'Wrapped Show',
      description: 'It happened.',
      currency: 'ETB',
      categories: [{ id: 'c2', name: 'Music' }],
      event_dates: [
        {
          id: 'e1',
          starts_at: '2020-08-01T19:00:00Z',
          ends_at: '2020-08-01T23:00:00Z',
          status: 'completed',
          venue: { id: 'v1', name: 'Millennium Hall', city: 'Addis Ababa' },
        },
      ],
      event_media: [
        { id: 'm1', type: 'cover', file: { medium: PIXEL, thumbnail: PIXEL } },
      ],
      organization: { id: 'o1', name: 'Addis Music Fest', slug: 'addis-music-fest' },
      event_lifecycle: 'ended',
      ticket_availability: 'sales_closed',
    },
  };
}

const PRODUCTS = {
  success: true,
  data: [
    {
      id: 'prod-pass',
      event_id: 'evt-multi',
      name: 'Full Festival Pass',
      type: 'ticket',
      available: true,
      min_per_order: 1,
      max_per_order: 6,
      price_options: [
        { currency: 'ETB', amount_minor: 150000, active_from: '2000-01-01T00:00:00Z', active_to: null },
      ],
      ticket_type: {
        id: 'tt-pass',
        audience: 'public',
        approval_mode: 'automatic',
        date_selection: 'fixed',
        waitlist_enabled: false,
        admissions_per_unit: 3,
      },
    },
    {
      id: 'prod-ga',
      event_id: 'evt-multi',
      name: 'General Admission',
      type: 'ticket',
      available: true,
      min_per_order: 1,
      max_per_order: 6,
      price_options: [
        { currency: 'ETB', amount_minor: 60000, active_from: '2000-01-01T00:00:00Z', active_to: null },
      ],
      ticket_type: {
        id: 'tt-ga',
        audience: 'public',
        approval_mode: 'automatic',
        date_selection: 'fixed',
        waitlist_enabled: false,
        admissions_per_unit: 1,
      },
    },
  ],
};

test.describe('festival / multi-day detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('http://localhost:3000/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === 'OPTIONS') return fulfillJson(route, 204, {});

      if (path === `/public/events/${MULTI_SLUG}`) return fulfillJson(route, 200, multiDayDetail());
      if (path === `/public/events/${MULTI_SLUG}/products`) return fulfillJson(route, 200, PRODUCTS);
      if (path === `/public/events/${ENDED_SLUG}`) return fulfillJson(route, 200, endedDetail());
      if (path === `/public/events/${ENDED_SLUG}/products`) return fulfillJson(route, 200, { success: true, data: [] });

      return route.fallback();
    });
  });

  test('renders the day track + guests and re-scopes tickets when a day is picked', async ({ page }) => {
    await page.goto(`/events/${MULTI_SLUG}`);
    await expect(page.getByRole('heading', { name: 'Multi Day Fest' })).toBeVisible({ timeout: 15_000 });

    // Day track: one tab per date plus the pass tab.
    const dayBar = page.getByRole('tablist', { name: 'Choose your days' });
    await expect(dayBar).toBeVisible();
    await expect(page.getByRole('tab', { name: /Day 3/ })).toBeVisible();

    // Pass copy proves the festival schedule resolved (3 days).
    await expect(page.getByText('All 3 days')).toBeVisible();

    // Special guests for the whole festival while "All days" is selected.
    await expect(page.getByText('Special guests')).toBeVisible();
    await expect(page.getByText('Teddy Afro').first()).toBeVisible();

    // Picking Day 2 re-scopes the selector title to that day…
    await page.getByRole('tab', { name: /Day 2/ }).click();
    await expect(page.getByRole('tab', { name: /Day 2/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText(/Day 2 ·/)).toBeVisible();

    // …and swaps the guest roster to that day's line-up.
    const guestsRail = page.getByText('Special guests').locator('..');
    await expect(guestsRail.getByText('Aster Aweke')).toBeVisible();
    await expect(guestsRail.getByText('Teddy Afro')).toHaveCount(0);
  });

  test('renders the ended notice with a working Browse CTA', async ({ page }) => {
    await page.goto(`/events/${ENDED_SLUG}`);
    await expect(page.getByRole('heading', { name: 'Wrapped Show' })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole('heading', { name: 'This event has ended' })).toBeVisible();
    await expect(page.getByText('Aug 1, 2020')).toBeVisible();

    await page.getByRole('button', { name: /Browse upcoming events/ }).click();
    await expect(page.getByRole('heading', { name: 'Worth showing up for.' })).toBeVisible({ timeout: 15_000 });
  });
});
