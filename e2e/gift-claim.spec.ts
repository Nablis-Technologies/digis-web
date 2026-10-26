import { test, expect } from '@playwright/test';
import type { ResolvedGiftView } from '../src/lib/gifts';

const gift: ResolvedGiftView = {
  gift: { id: 'gift-one', status: 'ready', expires_at: '2027-12-31T00:00:00Z', note: 'Enjoy the evening!' },
  event: { id: 'event-one', slug: 'gift-event', title: 'Gift Event' },
  product: { id: 'product-one', name: 'Admission', admissions_per_unit: 1 },
  forms: [], consents: [], ticket: null,
};

// Mock only the HTTP boundary; exercise the real router and claim page.
test('gift fragment is scrubbed and its capability is sent only in the resolve body', async ({ page }) => {
  let resolved = false;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/__digis_api/') && url.port !== '3000') return route.continue();
    const path = url.pathname.replace(/^\/__digis_api/, '');
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/public/gift_purchases/gift-one/resolve') {
      expect(route.request().url()).not.toContain('secret-gift');
      expect(route.request().postDataJSON()).toEqual({ gift: { token: 'secret-gift' } });
      expect(route.request().headers()['idempotency-key']).toBeTruthy();
      resolved = true;
      return route.fulfill({ headers, json: { success: true, data: gift } });
    }
    return route.fulfill({ headers, json: { success: true, data: [] } });
  });
  await page.goto('/#gift/gift-one?token=secret-gift');
  await expect(page.getByRole('heading', { name: /You received a gift/i })).toBeVisible();
  await expect(page).toHaveURL('http://localhost:5173/gift/gift-one');
  expect(resolved).toBe(true);
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage }, state: history.state }))).not.toContain('secret-gift');
  await page.reload();
  await expect(page.getByText('Open the original gift link to continue.')).toBeVisible();
});

