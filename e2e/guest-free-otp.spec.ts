import { test, expect, type Route, type Page } from '@playwright/test';

/**
 * Guest free-admission phone proof (composable admission selections).
 *
 * A $0 guest selection is refused by the backend with the 422
 * `phone_verification_required` error (Orders::AdmissionSelections::Create →
 * CheckoutDispatcher#require_guest_proof!). The UI must catch that code, send
 * an OTP, and re-submit the selection with the traded `verification_token` —
 * without leaving the checkout sheet.
 *
 * The seed has no free ticket product, so the selection/OTP/quote endpoints are
 * mocked at the network boundary with the exact wire shapes the backend
 * produces (verified against `digis_backend` @ 326f6a3); every other request
 * (event detail, products, auth) still hits the live dev backend.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function fulfillJson(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    headers: CORS,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function walkGuestToPayment(page: Page) {
  for (let i = 0; i < 6; i++) {
    const payNow = page.getByRole('button', { name: /^Pay .*/ });
    if (await payNow.count() > 0) break;
    const nameField = page.getByPlaceholder('Abebe Bekele');
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Free Guest');
      const emailField = page.getByPlaceholder('you@example.com');
      if (await emailField.isVisible().catch(() => false)) await emailField.fill('free-guest@example.com');
      const phoneField = page.getByPlaceholder('+251 9 XX XXX XXX');
      if (await phoneField.isVisible().catch(() => false)) await phoneField.fill('+251911777888');
    }
    const consentToggle = page.locator('[role="checkbox"]').first();
    if (await consentToggle.isVisible().catch(() => false)) {
      await consentToggle.click().catch(() => {});
    }
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.waitForTimeout(400);
  }
}

test('guest $0 admission completes through the inline OTP step', async ({ page }) => {
  test.setTimeout(90_000);

  let selectionCalls = 0;
  let verificationTokenSeen: string | undefined;

  await page.route('http://localhost:3000/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (request.method() === 'OPTIONS') return fulfillJson(route, 204, {});

    if (path === '/public/events/on-on/admission_selections') {
      selectionCalls += 1;
      const body = request.postDataJSON() as { admission_selection?: { verification_token?: string } };
      verificationTokenSeen = body?.admission_selection?.verification_token ?? verificationTokenSeen;
      if (selectionCalls === 1) {
        return fulfillJson(route, 422, {
          success: false,
          error: 'Phone verification required',
          code: 'phone_verification_required',
        });
      }
      return fulfillJson(route, 201, {
        success: true,
        data: { registrations: [], next_action: { type: 'confirmed' } },
      });
    }

    if (path.endsWith('/admission_selections/request_otp')) {
      return fulfillJson(route, 201, {
        success: true,
        data: { challenge_id: 'ch-1', status: 'pending', expires_at: '2026-09-30T12:10:00Z' },
      });
    }

    if (/\/phone_verifications\/[^/]+\/verify$/.test(path)) {
      return fulfillJson(route, 200, { success: true, data: { verification_token: 'vt-test' } });
    }

    if (path.endsWith('/order_quotes')) {
      return fulfillJson(route, 200, {
        success: true,
        data: {
          quote_token: 'quote-test',
          charge_currency: 'ETB',
          sales_channel: 'online',
          quoted_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 600_000).toISOString(),
          subtotal_minor: 0,
          discount_minor: 0,
          subsidy_total: 0,
          buyer_fee_total: 0,
          total_minor: 0,
          items: [],
        },
      });
    }

    return route.fallback();
  });

  await page.goto('/events/on-on');
  await expect(page.getByRole('heading', { name: 'Select Your Ticket' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('heading', { name: 'Regular' }).first().click();
  await page.getByRole('button', { name: /Buy Now/i }).click();
  await expect(page.getByText('Review', { exact: true }).first()).toBeVisible({ timeout: 10_000 });

  await walkGuestToPayment(page);
  await page.getByRole('button', { name: /^Pay .*/ }).click();

  // 422 phone_verification_required → the inline OTP step.
  await expect(page.getByText('Confirm your phone number')).toBeVisible({ timeout: 15_000 });
  await page.getByPlaceholder('6-digit code').fill('123456');
  await page.getByRole('button', { name: /Verify & continue/i }).click();

  // The re-submitted selection carries the traded proof and the order confirms.
  await expect(page.getByText("You're going!")).toBeVisible({ timeout: 15_000 });
  expect(verificationTokenSeen).toBe('vt-test');
  expect(selectionCalls).toBe(2);
});
