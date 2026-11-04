import { test, expect } from '@playwright/test';
import { apiPath, apiRoute } from './support/api';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' };

test('artist follow restores page-two state, persists changes and retains state on rejection', async ({ page }) => {
  const user = { id: 'follow-user', phone: '+251911777888', roles: [], permissions: [], profile: { full_name: 'Follow Tester' } };
  await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'follow-token', refresh_token: 'follow-refresh', user })), user);
  let following = true;
  let reject = false;
  const writes: string[] = [];
  await page.route(apiRoute(), route => {
    const request = route.request();
    const path = apiPath(request.url());
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let data: unknown = [];
    if (path === '/user') data = user;
    if (path === '/public/events/follow-contract') data = {
      id: 'follow-event', slug: 'follow-contract', title: 'Follow Contract', currency: 'ETB',
      event_dates_preview: [{ id: 'date', starts_at: '2030-01-01T16:00:00Z', ends_at: '2030-01-01T20:00:00Z' }],
      event_participants: [{ id: 'participant', artist_id: 'artist-one', name: 'Test Performer' }],
    };
    if (path === '/users/follow-user/following') {
      const query = new URL(request.url()).searchParams;
      data = query.get('page') === '1'
        ? Array.from({ length: 100 }, (_, i) => ({ followable_type: 'Events::Venue', followable_id: `venue-${i}` }))
        : following ? [{ followable_type: 'Events::Artist', followable_id: 'artist-one' }] : [];
    }
    if (path === '/artists/artist-one/follow') {
      writes.push(request.method());
      if (reject) return route.fulfill({ status: 422, headers, json: { success: false, error: 'Follow change rejected' } });
      following = request.method() === 'POST';
      data = { following, follower_count: following ? 1 : 0 };
    }
    return route.fulfill({ headers, json: { success: true, data } });
  });
  const openArtist = async () => {
    await page.goto('/events/follow-contract');
    await page.getByText('Test Performer', { exact: true }).filter({ visible: true }).first().click();
  };
  await openArtist();
  await expect(page.getByRole('button', { name: 'Following', exact: true }).filter({ visible: true }).first()).toBeVisible();
  reject = true;
  await page.getByRole('button', { name: 'Following', exact: true }).filter({ visible: true }).first().click();
  await expect(page.getByText('Follow change rejected', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Following', exact: true }).filter({ visible: true }).first()).toBeVisible();
  reject = false;
  await page.getByRole('button', { name: 'Following', exact: true }).filter({ visible: true }).first().click();
  await expect(page.getByRole('button', { name: 'Follow Artist', exact: true }).filter({ visible: true })).toBeVisible();
  await openArtist();
  await expect(page.getByRole('button', { name: 'Follow Artist', exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Follow Artist', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('button', { name: 'Following', exact: true }).filter({ visible: true }).first()).toBeVisible();
  expect(writes).toEqual(['DELETE', 'DELETE', 'POST']);
});

test('organizer list restores saved follows and sends unfollow rather than duplicate follow', async ({ page }) => {
  const user = { id: 'org-follower', phone: '+251911777888', roles: [], permissions: [] };
  await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'token', refresh_token: 'refresh', user })), user);
  const writes: string[] = [];
  await page.route(apiRoute(), route => {
    const req = route.request();
    const path = apiPath(req.url());
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let data: unknown = [];
    if (path === '/user') data = user;
    if (path === '/public/events/org-follow') data = {
      id: 'event', slug: 'org-follow', title: 'Organizer Follow', currency: 'ETB',
      event_dates_preview: [{ id: 'date', starts_at: '2030-01-01T16:00:00Z' }],
      organization: { id: 'lead', name: 'Lead Organizer' },
      event_organizations: [{ type: 'co_organizer', organization: { id: 'cohost', name: 'Co-host' } }],
    };
    if (path === '/users/org-follower/following') data = [{ followable_type: 'Organizations::Organization', followable_id: 'cohost' }];
    if (path === '/organizations/cohost/follow') { writes.push(req.method()); data = { following: false, follower_count: 0 }; }
    return route.fulfill({ headers, json: { success: true, data } });
  });
  await page.goto('/events/org-follow');
  await page.getByRole('button', { name: 'View all organizers', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('button', { name: 'Following', exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Following', exact: true }).filter({ visible: true }).click();
  await expect.poll(() => writes).toEqual(['DELETE']);
  await expect(page.getByRole('button', { name: 'Following', exact: true }).filter({ visible: true })).toHaveCount(0);
});

test('failed follow reads offer retry without sending a follow command', async ({ page }) => {
  const user = { id: 'retry-follower', roles: [], permissions: [] };
  await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'token', refresh_token: 'refresh', user })), user);
  let fail = true;
  let writes = 0;
  await page.route(apiRoute(), route => {
    const req = route.request();
    const path = apiPath(req.url());
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let data: unknown = [];
    if (path === '/user') data = user;
    if (path === '/public/events/follow-retry') data = { id: 'event', slug: 'follow-retry', title: 'Follow Retry', currency: 'ETB', event_dates_preview: [{ id: 'date', starts_at: '2030-01-01T16:00:00Z' }], event_participants: [{ id: 'participant', artist_id: 'artist', name: 'Retry Performer' }] };
    if (path === '/users/retry-follower/following') {
      if (fail) return route.fulfill({ status: 503, headers, json: { success: false, error: 'Unavailable' } });
      data = [{ followable_type: 'Events::Artist', followable_id: 'artist' }];
    }
    if (path.endsWith('/follow')) writes++;
    return route.fulfill({ headers, json: { success: true, data } });
  });
  await page.goto('/events/follow-retry');
  await page.getByText('Retry Performer', { exact: true }).filter({ visible: true }).first().click();
  await expect(page.getByText('Couldn’t load your follow status.', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Follow Artist', exact: true })).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Retry follow', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Following', exact: true }).first()).toBeVisible();
  expect(writes).toBe(0);
});
