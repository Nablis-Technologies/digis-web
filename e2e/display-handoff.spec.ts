import { test, expect } from '@playwright/test';
import { apiPath, apiRoute } from './support/api';

test('switching scoped codes keeps remaining offers unlockable without retaining a stale selection', async ({ page }) => {
  await page.route(apiRoute(), route => {
    const path = apiPath(route.request().url());
    let data: unknown = [];
    if (path === '/public/events/scoped-codes') data = { id: 'scoped-codes', slug: 'scoped-codes', title: 'Scoped Codes', currency: 'ETB', event_dates_preview: [{ id: 'date-one', starts_at: '2030-08-01T18:00:00Z' }] };
    if (path === '/public/events/scoped-codes/products') data = ['Public', 'First', 'Second'].map((name, index) => ({ id: `product-${index}`, name: `${name} Pass`, type: 'ticket', available: true, min_per_order: 1, max_per_order: 2, price_options: [{ currency: 'ETB', amount_minor: 10000, active_from: '2000-01-01T00:00:00Z', active_to: null }], ticket_type: { id: `tt-${index}`, audience: index === 0 ? 'public' : 'access_code', approval_mode: 'automatic', date_selection: 'fixed', admissions_per_unit: 1 } }));
    if (path === '/ticketing/audience_authorizations') {
      const input = route.request().postDataJSON();
      data = { authorized: input.ticket_type_id === `tt-${input.access_code === 'FIRST' ? 1 : input.access_code === 'SECOND' ? 2 : -1}`, reason: 'access_code' };
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/events/scoped-codes');
  await page.getByPlaceholder('Enter your code').fill('FIRST');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.getByRole('heading', { name: 'First Pass', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Second Pass', exact: true })).toHaveCount(0);
  await expect(page.getByPlaceholder('Enter your code')).toBeVisible();
  await page.getByPlaceholder('Enter your code').fill('SECOND');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Second Pass', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'First Pass', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Public Pass', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get Tickets', exact: true })).toBeVisible();
});

for (const width of [1280, 390]) {
  test(`event cover leads the carousel even when gallery arrives first (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const poster = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="red"/></svg>');
    const gallery = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="blue"/></svg>');
    await page.route(apiRoute(), route => route.fulfill({ json: { success: true, data: apiPath(route.request().url()) === '/public/events/poster-first' ? {
      id: 'poster-first', slug: 'poster-first', title: 'Poster First Event', currency: 'ETB',
      event_dates_preview: [{ id: 'date-one', starts_at: '2030-08-01T18:00:00Z' }],
      event_media: [{ id: 'gallery', type: 'gallery', position: 1, file: { medium: gallery } }, { id: 'cover', type: 'cover', position: 0, file: { medium: poster } }],
    } : [] } }));
    await page.goto('/events/poster-first');
    await expect(page.getByRole('heading', { name: 'Poster First Event', exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Poster First Event 1', exact: true }).filter({ visible: true })).toHaveAttribute('src', poster);
  });
}

for (const age of [
  { label: 'omitted', config: {}, expected: null },
  { label: 'explicitly unrestricted', config: { age_restriction: { has_restriction: false } }, expected: 'Any Age' },
  { label: 'bounded', config: { age_restriction: { has_restriction: true, min_age: 21, max_age: 25 } }, expected: '21–25' },
]) {
  test(`age display is truthful when metadata is ${age.label}`, async ({ page }) => {
    await page.route(apiRoute(), route => route.fulfill({ json: { success: true, data: apiPath(route.request().url()) === '/public/events/display-event' ? {
      id: 'display-event', slug: 'display-event', title: 'Display Event', currency: 'ETB', event_setting: { config: age.config },
      event_dates: [{ id: 'date-one', starts_at: '2030-08-01T18:00:00Z', venue: { id: 'venue-one', name: 'Test Venue', city: 'Addis Ababa' } }],
    } : [] } }));
    await page.goto('/events/display-event');
    await expect(page.getByRole('heading', { name: 'Display Event', exact: true }).filter({ visible: true })).toBeVisible();
    if (age.expected) {
      await expect(page.getByText(age.expected, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    } else {
      await expect(page.getByText('Age', { exact: true }).filter({ visible: true })).toHaveCount(0);
      await expect(page.getByText('Any Age', { exact: true })).toHaveCount(0);
    }
  });
}

test('paid placement labels and the Featured filter use server data', async ({ page }) => {
  let featuredQuery = false;
  const event = (id: string, title: string) => ({ id, slug: id, title, currency: 'ETB', categories: [{ id: 'music', name: 'Music' }], price_from_minor: 10000, event_lifecycle: 'upcoming', ticket_availability: 'available', event_dates_preview: [{ id: `date-${id}`, starts_at: '2030-08-01T18:00:00Z' }], event_media: [] });
  const paid = event('paid-event', 'Paid Placement Event');
  const ordinary = event('ordinary-event', 'Ordinary Event');
  await page.route(apiRoute(), route => {
    const url = new URL(route.request().url());
    const path = apiPath(url);
    let data: unknown = [];
    if (path === '/public/featured_events') data = [{ ...paid, placement_label: 'featured' }];
    if (path === '/public/events') {
      featuredQuery = url.searchParams.get('featured') === 'true' || featuredQuery;
      data = url.searchParams.get('featured') === 'true' ? [{ ...paid, placement_label: 'featured' }] : [paid, ordinary];
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/');
  await expect(page.getByText('Featured', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ordinary Event', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('button', { name: 'Featured only', exact: true }).click();
  await expect.poll(() => featuredQuery).toBe(true);
  await expect(page.getByRole('heading', { name: 'Ordinary Event', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Paid Placement Event', exact: true }).first()).toBeVisible();
});

test('Featured-only API failure shows retry instead of a misleading empty catalog', async ({ page }) => {
  let unavailable = true;
  const paid = { id: 'paid-event', slug: 'paid-event', title: 'Recovered Featured Event', placement_label: 'featured', currency: 'ETB', event_dates_preview: [{ id: 'date-one', starts_at: '2030-08-01T18:00:00Z' }], event_lifecycle: 'upcoming', ticket_availability: 'available' };
  await page.route(apiRoute(), route => {
    const url = new URL(route.request().url());
    if (apiPath(url) === '/public/events' && url.searchParams.get('featured') === 'true' && unavailable) return route.fulfill({ status: 503, json: { success: false, code: 'featured_events_unavailable', error: 'Temporarily unavailable' } });
    return route.fulfill({ json: { success: true, data: apiPath(url) === '/public/events' ? [paid] : [] } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('button', { name: 'Featured only', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible({ timeout: 15_000 });
  unavailable = false;
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Recovered Featured Event', exact: true }).first()).toBeVisible();
});
