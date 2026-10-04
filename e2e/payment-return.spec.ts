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

async function loginThroughUi(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByPlaceholder('Phone number', { exact: true }).fill(BUYER_IDENTIFIER);
  await page.getByPlaceholder('Your password', { exact: true }).fill(BUYER_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).last().click();
  await expect(page.getByText('Welcome to Digis')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByPlaceholder('Phone number', { exact: true })).toBeHidden({ timeout: 15_000 });
}

test('payment return confirms when the wallet holds a ticket', async ({ page }) => {
  test.setTimeout(60_000);

  // Simulate the backend wallet holding the just-issued ticket. The wallet
  // poll (GET /tickets) is what the return confirmation watches.
  await page.route('**/tickets', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { success: true, data: [WALLET_WIRE] } });
    } else {
      await route.continue();
    }
  });

  await loginThroughUi(page);
  await page.goto('/?status=return');

  // Confirming overlay appears — the shared sheet shows the state in its
  // header and body, so scope to the first match.
  await expect(page.getByText('Confirming your payment').first()).toBeVisible({ timeout: 15_000 });

  // …then the shared sheet transitions to "You're going!" (SuccessView).
  await expect(page.getByText("You're going!")).toBeVisible({ timeout: 30_000 });
  // View My Ticket takes the buyer to their ticket; the QR auto-opens (no
  // redundant success banner — the sheet already announced the payment).
  await page.getByRole('button', { name: 'View My Ticket' }).click();
  await page.waitForURL(/\/tickets/, { timeout: 15_000 });
  expect(page.url()).not.toContain('payment=success');
  await expect(page.getByText('Scan at entry').first()).toBeVisible({ timeout: 15_000 });
});

test('guest in-app return reconciles with the payment id written after mount', async ({ page }) => {
  // Regression: Chapa V2 opens the hosted checkout in a NEW tab, so the app tab
  // is already mounted when `startPayment` writes `digis:payment-id:*` and the
  // popup signals `digis:awaiting-confirm`. The return scope must be resolved at
  // signal time — a mount-time snapshot missed it, so the guest refresh poll
  // never ran and the Chapa tab never closed.
  const refreshCalls: string[] = [];
  await page.route('http://localhost:3000/public/events**', (r) => r.fulfill({ json: { success: true, data: [], pagination: {} } }));
  await page.route('http://localhost:3000/categories**', (r) => r.fulfill({ json: { success: true, data: [] } }));
  await page.route('http://localhost:3000/guest/payments/**/refresh', (r) => {
    refreshCalls.push(r.request().url());
    return r.fulfill({ json: { success: true, data: { state: 'ready', payment: {}, order: {}, tickets: [WALLET_WIRE] } } });
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

test('signed-in in-app popup return reconciles via POST /payments/:id/refresh', async ({ page }) => {
  // Chapa V2 opens the hosted checkout in a NEW tab; the app tab (this one) is
  // signalled by digis:awaiting-confirm and reconciles the payment by id.
  test.setTimeout(60_000);
  const refreshCalls: string[] = [];
  await page.route('**/payments/**/refresh', (r) => {
    refreshCalls.push(r.request().url());
    return r.fulfill({ json: { success: true, data: { state: 'ready', payment: {}, order: {}, tickets: [WALLET_WIRE] } } });
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