test('recipient completes scoped questions and consent before the real ticket QR is shown', async ({ page }) => {
  const pending = {
    ...gift, gift: { ...gift.gift, status: 'ready' },
    forms: [{ id: 'form-v1', registration_form_id: 'form-1', name: 'Attendee details', version: 1, questions: [
      { id: 'q-name', key: 'full_name', type: 'short_text', response_scope: 'admission_slot', label: 'Attendee name', required: true, options: [], validation_rules: { max_length: 100 } },
      { id: 'q-meal', key: 'meal', type: 'single_choice', response_scope: 'registration', label: 'Meal', required: true, options: [{ key: 'veg', label: 'Vegetarian' }, { key: 'standard', label: 'Standard' }], validation_rules: {} },
      { id: 'q-notes', key: 'notes', type: 'long_text', response_scope: 'registration', label: 'Access notes', required: false, validation_rules: { max_length: 100 } },
      { id: 'q-support', key: 'support', type: 'checkbox', response_scope: 'registration', label: 'Accessibility support', required: false },
      { id: 'q-arrival', key: 'arrival', type: 'date', response_scope: 'registration', label: 'Arrival date', required: false, validation_rules: { min_date: '2026-01-01', max_date: '2028-01-01' } },
      { id: 'q-options', key: 'facilities', type: 'multiple_choice', response_scope: 'registration', label: 'Facilities', required: false, options: [{ key: 'lounge', label: 'Lounge' }, { key: 'terrace', label: 'Terrace' }], validation_rules: { max_items: 2 } },
    ] }],
    consents: [{ id: 'consent-v1', version: 1, title: 'Entry terms', body: 'Please bring your identification.', content_sha256: 'document-sha', required: true, acceptance_scope: 'admission_slot' }],
    pending_consents: [{ id: 'requirement-1', consent_document_version_id: 'consent-v1', acceptance_scope: 'admission_slot', package_unit_number: 1, admission_position: 1, required: true }],
    ticket: { id: 'ticket-one', status: 'pending', event_id: 'event-one', event_title: 'Gift Event', product_id: 'product-one', product_name: 'Admission', credential_status: 'pending', qr_token: null, lookup_code: null },
  };
  let claimBody: unknown;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/__digis_api/') && url.port !== '3000') return route.continue();
    const path = url.pathname.replace(/^\/__digis_api/, '');
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path.endsWith('/resolve')) return route.fulfill({ headers, json: { success: true, data: pending } });
    if (path.endsWith('/claim')) {
      claimBody = route.request().postDataJSON();
      expect(route.request().headers()['idempotency-key']).toBeTruthy();
      return route.fulfill({ headers, json: { success: true, data: { ...pending, gift: { ...pending.gift, status: 'claimed' }, pending_consents: [], ticket: { ...pending.ticket, status: 'active', credential_status: 'active', qr_token: 'digis:real-credential', lookup_code: 'TKT-1234' } } } });
    }
    return route.fulfill({ headers, json: { success: true, data: [] } });
  });
  if (process.env.GIFT_QA_THEME) await page.addInitScript(theme => localStorage.setItem('tiketa-theme', theme), process.env.GIFT_QA_THEME);
  await page.goto('/#gift/gift-one?token=secret-gift');
  await expect(page.getByRole('img', { name: 'Ticket QR code' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Claim my ticket', exact: true }).click();
  await expect(page.getByText('Enter Attendee name.')).toBeVisible();
  expect(claimBody).toBeUndefined();
  await page.getByLabel('Attendee name', { exact: false }).fill('Abebe Bikila');
  await page.getByLabel('Meal', { exact: false }).selectOption('veg');
  await page.getByLabel('Access notes', { exact: true }).fill('Step-free entry please');
  await page.getByLabel('Arrival date', { exact: true }).fill('2027-01-01');
  await page.getByRole('checkbox', { name: 'Lounge', exact: true }).check();
  await expect(page.getByText('Please bring your identification.')).toBeVisible();
  await page.getByRole('checkbox', { name: /I agree to Entry terms/ }).check();
  if (process.env.GIFT_QA_THEME) {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.screenshot({ path: `e2e/.screenshots/gift-form-${process.env.GIFT_QA_THEME}-${width}.png`, fullPage: true });
    }
  }
  await page.getByRole('button', { name: 'Claim my ticket', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your ticket is ready', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Ticket QR code' }).locator('svg')).toBeVisible();
  await expect(page.getByText('TKT-1234', { exact: true })).toBeVisible();
  await expect(page.getByText('digis:real-credential', { exact: true })).toHaveCount(0);
  expect(claimBody).toMatchObject({ gift: {
    token: 'secret-gift', answers: [
      { form_version_id: 'form-v1', question_key: 'full_name', value: 'Abebe Bikila', package_unit_number: 1, admission_position: 1 },
      { form_version_id: 'form-v1', question_key: 'meal', value: 'veg' },
      { form_version_id: 'form-v1', question_key: 'notes', value: 'Step-free entry please' },
      { form_version_id: 'form-v1', question_key: 'support', value: false },
      { form_version_id: 'form-v1', question_key: 'arrival', value: '2027-01-01' },
      { form_version_id: 'form-v1', question_key: 'facilities', value: ['lounge'] },
    ], consents: [{ consent_document_version_id: 'consent-v1', content_sha256: 'document-sha', package_unit_number: 1, admission_position: 1, acceptance_method: 'checkbox', request_uuid: expect.any(String), idempotency_key: expect.any(String) }],
  } });
});

