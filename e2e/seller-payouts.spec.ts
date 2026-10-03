import { test, expect, type Route } from '@playwright/test';

/**
 * Seller payouts (`/payouts`) — the cash-out flow.
 *
 * The payout endpoints are mocked at the network boundary with the exact wire
 * shapes `Marketplace::SellerPayoutSerializer` / `SellerSerializer` produce
 * (verified against digis_backend @ f679e56); every other request (auth, etc.)
 * still hits the live dev backend. This guards the UI wiring: the amount defaults
 * to the full available balance, the POST carries the currency + explicit amount
 * + destination + an Idempotency-Key, and the result renders as `pending`.
 */

const SELLER = '+251900123456';
const PASSWORD = 'password123';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function fulfillJson(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });
}

const BALANCE = {
  currency: 'ETB',
  ledger_total_minor: 500000,
  reserved_minor: 0,
  available_minor: 500000,
};

function accountWire(status = 'verified') {
  return {
    id: 'pa-1',
    user_id: 'u-1',
    type: 'bank',
    provider: 'chapa',
    bank_slug: 'cbe',
    account_label: null,
    status,
    verification_source: 'provider',
    is_default: status === 'verified',
    verified_at: status === 'verified' ? '2026-10-01T10:00:00.000Z' : null,
    last_used_at: null,
    created_at: '2026-10-01T09:00:00.000Z',
    updated_at: '2026-10-01T10:00:00.000Z',
  };
}

const PAYOUT = {
  id: 'po-1',
  seller_user_id: 'u-1',
  seller_payout_account_id: 'pa-1',
  provider: 'chapa',
  amount_minor: 500000,
  currency: 'ETB',
  status: 'pending',
  requested_at: '2026-10-02T10:00:00.000Z',
  processed_at: null,
  created_at: '2026-10-02T10:00:00.000Z',
};

async function login(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByPlaceholder('Phone number or email', { exact: true }).fill(SELLER);
  await page.getByPlaceholder('Your password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).last().click();
  await expect(page.getByPlaceholder('Phone number or email', { exact: true })).toBeHidden({ timeout: 15_000 });
}

test('seller cashes out the full balance → POST carries amount + account + key, row shows pending', async ({ page }) => {
  test.setTimeout(90_000);

  let created = false;
  let postBody: unknown;
  let postKey: string | undefined;

  await page.route('http://localhost:3000/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') return fulfillJson(route, 204, {});

    if (path === '/marketplace/seller/balance') return fulfillJson(route, 200, { success: true, data: [BALANCE] });
    if (path === '/marketplace/seller/payout_accounts') return fulfillJson(route, 200, { success: true, data: [accountWire()] });
    if (path === '/marketplace/seller/payouts' && request.method() === 'GET') {
      return fulfillJson(route, 200, {
        success: true,
        data: created ? [PAYOUT] : [],
        pagination: { current_page: 1, per_page: 20, total_count: created ? 1 : 0, total_pages: 1 },
      });
    }
    if (path === '/marketplace/seller/payouts' && request.method() === 'POST') {
      postBody = request.postDataJSON();
      postKey = request.headers()['idempotency-key'];
      created = true;
      return fulfillJson(route, 201, { success: true, data: PAYOUT });
    }
    return route.fallback();
  });

  await login(page);
  await page.goto('/payouts');

  await expect(page.getByRole('heading', { name: 'Payouts' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Available to pay out')).toBeVisible();

  await page.getByRole('button', { name: 'Cash out' }).click();

  // The amount defaults to the full available balance (500000 minor = 5000).
  const amount = page.locator('input[inputmode="decimal"]');
  await expect(amount).toHaveValue('5000');
  await page.getByRole('button', { name: 'Confirm cash out' }).click();

  // The new payout renders as pending (never "paid out"). Exact match so the
  // transient success toast ("… it's pending.") can't satisfy the assertion.
  await expect(page.getByText('Pending', { exact: true })).toBeVisible({ timeout: 10_000 });
  expect(postBody).toEqual({
    payout: { currency: 'ETB', amount_minor: 500000, seller_payout_account_id: 'pa-1' },
  });
  expect(postKey).toBeTruthy();
});

test('no verified destination → offers to add a payout method instead of cashing out', async ({ page }) => {
  test.setTimeout(90_000);

  await page.route('http://localhost:3000/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') return fulfillJson(route, 204, {});
    if (path === '/marketplace/seller/balance') return fulfillJson(route, 200, { success: true, data: [BALANCE] });
    if (path === '/marketplace/seller/payout_accounts') return fulfillJson(route, 200, { success: true, data: [accountWire('pending_verification')] });
    if (path === '/marketplace/seller/payouts') return fulfillJson(route, 200, { success: true, data: [], pagination: { current_page: 1, per_page: 20, total_count: 0, total_pages: 1 } });
    return route.fallback();
  });

  await login(page);
  await page.goto('/payouts');

  await expect(page.getByRole('button', { name: 'Add payout method' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Add a verified destination to cash out.')).toBeVisible();
});
