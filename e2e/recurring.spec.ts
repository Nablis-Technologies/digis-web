import { test, expect, type Route } from '@playwright/test';

/**
 * Recurring-series detail wiring (#68 seam).
 *
 * The public payload carries no series signal yet, so the detail + products
 * endpoints are mocked at the network boundary with the exact wire shape the
 * adapter reads (`recurrence` on the event, `event_date_id` on participants).
 * Everything else (event list, auth, notifications) still hits the live dev
 * backend, exactly like `festival.spec.ts`.
 *
 * Pins the ported recurring wiring:
 *   - the session rail ("Choose a date") + reminder toggle render for a series
 *   - a series is NOT also rendered as a multi-day festival (precedence)
 *   - picking a session re-scopes "Special guests" to that session's lineup
 *   - the monthly calendar sheet opens and confirms a session
 */

const SERIES_SLUG = 'zz-recurring-series';

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

function seriesDetail() {
  const dates = [10, 17, 24].map((day, i) => ({
    id: `s${i + 1}`,
    name: `Week ${i + 1}`,
    starts_at: `2030-01-${day}T12:00:00Z`,
    ends_at: `2030-01-${day}T15:00:00Z`,
    status: 'scheduled',
    venue: { id: 'v1', name: 'Fendika', city: 'Addis Ababa' },
  }));
  return {
    success: true,
    data: {
      id: 'evt-series',
      slug: SERIES_SLUG,
      title: 'Weekly Sessions',
      description: 'Every week.',
      currency: 'ETB',
      price_from_minor: 40000,
      categories: [{ id: 'c1', name: 'Music' }],
      // #68 signal — the adapter normalises this onto `Event.recurrence`.
      recurrence: { rule_id: 'rule-1', rrule: 'FREQ=WEEKLY;BYDAY=TH', active: true },
      event_dates: dates,
      event_media: [{ id: 'm1', type: 'cover', file: { medium: PIXEL, thumbnail: PIXEL } }],
      event_participants: [
        { id: 'p1', name: 'Always Here' },
        { id: 'p2', name: 'Opening Act', event_date_id: 's1' },
        { id: 'p3', name: 'Week Two Star', event_date_id: 's2' },
      ],
      organization: { id: 'o1', name: 'Fendika Nights', slug: 'fendika-nights' },
      event_lifecycle: 'upcoming',
      ticket_availability: 'available',
    },
  };
}

const PRODUCTS = {
  success: true,
  data: [
    {
      id: 'prod-ga',
      event_id: 'evt-series',
      name: 'General Admission',
      type: 'ticket',
      available: true,
      min_per_order: 1,
      max_per_order: 6,
      price_options: [
        { currency: 'ETB', amount_minor: 40000, active_from: '2000-01-01T00:00:00Z', active_to: null },
      ],
      ticket_type: {
        id: 'tt-ga',
        audience: 'public',
        approval_mode: 'automatic',
        date_selection: 'choose_one',
        waitlist_enabled: false,
        admissions_per_unit: 1,
      },
    },
  ],
};

test.describe('recurring series detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('http://localhost:3000/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === 'OPTIONS') return fulfillJson(route, 204, {});

      if (path === `/public/events/${SERIES_SLUG}`) return fulfillJson(route, 200, seriesDetail());
      if (path === `/public/events/${SERIES_SLUG}/products`) return fulfillJson(route, 200, PRODUCTS);

      return route.fallback();
    });
  });

  test('renders the session rail, not the festival track', async ({ page }) => {
    await page.goto(`/events/${SERIES_SLUG}`);
    await expect(page.getByRole('heading', { name: 'Weekly Sessions' })).toBeVisible({ timeout: 15_000 });

    // The recurring picker is present…
    await expect(page.getByRole('heading', { name: 'Choose a date' })).toBeVisible();
    const rail = page.getByRole('radiogroup', { name: 'Session date' });
    await expect(rail).toBeVisible();
    await expect(rail.getByRole('radio')).toHaveCount(3);

    // …and the multi-day festival track is NOT (a series owns its dates).
    await expect(page.getByRole('tablist', { name: 'Choose your days' })).toHaveCount(0);

    // Reminder toggle is wired to the derived cadence.
    await page.getByRole('button', { name: 'Remind me' }).click();
    await expect(page.getByRole('button', { name: /Reminding every/ })).toBeVisible();
  });

  test('picking a session re-scopes Special guests to that session', async ({ page }) => {
    await page.goto(`/events/${SERIES_SLUG}`);
    await expect(page.getByRole('heading', { name: 'Weekly Sessions' })).toBeVisible({ timeout: 15_000 });

    const rail = page.getByRole('radiogroup', { name: 'Session date' });
    const radios = rail.getByRole('radio');

    // First upcoming session is selected by default → its pinned guest shows.
    await expect(radios.first()).toHaveAttribute('aria-checked', 'true');
    const guests = page.getByText('Special guests').locator('..');
    await expect(guests.getByText('Opening Act')).toBeVisible();
    await expect(guests.getByText('Week Two Star')).toHaveCount(0);

    // Picking the next session swaps the roster (event-level guest stays).
    await radios.nth(1).click();
    await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true');
    await expect(guests.getByText('Week Two Star')).toBeVisible();
    await expect(guests.getByText('Opening Act')).toHaveCount(0);
    await expect(guests.getByText('Always Here')).toBeVisible();
  });

  test('the monthly calendar sheet opens and confirms a session', async ({ page }) => {
    await page.goto(`/events/${SERIES_SLUG}`);
    await expect(page.getByRole('heading', { name: 'Weekly Sessions' })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Open full session calendar' }).click();
    const sheet = page.getByRole('dialog', { name: 'Choose a session' });
    await expect(sheet).toBeVisible();

    // Cadence copy is derived from the dates themselves (same TZ as the page).
    const dow = new Date('2030-01-10T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long' });
    await expect(sheet.getByText(`Every ${dow}`)).toBeVisible();

    await sheet.getByRole('button', { name: /^Choose / }).click();
    await expect(sheet).toHaveCount(0);
  });
});