for (const failure of ['resolve', 'claim', 'authentication'] as const) {
  test(`gift ${failure} failure has a working recovery`, async ({ page }) => {
    let fail = true;
    const attempts: { key?: string; body: unknown }[] = [];
    const user = { id: 'recipient', phone: '+251911000009', verified_at: '2026-01-01T00:00:00Z', profile: { full_name: 'Recipient' }, permissions: [], roles: [] };
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/__digis_api/') && url.port !== '3000') return route.continue();
      const path = url.pathname.replace(/^\/__digis_api/, '');
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (path === '/auth/login') return route.fulfill({ headers, json: { success: true, data: { access_token: 'signed-in', refresh_token: 'refresh', user } } });
      if (path === '/user') return route.fulfill({ headers, json: { success: true, data: user } });
      if (path.endsWith('/resolve')) {
        if (failure === 'resolve' && fail) return route.fulfill({ status: 503, headers, json: { success: false, error: 'Temporarily unavailable' } });
        expect(route.request().postDataJSON()).toEqual({ gift: { token: 'secret-gift' } });
        return route.fulfill({ headers, json: { success: true, data: gift } });
      }
      if (path.endsWith('/claim')) {
        attempts.push({ key: route.request().headers()['idempotency-key'], body: route.request().postDataJSON() });
        if (failure === 'authentication' && !route.request().headers().authorization) return route.fulfill({ status: 401, headers, json: { success: false, code: 'gift_recipient_authentication_required', error: 'Sign in required' } });
        if (failure === 'claim' && fail) return route.fulfill({ status: 503, headers, json: { success: false, error: 'Temporarily unavailable' } });
        return route.fulfill({ headers, json: { success: true, data: { ...gift, gift: { ...gift.gift, status: 'claimed' }, ticket: { id: 'ticket-one', status: 'active', credential_status: 'active', qr_token: 'real-code', lookup_code: 'TKT-1234' } } } });
      }
      return route.fulfill({ headers, json: { success: true, data: [] } });
    });
    // Legacy query links are scrubbed too; new links use fragments.
    await page.goto('/gift/gift-one?token=secret-gift');
    await expect(page).toHaveURL('http://localhost:5173/gift/gift-one');
    if (failure === 'resolve') {
      await expect(page.getByRole('alert')).toBeVisible(); fail = false;
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Claim my ticket', exact: true }).click();
    if (failure === 'claim') {
      await expect(page.getByRole('alert')).toBeVisible(); fail = false;
      await page.getByRole('button', { name: 'Claim my ticket', exact: true }).click();
    }
    if (failure === 'authentication') {
      await page.getByRole('button', { name: 'Sign in to claim', exact: true }).click();
      await expect(page).toHaveURL(/\/login$/);
      expect(await page.evaluate(() => JSON.stringify(history.state))).not.toContain('secret-gift');
      await page.getByPlaceholder('Phone number', { exact: true }).fill('+251911000009');
      await page.getByPlaceholder('Your password', { exact: true }).fill('password123');
      await page.getByRole('button', { name: 'Log in', exact: true }).last().click();
      await expect(page).toHaveURL('http://localhost:5173/gift/gift-one');
      await page.getByRole('button', { name: 'Claim my ticket', exact: true }).click();
    }
    await expect(page.getByRole('img', { name: 'Ticket QR code' })).toBeVisible();
    if (failure === 'claim') { expect(attempts).toHaveLength(2); expect(attempts[0]).toEqual(attempts[1]); }
  });
}

