import { test, expect } from '@playwright/test';
import { apiPath } from '../support/api';
import { decodeQr } from '../support/qr';
import type { PaymentAttempt, PaymentRefreshResult } from '../../src/lib/order';

test('real sandbox payment produces the exact order ticket, usable QR and durable wallet entry', async ({ page, request }) => {
  // No page.route, database writes, simulated webhooks or force-issued tickets.
  const health = await request.get('/__digis_api/up', { timeout: 15_000 });
  expect(health.ok(), 'Live Rails API is unavailable. This acceptance gate cannot pass without the real stack.').toBe(true);
  const buyer = process.env.ACCEPTANCE_BUYER_PHONE ?? '+251900123456';
  const password = process.env.ACCEPTANCE_BUYER_PASSWORD ?? 'password123';
  const slug = process.env.ACCEPTANCE_EVENT_SLUG ?? 'on-on';
  const tier = process.env.ACCEPTANCE_TICKET_TIER ?? 'Regular';
  const proofs: PaymentRefreshResult[] = [];
  page.on('response', async response => {
    if (!/\/payments\/[^/]+\/refresh$/.test(apiPath(response.url())) || !response.ok()) return;
    try { proofs.push((await response.json()).data); } catch { /* Final assertions require a valid proof. */ }
  });

  await page.goto('/login');
  await page.getByPlaceholder('Phone number', { exact: true }).fill(buyer);
  await page.getByPlaceholder('Your password', { exact: true }).fill(password);
  const loggedIn = page.waitForResponse(response => apiPath(response.url()) === '/auth/login' && response.request().method() === 'POST', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click();
  expect((await loggedIn).ok(), 'The acceptance buyer must authenticate successfully.').toBe(true);
  await expect(page.getByRole('button', { name: 'Account menu', exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await page.goto(`/events/${encodeURIComponent(slug)}`);
  await page.getByRole('heading', { name: tier, exact: true }).first().click();
  await page.getByRole('button', { name: /Buy Now/i }).click();
  const pay = page.getByRole('button', { name: /^Pay / });
  for (let step = 0; step < 6 && !await pay.isVisible(); step++) {
    const consent = page.locator('button[aria-label^="Accept "]');
    for (const toggle of await consent.all()) await toggle.click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  await expect(pay).toBeEnabled();
  const admission = page.waitForResponse(response => response.request().method() === 'POST' && apiPath(response.url()).endsWith('/admission_selections'), { timeout: 30_000 });
  const initialized = page.waitForResponse(response => response.request().method() === 'POST' && /\/orders\/[^/]+\/payment_attempts$/.test(apiPath(response.url())), { timeout: 30_000 }).catch(() => null);
  const opened = page.waitForEvent('popup', { timeout: 30_000 }).catch(() => null);
  await pay.click();
  const admissionResponse = await admission;
  const selection = await admissionResponse.json();
  expect(admissionResponse.ok(), `Admission must succeed before payment; API code: ${selection.code ?? 'none'}`).toBe(true);
  expect(selection.data?.next_action?.type, 'Seeded acceptance selection must require a real paid checkout.').toBe('checkout_required');
  const paymentResponse = await initialized;
  expect(paymentResponse, 'Checkout must initialize a payment attempt.').not.toBeNull();
  expect(paymentResponse!.ok(), 'A handled payment error is not successful checkout.').toBe(true);
  const payment: PaymentAttempt = (await paymentResponse!.json()).data;
  expect(payment.id).toBeTruthy();
  expect(payment.order_id).toBeTruthy();
  const checkout = (await opened)!;
  expect(checkout, 'Hosted checkout must open.').not.toBeNull();
  await checkout.waitForURL('https://checkout.chapa.global/**');
  const providerUrl = new URL(checkout.url());
  // Stop before any payment interaction unless the provider itself confirms
  // its sandbox route and test-only payment control.
  expect(providerUrl.hostname).toBe('checkout.chapa.global');
  expect(providerUrl.pathname.startsWith('/test/'), 'Refusing a live-money checkout.').toBe(true);
  await checkout.getByText(/Test Bank Payment/i).first().click();
  const submitTestPayment = checkout.getByRole('button', { name: /^Pay using Test Mode$/i });
  await expect(submitTestPayment).toBeVisible();
  await checkout.getByPlaceholder(/Testing phone number/i).or(checkout.locator('#test-number')).first().fill('0911000000');
  await submitTestPayment.click();

  await expect(page.getByText("You're going!", { exact: true })).toBeVisible({ timeout: 240_000 });
  await expect.poll(() => proofs.find(proof => proof?.payment?.id === payment.id && proof.state === 'ready'), { timeout: 15_000 }).toBeDefined();
  const proof = proofs.find(value => value?.payment?.id === payment.id && value.state === 'ready')!;
  expect(proof.payment.order_id).toBe(payment.order_id);
  expect(proof.payment.status).toBe('succeeded');
  expect(proof.order.id).toBe(payment.order_id);
  expect(proof.order.status).toBe('fulfilled');
  await page.getByRole('button', { name: 'View My Ticket', exact: true }).click();
  await expect(page).toHaveURL(/\/tickets\/[^/?]+$/);
  const ticketId = decodeURIComponent(new URL(page.url()).pathname.split('/').pop()!);
  const issuedTicket = proof.tickets.find(ticket => ticket.id === ticketId);
  expect(issuedTicket, 'The displayed ticket must belong to this payment response.').toBeDefined();
  const credential = issuedTicket!.credentials.find(value => value.status === 'active' && value.qr_token);
  expect(issuedTicket!.status).toBe('active');
  expect(credential?.qr_token).toBeTruthy();
  await page.getByRole('button', { name: /Enlarge/ }).click();
  const qr = page.getByRole('region', { name: 'Enlarged ticket entry code' }).getByRole('img', { name: 'Ticket entry QR' });
  // Do not include the actual private credential in assertion diagnostics.
  await expect.poll(async () => (await decodeQr(qr)) === credential!.qr_token).toBe(true);
  await page.getByText('Tap anywhere to close', { exact: true }).click();
  await page.getByRole('button', { name: 'Close ticket', exact: true }).click();
  await page.reload();
  await expect(page.locator(`[data-ticket-id="${ticketId}"]`), 'The ticket must survive a fresh server wallet read.').toBeVisible();
});
