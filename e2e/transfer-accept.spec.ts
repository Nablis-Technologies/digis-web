import { ACTIVE_TICKET } from './support/wallet';
import { decodeQr } from './support/qr';
import { apiPath, apiRoute } from './support/api';
import { test, expect, type Route } from '@playwright/test';

/**
 * Accept an incoming transfer from the notification panel (#61).
 *
 * The inbox and the authenticated accept endpoint are mocked at the network
 * boundary with the exact shapes `Messaging::NotificationSerializer` +
 * `Ticketing::Transfers::Accept` produce; everything else falls through to the
 * live dev backend. This guards the wiring: the `transfer_incoming` card offers
 * an Accept action, and the accept is tokenless (empty body, bearer proves
 * identity) with the Idempotency-Key header.
 */

const API = 'http://localhost:3000';
const SESSION_KEY = 'digis_session';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};

function fulfillJson(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });
}

const USER = {
  id: 'user-e2e-transfer',
  phone: '+251911000009',
  name: 'Transfer Recipient',
  verified_at: '2026-01-01T00:00:00.000Z',
  permissions: [],
  roles: [],
  profile: { first_name: 'Transfer', last_name: 'Recipient', full_name: 'Transfer Recipient', avatar_url: null },
};

const SESSION = { access_token: 'acc-e2e', refresh_token: 'ref-e2e', user: USER };

/** Messaging::NotificationSerializer, notification_type = transfer_incoming. */
const NOTIFICATION = {
  id: 'n-transfer-1',
  notification_type: 'transfer_incoming',
  category: 'transactional',
  data: {
    transfer_id: 'tr-e2e-1',
    ticket_id: 'tk-1',
    event_id: 'ev-1',
    event_title: 'Addis Sound Festival 2026',
    ticket_label: 'Early Bird',
    expires_at: '2026-12-31T10:00:00.000Z',
  },
  read_at: null,
  available_at: '2026-10-17T10:00:00.000Z',
  created_at: '2026-10-17T09:00:00.000Z',
};

test('accepting an incoming transfer from the notification panel is tokenless', async ({ page }) => {
  let postBody: unknown;
  let postKey: string | undefined;
  let acceptedPath: string | undefined;
  let walletFetches = 0;
  let accepted = false;

  await page.route(apiRoute(), async (route) => {
    const request = route.request();
    const path = apiPath(request.url());
    if (request.method() === 'OPTIONS') return fulfillJson(route, 204, {});

    if (path === '/user' && request.method() === 'GET') return fulfillJson(route, 200, { success: true, data: USER });
    if (path === '/notifications' && request.method() === 'GET') {
      return fulfillJson(route, 200, { success: true, data: [NOTIFICATION] });
    }
    if (path === '/notifications/n-transfer-1/read') return fulfillJson(route, 200, { success: true, data: {} });
    // The wallet is an app-level query (router.tsx) — an unmocked 401 here would
    // trip the 401→refresh→sign-out interceptor before the panel is even opened.
    if (path === '/tickets' && request.method() === 'GET') {
      walletFetches += 1;
      return fulfillJson(route, 200, { success: true, data: accepted ? [ACTIVE_TICKET] : [], pagination: { current_page: 1, per_page: 20, total_count: accepted ? 1 : 0, total_pages: 1 } });
    }
    if (path === '/ticket_transfers/tr-e2e-1/accept') {
      accepted = true;
      acceptedPath = path;
      postBody = request.postDataJSON();
      postKey = request.headers()['idempotency-key'];
      return fulfillJson(route, 200, { success: true, data: { id: 'tr-e2e-1', status: 'accepted' } });
    }
    return fulfillJson(route, 200, { success: true, data: [] });
  });

  await page.addInitScript(
    ([key, session]) => window.localStorage.setItem(key, session),
    [SESSION_KEY, JSON.stringify(SESSION)] as const,
  );

  await page.goto('/');

  // Signed in: the bell carries the unread badge from the mocked inbox.
  await page.getByRole('button', { name: 'Notifications' }).first().click();
  await expect(page.getByText('You received a ticket').first()).toBeVisible();
  await expect(page.getByText('Addis Sound Festival 2026 · Accept it to add it to your wallet.').first()).toBeVisible();

  const walletFetchesBeforeAccept = walletFetches;
  await page.getByRole('button', { name: 'Accept', exact: true }).first().click();

  // Only after the server confirms: the card flips to Accepted and the toast fires.
  await expect(page.getByRole('button', { name: 'Accepted', exact: true }).first()).toBeVisible();
  await expect(page.getByText('Ticket accepted').first()).toBeVisible();

  expect(acceptedPath).toBe('/ticket_transfers/tr-e2e-1/accept');
  expect(postBody).toEqual({});
  expect(postKey).toBeTruthy();
  // The accept refreshes the wallet so the ticket shows up there.
  await expect.poll(() => walletFetches).toBeGreaterThan(walletFetchesBeforeAccept);
  await page.getByRole('button', { name: 'Tickets', exact: true }).first().click();
  await page.locator('[data-ticket-id="older-ticket"]').click();
  await page.getByRole('button', { name: /Enlarge/ }).click();
  const qr = page.getByRole('region', { name: 'Enlarged ticket entry code' }).getByRole('img', { name: 'Ticket entry QR' });
  await expect.poll(() => decodeQr(qr)).toBe(ACTIVE_TICKET.credentials[0].qr_token);
});