test('payer sees server gift delivery states and can request a resend without claiming delivery', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'buyer-token', refresh_token: 'buyer-refresh', user: { id: 'buyer', phone: '+251911000001', profile: { full_name: 'Gift Buyer' }, permissions: [], roles: [] } })));
  let resent = false;
  const statuses = [
    { id: 'gift-ready', status: 'ready', delivery_status: 'failed', expires_at: '2027-12-31T00:00:00Z', delivered_at: null, claimed_at: null },
    { id: 'gift-revoked', status: 'revoked', delivery_status: 'sent', expires_at: '2027-12-31T00:00:00Z', delivered_at: '2026-10-25T10:00:00Z', claimed_at: '2026-10-25T11:00:00Z' },
  ];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/__digis_api/') && url.port !== '3000') return route.continue();
    const path = url.pathname.replace(/^\/__digis_api/, '');
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/user') return route.fulfill({ headers, json: { success: true, data: { id: 'buyer', phone: '+251911000001', profile: { full_name: 'Gift Buyer' } } } });
    if (path.endsWith('/gift-ready/resend')) {
      expect(route.request().headers()['idempotency-key']).toBeTruthy();
      resent = true; statuses[0] = { ...statuses[0], delivery_status: 'pending' };
      return route.fulfill({ headers, json: { success: true, data: statuses[0] } });
    }
    return route.fulfill({ headers, json: { success: true, data: path === '/orders/order-one/gift_purchases' ? statuses : [] } });
  });
  await page.goto('/orders/order-one/gifts');
  await expect(page.getByRole('heading', { name: 'Gift delivery', exact: true })).toBeVisible();
  const ready = page.getByRole('article', { name: 'Gift gift-ready' });
  await expect(ready.getByText('Delivery failed', { exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Gift gift-revoked' }).getByRole('button', { name: 'Resend link' })).toHaveCount(0);
  await ready.getByRole('button', { name: 'Resend link', exact: true }).click();
  await expect(ready.getByText('Delivery pending', { exact: true })).toBeVisible();
  expect(resent).toBe(true);
  await page.reload();
  await expect(ready.getByText('Delivery pending', { exact: true })).toBeVisible();
});

test('gift checkout offers optional recipient email and validates it before continuing', async ({ page }) => {
  const buyer = { id: 'buyer', phone: '+251911000001', verified_at: '2026-01-01T00:00:00Z', profile: { full_name: 'Gift Buyer' }, permissions: [], roles: [] };
  await page.addInitScript(buyer => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'buyer-token', refresh_token: 'buyer-refresh', user: buyer })), buyer);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/__digis_api/') && url.port !== '3000') return route.continue();
    const path = url.pathname.replace(/^\/__digis_api/, '');
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let data: unknown = [];
    if (path === '/user') data = buyer;
    if (path === '/public/events/gift-event') data = { id: 'event-one', slug: 'gift-event', title: 'Gift Event', currency: 'ETB', event_dates_preview: [{ id: 'date-one', starts_at: '2027-01-01T18:00:00Z', ends_at: '2027-01-01T23:00:00Z' }] };
    if (path === '/public/events/gift-event/products') data = [{ id: 'product-one', event_id: 'event-one', name: 'General Admission', type: 'ticket', available: true, min_per_order: 1, max_per_order: 5, price_options: [{ currency: 'ETB', amount_minor: 10000, active_from: '2020-01-01T00:00:00Z', active_to: null }], ticket_type: { id: 'type-one', admissions_per_unit: 1, audience: 'public', date_selection: 'fixed' } }];
    return route.fulfill({ headers, json: { success: true, data } });
  });
  await page.goto('/events/gift-event');
  await page.getByRole('heading', { name: 'General Admission', exact: true }).click();
  await page.getByRole('button', { name: 'Gift this ticket', exact: true }).click();
  await expect(page.getByPlaceholder('friend@example.com')).toBeVisible();
  await page.getByPlaceholder('+251 91 123 4567', { exact: true }).fill('+251911999888');
  await page.getByPlaceholder('friend@example.com').fill('invalid-email');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('Enter a valid recipient email address.')).toBeVisible();
});

test('paid gift-only return confirms from server payment and order without a buyer wallet ticket', async ({ page }) => {
  const buyer = { id: 'buyer', phone: '+251911000001', profile: { full_name: 'Gift Buyer' }, permissions: [], roles: [] };
  await page.addInitScript(buyer => {
    localStorage.setItem('digis_session', JSON.stringify({ access_token: 'buyer-token', refresh_token: 'buyer-refresh', user: buyer }));
    sessionStorage.setItem('digis:awaiting-confirm', 'order-one');
    sessionStorage.setItem('digis:payment-id:order-one', 'payment-one');
    sessionStorage.setItem('digis:payment-event:order-one', 'event-one');
    sessionStorage.setItem('digis:gift-order:order-one', 'true');
  }, buyer);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/__digis_api/') && url.port !== '3000') return route.continue();
    const path = url.pathname.replace(/^\/__digis_api/, '');
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let data: unknown = [];
    if (path === '/user') data = buyer;
    if (path === '/payments/payment-one/refresh') data = { state: 'pending', payment: { id: 'payment-one', order_id: 'order-one', status: 'succeeded' }, order: { id: 'order-one', event_id: 'event-one', status: 'fulfilled' }, tickets: [] };
    if (path === '/orders/order-one/gift_purchases') data = [{ id: 'gift-one', status: 'ready', delivery_status: 'pending', expires_at: '2027-12-31T00:00:00Z', delivered_at: null, claimed_at: null }];
    return route.fulfill({ headers, json: { success: true, data } });
  });
  await page.goto('/?status=return');
  await expect(page).toHaveURL('http://localhost:5173/orders/order-one/gifts');
  await expect(page.getByText('Ready to claim', { exact: true })).toBeVisible();
  await expect(page.getByText('Delivery pending', { exact: true })).toBeVisible();
});

