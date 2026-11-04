import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * LIVE drill — audience gating (access code vs invitation) against the real
 * backend. Excluded from the default suite; run with:
 *
 *   $env:RUN_ZZ=1; npx playwright test e2e/zz-live-audience-gate.spec.ts
 *
 * It is self-contained: it logs in as the dev organizer, creates a fresh access
 * code + invitation for the seeded gated events, drives the UI, and deletes what
 * it created. Needs the dev backend up and the organizer managing the events.
 *
 * Events (probed 2026-10-01):
 *   psy-addis-saltland → code_or_invitation   (works with a code OR a token)
 *   origins-invitation → invitation           (token only; a code must fail)
 */

const API = 'http://localhost:3000';
const ORGANIZER = { identifier: '+251911000002', password: 'password123' };
const CODE_OR_INVITE = 'psy-addis-saltland';
const INVITE_ONLY = 'origins-invitation';

interface Target { eventId: string; productId: string; ticketTypeId: string; audience: string }

async function organizerToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: ORGANIZER });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).data.access_token as string;
}

async function gatedTarget(request: APIRequestContext, slug: string): Promise<Target> {
  const event = (await (await request.get(`${API}/public/events/${slug}`)).json()).data;
  const products = (await (await request.get(`${API}/public/events/${slug}/products`)).json()).data;
  const product = products.find(
    (p: { type: string; ticket_type: { audience: string } | null }) =>
      p.type === 'ticket' && p.ticket_type && p.ticket_type.audience !== 'public',
  );
  expect(product, `no gated ticket offer on ${slug}`).toBeTruthy();
  return { eventId: event.id, productId: product.id, ticketTypeId: product.ticket_type.id, audience: product.ticket_type.audience };
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Idempotency-Key': crypto.randomUUID() };
}

async function createAccessCode(request: APIRequestContext, token: string, t: Target, code: string): Promise<string> {
  const res = await request.post(
    `${API}/events/${t.eventId}/event_products/${t.productId}/ticket_type/access_codes`,
    { headers: authHeaders(token), data: { code, label: 'e2e drill', max_uses: 10, max_quantity_per_use: 5, active: true } },
  );
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()).data.id as string;
}

async function createInvitation(request: APIRequestContext, token: string, t: Target): Promise<{ id: string; token: string }> {
  const res = await request.post(
    `${API}/events/${t.eventId}/event_products/${t.productId}/ticket_type/invitations`,
    { headers: authHeaders(token), data: { email: `e2e-drill+${Date.now()}@example.com`, allowed_quantity: 1 } },
  );
  expect(res.ok(), await res.text()).toBeTruthy();
  const data = (await res.json()).data;
  return { id: data.id as string, token: data.token as string };
}

async function deleteAccessCode(request: APIRequestContext, token: string, t: Target, id: string) {
  await request.delete(`${API}/events/${t.eventId}/event_products/${t.productId}/ticket_type/access_codes/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function deleteInvitation(request: APIRequestContext, token: string, t: Target, id: string) {
  await request.delete(`${API}/events/${t.eventId}/event_products/${t.productId}/ticket_type/invitations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

test('access code unlocks a code_or_invitation offer', async ({ page, request }) => {
  test.setTimeout(60_000);
  const token = await organizerToken(request);
  const target = await gatedTarget(request, CODE_OR_INVITE);
  const code = `E2E-${Date.now()}`;
  const id = await createAccessCode(request, token, target, code);
  try {
    await page.goto(`/events/${CODE_OR_INVITE}`);
    await expect(page.getByText(/requires access/i).first()).toBeVisible({ timeout: 20_000 });
    await page.getByPlaceholder('Enter your code').fill(code);
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Select Your Ticket' })).toBeVisible({ timeout: 20_000 });
  } finally {
    await deleteAccessCode(request, token, target, id);
  }
});

test('invitation token unlocks a code_or_invitation offer', async ({ page, request }) => {
  test.setTimeout(60_000);
  const token = await organizerToken(request);
  const target = await gatedTarget(request, CODE_OR_INVITE);
  const invite = await createInvitation(request, token, target);
  try {
    await page.goto(`/events/${CODE_OR_INVITE}`);
    await page.getByPlaceholder('Enter your code').fill(invite.token);
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Select Your Ticket' })).toBeVisible({ timeout: 20_000 });
  } finally {
    await deleteInvitation(request, token, target, invite.id);
  }
});

test('invitation link auto-unlocks an invitation-only offer', async ({ page, request }) => {
  test.setTimeout(60_000);
  const token = await organizerToken(request);
  const target = await gatedTarget(request, INVITE_ONLY);
  const invite = await createInvitation(request, token, target);
  try {
    await page.goto(`/events/${INVITE_ONLY}?invitation=${invite.token}`);
    await expect(page.getByRole('heading', { name: 'Select Your Ticket' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Unlock', exact: true })).toHaveCount(0);
  } finally {
    await deleteInvitation(request, token, target, invite.id);
  }
});

test('invitation-only event shows the invite path, not a code box', async ({ page }) => {
  await page.goto(`/events/${INVITE_ONLY}`);
  await expect(page.getByText('Invite-only event', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/invitation link/i).first()).toBeVisible();
  // No code input: an access code can never open an invitation-only offer.
  await expect(page.getByPlaceholder('Enter your code')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Select Your Ticket' })).toHaveCount(0);
});
