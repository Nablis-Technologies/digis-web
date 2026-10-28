import { apiPath, apiRoute } from './support/api';
import { test, expect, type Page } from '@playwright/test';

const BUYER_IDENTIFIER = '+251911000002';
const BUYER_PASSWORD = 'password123';

const WALLET_WIRE = {
  id: 'ticket-abc-123',
  status: 'active',
  unit_number: 1,
  admissions_per_unit_snapshot: 1,
  credential_mode: 'qr',
  event: { id: 'evt-1', slug: 'test-event', title: 'Test Event', timezone: 'Africa/Addis_Ababa', currency: 'ETB' },
  product: { id: 'prod-1', name: 'General Admission', type: 'ticket' },
  ticket_type: { id: 'tt-1', admissions_per_unit: 1, entry_validation_mode: 'qr' },
  event_dates: [{ id: 'ed-1', name: null, starts_at: '2026-09-10T18:00:00Z', ends_at: null, status: 'active', venue: { id: 'v-1', name: 'The Jungle', city: 'Addis Ababa' } }],
  admission_slots: [{ id: 'as-1', position: 1, assignment_status: 'assigned' }],
  credentials: [{ id: 'c-1', admission_slot_id: 'as-1', entry_limit: 1, status: 'active', issued_at: '2026-09-05T10:00:00Z', lookup_code: 'ABC123', qr_token: 'qr-secret' }],
} as const;

test.beforeEach(async ({ page }) => {
  const user = { id: 'return-buyer', phone: '+251911000002', profile: { full_name: 'Return Buyer' }, roles: [], permissions: [] };
  await page.route(apiRoute(), route => {
    const path = apiPath(route.request().url());
    return route.fulfill({ json: { success: true, data: path === '/auth/login'
      ? { access_token: 'return-token', refresh_token: 'return-refresh', user }
      : path === '/user' ? user : [] } });
  });
});

async function loginThroughUi(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByPlaceholder('Phone number', { exact: true }).fill(BUYER_IDENTIFIER);
  await page.getByPlaceholder('Your password', { exact: true }).fill(BUYER_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).last().click();
  await expect(page.getByText('Welcome to Digis')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByPlaceholder('Phone number', { exact: true })).toBeHidden({ timeout: 15_000 });
}

test('guest in-app return reconciles with the payment id written after mount', async ({ page }) => {
  // Regression: Chapa V2 opens the hosted checkout in a NEW tab, so the app tab
  // is already mounted when `startPayment` writes `digis:payment-id:*` and the
  // popup signals `digis:awaiting-confirm`. The return scope must be resolved at
  // signal time — a mount-time snapshot missed it, so the guest refresh poll
  // never ran and the Chapa tab never closed.
  const refreshCalls: string[] = [];
  await page.route(/^http:\/\/localhost:(?:3000\/|5173\/__digis_api\/)public\/events/, (r) => r.fulfill({ json: { success: true, data: [], pagination: {} } }));
  await page.route(/^http:\/\/localhost:(?:3000\/|5173\/__digis_api\/)categories/, (r) => r.fulfill({ json: { success: true, data: [] } }));
  await page.route('**/guest/payments/**/refresh', (r) => {
    refreshCalls.push(r.request().url());
    return r.fulfill({ json: { success: true, data: { state: 'ready', payment: { id: 'pay-1', order_id: 'order-1', status: 'succeeded' }, order: { id: 'order-1', event_id: 'evt-1', status: 'fulfilled' }, tickets: [WALLET_WIRE] } } });
  });

  // Guest app mounts with no return storage yet.
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible({ timeout: 15_000 });

  // startPayment writes these AFTER mount; then the hosted tab signals confirm.
  await page.evaluate(() => {
    sessionStorage.setItem('digis:awaiting-confirm', 'order-1');
    sessionStorage.setItem('digis:payment-id:order-1', 'pay-1');
    sessionStorage.setItem('digis:guest:quoteToken:order-1', 'qt-1');
    sessionStorage.setItem('digis:guest:phone:order-1', '+251900000000');
    sessionStorage.setItem('digis:payment-event:order-1', 'evt-1');
    window.dispatchEvent(new Event('digis:awaiting-confirm'));
  });

  // The guest refresh runs (→ the Chapa tab would be closed), and the sheet
  // confirms.
  await expect.poll(() => refreshCalls.length, { timeout: 10_000 }).toBeGreaterThan(0);
  await expect(page.getByText("You're going!")).toBeVisible({ timeout: 20_000 });
});

