import { test, expect } from '@playwright/test';
import { apiPath, apiRoute } from './support/api';
import { ACTIVE_TICKET } from './support/wallet';
import { decodeQr } from './support/qr';

const userA = { id: 'account-a', phone: '+251911000001', permissions: [], roles: [], profile: { full_name: 'Account A' } };

test('a pending payment cannot be confirmed by a previous ticket for the same event', async ({ page }) => {
  await page.addInitScript(user => {
    localStorage.setItem('digis_session', JSON.stringify({ access_token: 'token-a', refresh_token: 'refresh-a', user }));
    sessionStorage.setItem('digis:awaiting-confirm', 'new-order');
    sessionStorage.setItem('digis:payment-id:new-order', 'new-payment');
    sessionStorage.setItem('digis:payment-event:new-order', 'event-one');
    const original = window.setTimeout.bind(window);
    window.setTimeout = (fn, ms, ...args) => original(fn, ms === 300_000 ? 750 : ms, ...args);
  }, userA);
  await page.route(apiRoute(), async route => {
    const path = apiPath(route.request().url());
    const data = path === '/user' ? userA : path === '/tickets' ? [ACTIVE_TICKET]
      : path === '/payments/new-payment/refresh' ? { state: 'pending', payment: { id: 'new-payment', order_id: 'new-order', status: 'processing' }, order: { id: 'new-order', event_id: 'event-one', status: 'pending_payment' }, tickets: [] } : [];
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/');
  await expect(page.getByText('Still confirming', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/safely try again|nothing was charged/i)).toHaveCount(0);
  await expect(page.getByText("You're going!", { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'View My Ticket', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('digis:awaiting-confirm'))).toBe('new-order');
});

for (const invalidProof of ['different attempt', 'different order', 'not paid', 'missing credential']) {
  test(`payment confirmation rejects ${invalidProof} even when the response says ready`, async ({ page }) => {
    await page.addInitScript(user => {
      localStorage.setItem('digis_session', JSON.stringify({ access_token: 'token-a', refresh_token: 'refresh-a', user }));
      sessionStorage.setItem('digis:awaiting-confirm', 'new-order');
      sessionStorage.setItem('digis:payment-id:new-order', 'new-payment');
      sessionStorage.setItem('digis:payment-event:new-order', 'event-one');
      const original = window.setTimeout.bind(window);
      window.setTimeout = (fn, ms, ...args) => original(fn, ms === 300_000 ? 750 : ms, ...args);
    }, userA);
    const proof = { state: 'ready', payment: { id: invalidProof === 'different attempt' ? 'unrelated-payment' : 'new-payment', order_id: invalidProof === 'different order' ? 'other-order' : 'new-order', status: invalidProof === 'not paid' ? 'processing' : 'succeeded' },
      order: { id: 'new-order', event_id: 'event-one', status: 'fulfilled' }, tickets: [{ ...ACTIVE_TICKET, credentials: invalidProof === 'missing credential' ? [] : ACTIVE_TICKET.credentials }] };
    await page.route(apiRoute(), route => route.fulfill({ json: { success: true, data: apiPath(route.request().url()) === '/user' ? userA : apiPath(route.request().url()) === '/payments/new-payment/refresh' ? proof : [] } }));
    await page.goto('/');
    await expect(page.getByText('Still confirming', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'View My Ticket', exact: true })).toHaveCount(0);
  });
}

for (const scenario of ['no credential', 'pending ticket', 'revoked credential']) {
  test(`${scenario} never presents a scan-ready ticket or downloadable QR`, async ({ page }) => {
    const ticket = { ...ACTIVE_TICKET,
      status: scenario === 'pending ticket' ? 'pending' : 'active',
      credentials: scenario === 'revoked credential' ? [{ ...ACTIVE_TICKET.credentials[0], status: 'revoked' }] : [],
    };
    await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'token-a', refresh_token: 'refresh-a', user })), userA);
    await page.route(apiRoute(), async route => route.fulfill({ json: { success: true,
      data: apiPath(route.request().url()) === '/user' ? userA : apiPath(route.request().url()) === '/tickets' ? [ticket] : [],
    } }));
    await page.goto('/tickets/older-ticket');
    await expect(page.getByRole('button', { name: 'Close ticket', exact: true })).toBeVisible();
    await expect(page.getByText('Scan at entry', { exact: true }).first()).toBeHidden();
    await expect(page.getByRole('button', { name: /Enlarge/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Download/ })).toHaveCount(0);
    await expect(page.getByRole('status').getByText('Entry code unavailable', { exact: true })).toBeVisible();
  });
}