test('a consent-only continuation preserves existing answers and never exposes a pending QR', async ({ page }) => {
  let submitted: unknown;
  const pending = { ...gift, gift: { ...gift.gift, status: 'pending_recipient_consent' },
    forms: [{ id: 'form-v1', registration_form_id: 'form-one', name: 'Details', version: 1, questions: [{ id: 'name', key: 'full_name', type: 'short_text', response_scope: 'registration', required: true, label: 'Already submitted name' }] }],
    consents: [{ id: 'doc-v1', version: 1, title: 'Entry terms', body: 'Bring your identification.', content_sha256: 'hash-one', required: true, acceptance_scope: 'admission_slot' }],
    pending_consents: [{ id: 'requirement-one', consent_document_version_id: 'doc-v1', acceptance_scope: 'admission_slot', package_unit_number: 1, admission_position: 1, required: true }],
    ticket: { id: 'ticket-one', status: 'pending', credential_status: 'pending', qr_token: null },
  };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/__digis_api/') && url.port !== '3000') return route.continue();
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname.endsWith('/resolve')) return route.fulfill({ headers, json: { success: true, data: pending } });
    if (url.pathname.endsWith('/claim')) {
      submitted = route.request().postDataJSON();
      return route.fulfill({ headers, json: { success: true, data: { ...pending, gift: { ...pending.gift, status: 'claimed' }, ticket: { ...pending.ticket, status: 'active', credential_status: 'active', qr_token: 'entry-code' } } } });
    }
    return route.fulfill({ headers, json: { success: true, data: [] } });
  });
  await page.goto('/#gift/gift-one?token=secret-gift');
  await expect(page.getByRole('heading', { name: 'You received a gift', exact: true })).toBeVisible();
  await expect(page.getByLabel('Already submitted name', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Ticket QR code' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: /Entry terms/ }).check();
  await page.getByRole('button', { name: 'Claim my ticket' }).click();
  await expect(page.getByRole('img', { name: 'Ticket QR code' })).toBeVisible();
  expect(submitted).toMatchObject({ gift: { answers: [], consents: [{ consent_document_version_id: 'doc-v1', package_unit_number: 1, admission_position: 1 }] } });
});

test('malformed gift ids do not crash startup or retain bearer tokens in the URL', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#gift/%ZZ?token=secret-gift');
  await expect(page).toHaveURL('http://localhost:5173/gift/invalid');
  await expect(page.getByText('Open the original gift link to continue.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('guest paid gift return does not wait for a guest-wallet ticket', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('digis:awaiting-confirm', 'guest-order');
    sessionStorage.setItem('digis:payment-id:guest-order', 'guest-payment');
    sessionStorage.setItem('digis:payment-event:guest-order', 'event-one');
    sessionStorage.setItem('digis:gift-order:guest-order', 'true');
    sessionStorage.setItem('digis:guest:orderToken:guest-order', 'guest-access');
    sessionStorage.setItem('digis:guest:phone:guest-order', '+251911000009');
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/__digis_api/') && url.port !== '3000') return route.continue();
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const data = url.pathname.endsWith('/guest/payments/guest-payment/refresh')
      ? { state: 'pending', payment: { id: 'guest-payment', order_id: 'guest-order', status: 'succeeded' }, order: { id: 'guest-order', event_id: 'event-one', status: 'fulfilled' }, tickets: [] } : [];
    return route.fulfill({ headers, json: { success: true, data } });
  });
  await page.goto('/?status=return');
  await expect(page).toHaveURL('http://localhost:5173/orders/guest-order/gifts');
  await expect(page.getByText('Sign in with the purchasing account to view this order’s gifts.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', '/login');
});