for (const signedIn of [false, true]) {
  test(`${signedIn ? 'signed-in' : 'guest'} payment confirmation resumes after reloading the event page`, async ({ page }) => {
    const user = { id: 'return-buyer', phone: '+251911000002', profile: { full_name: 'Return Buyer' }, roles: [], permissions: [] };
    await page.addInitScript(({ signedIn, user }) => {
      if (signedIn) localStorage.setItem('digis_session', JSON.stringify({ access_token: 'test-return-token', refresh_token: 'test-refresh', user }));
      sessionStorage.setItem('digis:awaiting-confirm', 'reload-order');
      sessionStorage.setItem('digis:payment-id:reload-order', 'reload-payment');
      sessionStorage.setItem('digis:payment-event:reload-order', 'evt-1');
      sessionStorage.setItem('digis:guest:quoteToken:reload-order', 'reload-quote');
      sessionStorage.setItem('digis:guest:phone:reload-order', '+251911000002');
    }, { signedIn, user });
    let refreshCalls = 0;
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/__digis_api/') && url.port !== '3000') return route.continue();
      const path = url.pathname.replace(/^\/__digis_api/, '');
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (path === '/user') return route.fulfill({ headers, json: { success: true, data: user } });
      if (path === `/${signedIn ? '' : 'guest/'}payments/reload-payment/refresh`) {
        refreshCalls++;
        return route.fulfill({ headers, json: { success: true, data: { state: 'ready', payment: { id: 'reload-payment', order_id: 'reload-order', status: 'succeeded' }, order: { id: 'reload-order', event_id: 'evt-1', status: 'fulfilled' }, tickets: [WALLET_WIRE] } } });
      }
      return route.fulfill({ headers, json: { success: true, data: [] } });
    });
    // No status=return parameter and no in-memory custom event after a reload.
    await page.goto('/events/thursday-jazz-sessions');
    await expect.poll(() => refreshCalls, { timeout: 7000 }).toBeGreaterThan(0);
    await expect(page.getByText("You're going!")).toBeVisible();
    await page.getByRole('button', { name: 'View My Ticket' }).click();
    await page.waitForURL(/\/tickets/);
    await expect(page.getByText('Scan at entry').first()).toBeVisible();
    if (signedIn) {
      await page.getByRole('button', { name: 'Close ticket', exact: true }).click();
      await page.getByRole('button', { name: 'Account menu' }).click();
      await page.getByRole('button', { name: 'Log out', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Log in', exact: true }).first()).toBeVisible();
      // Same SPA lifetime: browser navigation must not expose the prior
      // account's just-confirmed snapshot after logout.
      await page.evaluate(() => {
        history.pushState(null, '', '/tickets/ticket-abc-123');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await expect(page.getByText('Scan at entry')).toHaveCount(0);
    }
  });
}

test('a slow payment remains recoverable after the confirmation timeout and reload', async ({ page }) => {
  await page.addInitScript(() => {
    // Accelerate only the five-minute watchdog; keep browser animation and
    // network clocks real across the reload.
    const originalTimeout = window.setTimeout.bind(window);
    window.setTimeout = (handler, timeout, ...args) => originalTimeout(handler, timeout === 300_000 ? 1_000 : timeout, ...args);
    if (sessionStorage.getItem('test:slow-order-seeded')) return;
    sessionStorage.setItem('test:slow-order-seeded', 'true');
    sessionStorage.setItem('digis:awaiting-confirm', 'slow-order');
    sessionStorage.setItem('digis:payment-id:slow-order', 'slow-payment');
    sessionStorage.setItem('digis:payment-event:slow-order', 'evt-1');
    sessionStorage.setItem('digis:guest:quoteToken:slow-order', 'slow-quote');
    sessionStorage.setItem('digis:guest:phone:slow-order', '+251911000002');
  });
  let ready = false;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/__digis_api/') && url.port !== '3000') return route.continue();
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const path = url.pathname.replace(/^\/__digis_api/, '');
    return route.fulfill({ headers, json: { success: true, data: path === '/guest/payments/slow-payment/refresh'
      ? { state: ready ? 'ready' : 'pending', payment: { id: 'slow-payment', order_id: 'slow-order', status: ready ? 'succeeded' : 'processing' }, order: { id: 'slow-order', event_id: 'evt-1', status: ready ? 'fulfilled' : 'pending_payment' }, tickets: ready ? [WALLET_WIRE] : [] }
      : [] } });
  });
  await page.goto('/');
  await expect(page.getByText('Confirming your payment').first()).toBeVisible();
  await expect(page.getByText('Still confirming').first()).toBeVisible();
  // A client timeout cannot discard an order which may still settle.
  expect(await page.evaluate(() => sessionStorage.getItem('digis:awaiting-confirm'))).toBe('slow-order');
  ready = true;
  // Preserve real sessionStorage across reload, rather than re-seeding it.
  await page.reload();
  await expect(page.getByText("You're going!")).toBeVisible();
  await page.getByRole('button', { name: 'View My Ticket', exact: true }).click();
  await expect(page.getByText('Scan at entry').first()).toBeVisible();
});

test('signed-in in-app popup return reconciles via POST /payments/:id/refresh', async ({ page }) => {
  // Chapa V2 opens the hosted checkout in a NEW tab; the app tab (this one) is
  // signalled by digis:awaiting-confirm and reconciles the payment by id.
  test.setTimeout(60_000);
  const refreshCalls: string[] = [];
  await page.route('**/payments/**/refresh', (r) => {
    refreshCalls.push(r.request().url());
    return r.fulfill({ json: { success: true, data: { state: 'ready', payment: { id: 'pay-1', order_id: 'order-1', status: 'succeeded' }, order: { id: 'order-1', event_id: 'evt-1', status: 'fulfilled' }, tickets: [WALLET_WIRE] } } });
  });

  await loginThroughUi(page);
  // Ensure the app shell (owner of the awaiting-confirm listener) is mounted.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Worth showing up for.' })).toBeVisible({ timeout: 15_000 });

  await page.evaluate(() => {
    sessionStorage.setItem('digis:awaiting-confirm', 'order-1');
    sessionStorage.setItem('digis:payment-id:order-1', 'pay-1');
    sessionStorage.setItem('digis:payment-event:order-1', 'evt-1');
    window.dispatchEvent(new Event('digis:awaiting-confirm'));
  });

  await expect.poll(() => refreshCalls.length, { timeout: 10_000 }).toBeGreaterThan(0);
  await expect(page.getByText("You're going!")).toBeVisible({ timeout: 20_000 });
});