test('the displayed QR decodes to the exact active server credential', async ({ page }) => {
  const ticket = { ...ACTIVE_TICKET, credentials: [{ ...ACTIVE_TICKET.credentials[0], id: 'old-generation', status: 'revoked', qr_token: 'revoked-secret' }, ...ACTIVE_TICKET.credentials] };
  await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'token-a', refresh_token: 'refresh-a', user })), userA);
  await page.route(apiRoute(), route => route.fulfill({ json: { success: true,
    data: apiPath(route.request().url()) === '/user' ? userA : apiPath(route.request().url()) === '/tickets' ? [ticket] : [],
  } }));
  await page.goto('/tickets/older-ticket');
  await page.getByRole('button', { name: /Enlarge/ }).click();
  const qr = page.getByRole('region', { name: 'Enlarged ticket entry code', exact: true }).getByRole('img', { name: 'Ticket entry QR', exact: true });
  await expect(qr).toBeVisible();
  await expect.poll(() => decodeQr(qr)).toBe(ACTIVE_TICKET.credentials[0].qr_token);
  await expect(page.getByText(ACTIVE_TICKET.credentials[0].qr_token!, { exact: true })).toHaveCount(0);
});

test('switching accounts never displays the previous account wallet while the new fetch is pending', async ({ page }) => {
  const userB = { ...userA, id: 'account-b', phone: '+251911000002', profile: { full_name: 'Account B' } };
  await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'token-a', refresh_token: 'refresh-a', user })), userA);
  let releaseB = () => {};
  const waitingForB = new Promise<void>(resolve => { releaseB = resolve; });
  let bWalletRequested = false;
  await page.route(apiRoute(), async route => {
    const path = apiPath(route.request().url());
    if (path === '/auth/login') return route.fulfill({ json: { success: true, data: { access_token: 'token-b', refresh_token: 'refresh-b', user: userB } } });
    const isB = route.request().headers().authorization === 'Bearer token-b';
    if (path === '/tickets' && isB) { bWalletRequested = true; await waitingForB; }
    return route.fulfill({ json: { success: true, data: path === '/user' ? (isB ? userB : userA) : path === '/tickets' && !isB ? [ACTIVE_TICKET] : [] } });
  });
  await page.goto('/tickets');
  await expect(page.locator('[data-ticket-id="older-ticket"]')).toBeVisible();
  await page.getByRole('button', { name: 'Account menu', exact: true }).first().click();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.getByRole('button', { name: 'Log in', exact: true }).first().click();
  await page.getByPlaceholder('Phone number', { exact: true }).fill(userB.phone);
  await page.getByPlaceholder('Your password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click();
  await expect(page.getByText('Welcome to Digis')).toBeHidden({ timeout: 10_000 });
  await page.waitForURL('**/tickets');
  try {
    await expect.poll(() => bWalletRequested).toBe(true);
    await expect(page.locator('[data-ticket-id="older-ticket"]')).toHaveCount(0);
    await expect(page.getByText('Earlier Purchase', { exact: true })).toHaveCount(0);
  } finally { releaseB(); }
});

test('a delayed current-user response cannot overwrite a newly signed-in account', async ({ page }) => {
  const userB = { ...userA, id: 'account-b', phone: '+251911000002', profile: { full_name: 'Account B' } };
  await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'token-a', refresh_token: 'refresh-a', user })), userA);
  let releaseA = () => {};
  const waitingForA = new Promise<void>(resolve => { releaseA = resolve; });
  const oldUserResponse = page.waitForResponse(response => apiPath(response.url()) === '/user' && response.request().headers().authorization === 'Bearer token-a');
  await page.route(apiRoute(), async route => {
    const path = apiPath(route.request().url());
    const isB = route.request().headers().authorization === 'Bearer token-b';
    if (path === '/user' && !isB) await waitingForA;
    const data = path === '/auth/login' ? { access_token: 'token-b', refresh_token: 'refresh-b', user: userB } : path === '/user' ? (isB ? userB : userA) : [];
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Account menu', exact: true }).first().click();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.getByRole('button', { name: 'Log in', exact: true }).first().click();
  await page.getByPlaceholder('Phone number', { exact: true }).fill(userB.phone);
  await page.getByPlaceholder('Your password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click();
  await expect(page.getByText('Welcome to Digis')).toBeVisible();
  await expect(page.getByText('Welcome to Digis')).toBeHidden();
  releaseA();
  await (await oldUserResponse).finished();
  await page.getByRole('button', { name: 'Profile', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Account B', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Account A', exact: true })).toHaveCount(0);
});

