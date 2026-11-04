import { apiPath, apiRoute } from './support/api';
import { test, expect } from '@playwright/test';

const venue = {
  id: 'venue-1', name: 'Contract Hall', city: 'Addis Ababa', address: '12 Venue Road',
  description: 'A venue description served by the API.', latitude: '9.012345', longitude: '38.765432',
  capacity: 800, follower_count: 0, amenities: ['Accessible entrance', 'Parking'],
  social_links: { instagram: 'https://www.instagram.com/contracthall' },
  profile_url: '/venue-avatar.svg', gallery_urls: [{ original: '/venue-photo.svg', medium: '/venue-photo.svg' }],
};

for (const scenario of ['hydrated', 'no coordinates', 'retry', 'follow'] as const) {
  test(`venue profile: ${scenario}`, async ({ page }) => {
    let fail = scenario === 'retry';
    let following = false;
    if (scenario === 'follow') await page.addInitScript(() => localStorage.setItem('digis_session', JSON.stringify({
      access_token: 'venue-test-token', refresh_token: 'venue-refresh', user: { id: 'venue-user', phone: '+251911000009', profile: { full_name: 'Venue Buyer' } },
    })));
    await page.route('**/venue-*.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#aaa"/></svg>' }));
    await page.route(apiRoute(), async route => {
      const path = apiPath(route.request().url());
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (path === '/user') return route.fulfill({ headers, json: { success: true, data: { id: 'venue-user', phone: '+251911000009', profile: { full_name: 'Venue Buyer' } } } });
      if (path === '/users/venue-user/following') return route.fulfill({ headers, json: { success: true, data: [] } });
      if (path === '/venues/venue-1/follow') {
        following = route.request().method() === 'POST';
        return route.fulfill({ headers, json: { success: true, data: { following, follower_count: following ? 1 : 0 } } });
      }
      if (path === '/venues/venue-1') {
        return route.fulfill({ status: fail ? 500 : 200, headers, json: fail
          ? { success: false, error: 'Unavailable' }
          : { success: true, data: { ...venue, ...(scenario === 'no coordinates' ? { latitude: null, longitude: null } : {}) } } });
      }
      const data = path === '/public/events/venue-contract' ? {
        id: 'event-venue', slug: 'venue-contract', title: 'Venue contract event', currency: 'ETB',
        event_dates_preview: [{ id: 'date-1', starts_at: '2027-01-01T18:00:00Z', venue: { id: venue.id, name: venue.name, city: venue.city } }],
      } : [];
      return route.fulfill({ headers, json: { success: true, data } });
    });
    await page.goto('/events/venue-contract');
    await page.getByRole('button', { name: 'View Contract Hall venue profile', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Contract Hall venue profile' });
    if (scenario === 'retry') {
      await expect(page.getByRole('alert').first()).toContainText('venue');
      fail = false;
      await sheet.getByRole('button', { name: 'Retry' }).click();
    }
    await expect(sheet.getByText(venue.description)).toBeVisible();
    await expect(sheet.getByText('800')).toBeVisible();
    await expect(sheet.getByText('0', { exact: true })).toBeVisible();
    await expect(sheet.getByText('Accessible entrance')).toBeVisible();
    await expect(sheet.getByRole('img', { name: 'Contract Hall photo 1' })).toHaveAttribute('src', '/venue-photo.svg');
    await expect(sheet.getByRole('link', { name: 'instagram', exact: true })).toHaveAttribute('href', venue.social_links.instagram);
    if (scenario === 'no coordinates') {
      await expect(page.locator('iframe[title="Map of Contract Hall"]')).toHaveCount(0);
      await expect(sheet.getByRole('link', { name: 'Directions', exact: true })).toHaveCount(0);
      await expect(sheet.getByText('12 Venue Road, Addis Ababa')).toBeVisible();
    } else {
      await expect(sheet.getByRole('link', { name: 'Directions', exact: true })).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=9.012345,38.765432');
    }
    await expect(sheet.getByText('Events', { exact: true })).toHaveCount(0);
    if (scenario === 'hydrated') {
      await expect(sheet.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(sheet).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'View Contract Hall venue profile', exact: true })).toBeFocused();
      if (process.env.VENUE_VISUAL_QA === '1') {
        for (const theme of ['dark', 'light']) {
          await page.evaluate(theme => localStorage.setItem('tiketa-theme', theme), theme);
          for (const width of [1280, 390]) {
            await page.setViewportSize({ width, height: 844 });
            await page.reload();
            await page.getByRole('button', { name: 'View Contract Hall venue profile', exact: true }).click();
            await expect(sheet.getByText(venue.description)).toBeVisible();
            await sheet.getByRole('img', { name: 'Contract Hall photo 1' }).scrollIntoViewIfNeeded();
            await sheet.evaluate(element => element.querySelector('.overflow-y-auto')?.scrollTo(0, 0));
            await page.screenshot({ path: `e2e/.screenshots/venue-${theme}-${width}.png` });
          }
        }
      }
    }
    if (scenario === 'follow') {
      await sheet.getByRole('button', { name: 'Follow Venue', exact: true }).click();
      await expect(sheet.getByRole('button', { name: 'Following', exact: true })).toBeVisible();
      await expect(sheet.getByText('1', { exact: true })).toBeVisible();
      await sheet.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByRole('button', { name: 'View Contract Hall venue profile', exact: true }).click();
      await sheet.getByRole('button', { name: 'Following', exact: true }).click();
      await expect(sheet.getByRole('button', { name: 'Follow Venue', exact: true })).toBeVisible();
      await expect(sheet.getByText('0', { exact: true })).toBeVisible();
    }
  });
}
