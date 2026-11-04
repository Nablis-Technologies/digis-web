import { test, expect } from '@playwright/test';
import { apiPath, apiRoute } from './support/api';

const buyer = { id: 'batch-buyer', phone: '+251911000001', profile: { full_name: 'Batch Buyer' }, permissions: [], roles: [] };

test('same-product gift recipients have distinct stable line IDs across retries', async ({ page }) => {
  await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'batch-token', refresh_token: 'batch-refresh', user })), buyer);
  const submissions: Array<{ items: Array<{ event_product_id: string; line_id: string; quantity: number; gift: { recipient_phone: string } }> }> = [];
  await page.route(apiRoute(), async route => {
    const path = apiPath(route.request().url());
    if (path === '/public/events/batch-event/admission_selections') {
      submissions.push(route.request().postDataJSON().admission_selection);
      return route.fulfill({ status: 503, json: { success: false, error: 'Temporarily unavailable', code: 'service_unavailable' } });
    }
    let data: unknown = [];
    if (path === '/user') data = buyer;
    if (path === '/public/events/batch-event') data = { id: 'event-batch', slug: 'batch-event', title: 'Batch Event', currency: 'ETB', event_dates_preview: [{ id: 'date-one', starts_at: '2027-01-01T18:00:00Z' }] };
    if (path === '/public/events/batch-event/products') data = [{ id: 'product-one', event_id: 'event-batch', name: 'General Admission', type: 'ticket', available: true, min_per_order: 1, max_per_order: 5, price_options: [{ currency: 'ETB', amount_minor: 10000, active_from: '2020-01-01T00:00:00Z', active_to: null }], ticket_type: { id: 'type-one', admissions_per_unit: 1, audience: 'public', date_selection: 'fixed' } }];
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/events/batch-event');
  await page.getByRole('heading', { name: 'General Admission', exact: true }).click();
  await page.getByRole('button', { name: 'Gift this ticket', exact: true }).click();
  await page.getByPlaceholder('+251 91 123 4567', { exact: true }).fill('+251911999888');
  await page.getByRole('button', { name: 'Add recipient', exact: true }).click();
  await page.getByPlaceholder('+251 91 123 4567', { exact: true }).nth(1).fill('+251911999777');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const pay = page.getByRole('button', { name: /^Pay / });
  await expect(pay).toBeVisible();
  await pay.click();
  await expect.poll(() => submissions.length).toBe(1);
  // Retry after a fresh mount with the same persisted command identity.
  await page.reload();
  await page.getByRole('heading', { name: 'General Admission', exact: true }).click();
  await page.getByRole('button', { name: 'Gift this ticket', exact: true }).click();
  await page.getByPlaceholder('+251 91 123 4567', { exact: true }).first().fill('+251911999888');
  await page.getByPlaceholder('+251 91 123 4567', { exact: true }).nth(1).fill('+251911999777');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(pay).toBeEnabled();
  await pay.click();
  await expect.poll(() => submissions.length).toBe(2);
  const items = submissions[0].items;
  expect(items.map(item => item.quantity)).toEqual([1, 1]);
  expect(items.map(item => item.event_product_id)).toEqual(['product-one', 'product-one']);
  expect(items.map(item => item.gift.recipient_phone)).toEqual(['+251911999888', '+251911999777']);
  expect(new Set(items.map(item => item.line_id)).size).toBe(2);
  for (const item of items) expect(item.line_id).toMatch(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
  expect(submissions[1].items).toEqual(items);
  await expect(page.getByText("You're going!", { exact: true })).toHaveCount(0);
});

test('gift delivery keeps recipient ordering when server gift rows arrive reversed', async ({ page }) => {
  const first = '11111111-1111-4111-8111-111111111111';
  const second = '22222222-2222-4222-8222-222222222222';
  await page.addInitScript(({ user, first, second }) => {
    localStorage.setItem('digis_session', JSON.stringify({ access_token: 'batch-token', refresh_token: 'batch-refresh', user }));
    sessionStorage.setItem('digis:gift-lines:batch-order', JSON.stringify([first, second]));
  }, { user: buyer, first, second });
  await page.route(apiRoute(), route => route.fulfill({ json: { success: true, data: apiPath(route.request().url()) === '/user' ? buyer : apiPath(route.request().url()) === '/orders/batch-order/gift_purchases' ? [
    { id: 'gift-second', line_id: second, status: 'ready', delivery_status: 'sent', expires_at: '2099-01-01T00:00:00Z', delivered_at: null, claimed_at: null },
    { id: 'gift-first', line_id: first, status: 'ready', delivery_status: 'failed', expires_at: '2099-01-01T00:00:00Z', delivered_at: null, claimed_at: null },
  ] : [] } }));
  await page.goto('/orders/batch-order/gifts');
  const cards = page.getByRole('article');
  await expect(cards.first()).toHaveAccessibleName('Gift gift-first');
  await expect(cards.first().getByText('Delivery failed', { exact: true })).toBeVisible();
  await expect(cards.nth(1)).toHaveAccessibleName('Gift gift-second');
  await expect(cards.nth(1).getByText('Link sent', { exact: true })).toBeVisible();
});

test('completed batch checkout links to correctly ordered delivery without a manually seeded mapping', async ({ page }) => {
  await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'batch-token', refresh_token: 'batch-refresh', user })), buyer);
  let issuedGifts: Array<{ id: string; line_id: string; status: string; delivery_status: string; expires_at: string }> = [];
  const submissions: Array<{ items: Array<{ event_product_id: string; line_id: string; quantity: number; gift: { recipient_phone: string } }> }> = [];
  await page.route(apiRoute(), async route => {
    const path = apiPath(route.request().url());
    if (path === '/public/events/batch-event/admission_selections') {
      submissions.push(route.request().postDataJSON().admission_selection);
      issuedGifts = submissions[0].items.map((item, index) => ({ id: `completed-gift-${index + 1}`, line_id: item.line_id, status: 'ready', delivery_status: index === 0 ? 'failed' : 'sent', expires_at: '2099-01-01T00:00:00Z' })).reverse();
      return route.fulfill({ json: { success: true, data: { order: { id: 'completed-order', status: 'fulfilled', charge_currency: 'ETB', total_minor: 0 }, gift_purchases: issuedGifts, next_action: { type: 'confirmed', order_id: 'completed-order' } } } });
    }
    if (path === '/orders/completed-order/gift_purchases') return route.fulfill({ json: { success: true, data: issuedGifts } });
    let data: unknown = [];
    if (path === '/user') data = buyer;
    if (path === '/public/events/batch-event') data = { id: 'event-batch', slug: 'batch-event', title: 'Batch Event', currency: 'ETB', event_dates_preview: [{ id: 'date-one', starts_at: '2027-01-01T18:00:00Z' }] };
    if (path === '/public/events/batch-event/products') data = [{ id: 'product-one', event_id: 'event-batch', name: 'General Admission', type: 'ticket', available: true, min_per_order: 1, max_per_order: 5, price_options: [{ currency: 'ETB', amount_minor: 0, active_from: '2020-01-01T00:00:00Z', active_to: null }], ticket_type: { id: 'type-one', admissions_per_unit: 1, audience: 'public', date_selection: 'fixed' } }];
    return route.fulfill({ json: { success: true, data } });
  });

  await page.goto('/events/batch-event');
  await page.getByRole('heading', { name: 'General Admission', exact: true }).click();
  await page.getByRole('button', { name: 'Gift this ticket', exact: true }).click();
  await page.getByPlaceholder('+251 91 123 4567', { exact: true }).fill('+251911999888');
  await page.getByRole('button', { name: 'Add recipient', exact: true }).click();
  await page.getByPlaceholder('+251 91 123 4567', { exact: true }).nth(1).fill('+251911999777');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: '.scratch/backend-wireup-2026-11-01/batch-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.scratch/backend-wireup-2026-11-01/batch-mobile.png' });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: /^Pay / }).click();
  await expect(page.getByText('Gifts for 2 recipients', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Track gift delivery', exact: true }).click();
  await expect(page).toHaveURL(/orders\/completed-order\/gifts$/);
  const cards = page.getByRole('article');
  await expect(cards.first()).toHaveAccessibleName('Gift completed-gift-1');
  await expect(cards.first().getByText('Delivery failed', { exact: true })).toBeVisible();
  await expect(cards.nth(1)).toHaveAccessibleName('Gift completed-gift-2');
  await expect(cards.nth(1).getByText('Link sent', { exact: true })).toBeVisible();
});