test('a delayed token refresh cannot undo logout or retry as the old account', async ({ page }) => {
  await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'token-a', refresh_token: 'refresh-a', user })), userA);
  let releaseRefresh = () => {};
  const waiting = new Promise<void>(resolve => { releaseRefresh = resolve; });
  let refreshStarted = false;
  let authenticatedRetries = 0;
  const refreshResponse = page.waitForResponse(response => apiPath(response.url()) === '/auth/refresh');
  await page.route(apiRoute(), async route => {
    const path = apiPath(route.request().url());
    if (path === '/auth/refresh') {
      refreshStarted = true; await waiting;
      return route.fulfill({ json: { success: true, data: { access_token: 'late-token-a', refresh_token: 'late-refresh-a', user: userA } } });
    }
    if (path === '/user' && route.request().headers().authorization !== 'Bearer late-token-a') return route.fulfill({ status: 401, json: { success: false, code: 'token_expired' } });
    if (route.request().headers().authorization === 'Bearer late-token-a') authenticatedRetries++;
    return route.fulfill({ json: { success: true, data: path === '/user' ? userA : [] } });
  });
  await page.goto('/');
  await expect.poll(() => refreshStarted).toBe(true);
  await page.getByRole('button', { name: 'Account menu', exact: true }).first().click();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log in', exact: true }).first()).toBeVisible();
  releaseRefresh();
  await (await refreshResponse).finished();
  await page.getByRole('button', { name: 'Profile', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Log in', exact: true }).first()).toBeVisible();
  expect(authenticatedRetries).toBe(0);
});

test('a return without an attempt ID cannot claim an existing wallet ticket as payment success', async ({ page }) => {
  await page.addInitScript(user => {
    localStorage.setItem('digis_session', JSON.stringify({ access_token: 'token-a', refresh_token: 'refresh-a', user }));
    const original = window.setTimeout.bind(window);
    window.setTimeout = (fn, ms, ...args) => original(fn, ms === 300_000 ? 750 : ms, ...args);
  }, userA);
  await page.route(apiRoute(), route => route.fulfill({ json: { success: true, data: apiPath(route.request().url()) === '/user' ? userA : apiPath(route.request().url()) === '/tickets' ? [ACTIVE_TICKET] : [] } }));
  await page.goto('/?status=return&event_id=event-one');
  await expect(page.getByText('Still confirming', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'View My Ticket', exact: true })).toHaveCount(0);
});

test('an old-account 401 cannot refresh and replay its request as the new account', async ({ page }) => {
  const userB = { ...userA, id: 'account-b', phone: '+251911000002', profile: { full_name: 'Account B' } };
  await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'token-a', refresh_token: 'refresh-a', user })), userA);
  let releaseA = () => {};
  const waitingForA = new Promise<void>(resolve => { releaseA = resolve; });
  const oldUserResponse = page.waitForResponse(response => apiPath(response.url()) === '/user' && response.request().headers().authorization === 'Bearer token-a');
  let refreshCalls = 0;
  let replayedAsB = 0;
  await page.route(apiRoute(), async route => {
    const path = apiPath(route.request().url());
    const isB = route.request().headers().authorization === 'Bearer token-b';
    if (path === '/user' && !isB) {
      await waitingForA;
      return route.fulfill({ status: 401, json: { success: false, code: 'token_expired' } });
    }
    if (path === '/auth/refresh') {
      refreshCalls++;
      return route.fulfill({ json: { success: true, data: { access_token: 'token-b', refresh_token: 'refresh-b', user: userB } } });
    }
    if (path === '/user' && isB) replayedAsB++;
    const data = path === '/auth/login' ? { access_token: 'token-b', refresh_token: 'refresh-b', user: userB } : path === '/user' ? (isB ? userB : userA) : [];
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Account menu', exact: true }).first().click();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.getByRole('button', { name: 'Log in', exact: true }).first().click();
  await page.getByPlaceholder('Phone number', { exact: true }).fill(userB.phone);
  await page.getByPlaceholder('Your password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click();
  await expect(page.getByText('Welcome to Digis')).toBeVisible();
  await expect(page.getByText('Welcome to Digis')).toBeHidden();
  releaseA();
  await (await oldUserResponse).finished();
  await page.getByRole('button', { name: 'Profile', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Account B', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Account A', exact: true })).toHaveCount(0);
  expect(refreshCalls).toBe(0);
  expect(replayedAsB).toBe(0);
});

