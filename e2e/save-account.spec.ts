import { test, expect } from '@playwright/test';
import { apiPath, apiRoute } from './support/api';
import { ACTIVE_TICKET } from './support/wallet';

const account = { id: 'saved-buyer', phone: '+251911000002', profile: { first_name: 'Saved', last_name: 'Buyer', full_name: 'Saved Buyer' }, roles: [], permissions: [] };

for (const theme of ['dark', 'light']) {
test(`saving a guest ticket uses shared auth fields and requires all six code digits (${theme})`, async ({ page }) => {
  let verified = 0;
  let otpRequests = 0;
  let claimed = false;
  let releaseClaim = () => {};
  const claimPending = new Promise<void>(resolve => { releaseClaim = resolve; });
  const ticket = { ...ACTIVE_TICKET, registration_id: 'guest-registration', ticket_view_token: 'synthetic-view-token' };
  await page.addInitScript(theme => {
    localStorage.setItem('tiketa-theme', theme);
    sessionStorage.setItem('digis:awaiting-confirm', 'guest-order');
    sessionStorage.setItem('digis:payment-id:guest-order', 'guest-payment');
    sessionStorage.setItem('digis:payment-event:guest-order', 'event-one');
    sessionStorage.setItem('digis:guest:quoteToken:guest-order', 'synthetic-quote');
    sessionStorage.setItem('digis:guest:phone:guest-order', '+251911000002');
  }, theme);
  await page.route(apiRoute(), async route => {
    const path = apiPath(route.request().url());
    let data: unknown = [];
    if (path === '/guest/payments/guest-payment/refresh') data = { state: 'ready', payment: { id: 'guest-payment', order_id: 'guest-order', status: 'succeeded' }, order: { id: 'guest-order', event_id: 'event-one', status: 'fulfilled' }, tickets: [ticket] };
    if (path === '/public/ticket_views/synthetic-view-token/request_otp') { otpRequests++; data = { challenge_id: 'claim-challenge', status: 'pending', expires_at: '2099-01-01T00:00:00Z' }; }
    if (path === '/phone_verifications/claim-challenge/verify') {
      verified++;
      if (route.request().postDataJSON().code === '111111') return route.fulfill({ status: 422, json: { success: false, code: 'code_invalid', error: 'That code is invalid.' } });
      data = { verification_token: 'synthetic-verification' };
    }
    if (path === '/registrations/guest-registration/claim_guest') { claimed = true; await claimPending; data = { access_token: 'claimed-token', refresh_token: 'claimed-refresh' }; }
    if (path === '/auth/login') data = { access_token: 'claimed-token', refresh_token: 'claimed-refresh', user: account };
    if (path === '/user') data = account;
    if (path === '/tickets') data = claimed ? [ticket] : [];
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'View My Ticket', exact: true }).click();
  await page.getByRole('button', { name: 'Save to my account', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Phone', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  const code = page.getByRole('textbox', { name: 'Verification code', exact: true });
  await expect(code).toBeFocused();
  await expect(code).toHaveAttribute('placeholder', '••••••');
  await code.fill('1234');
  await page.getByPlaceholder('At least 8 characters', { exact: true }).fill('password123');
  await page.getByPlaceholder('Repeat password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: /Show create a password/i }).click();
  await expect(page.getByPlaceholder('At least 8 characters', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: /Hide create a password/i }).click();
  await page.getByRole('button', { name: 'Claim my tickets', exact: true }).click();
  await expect(code).toHaveAttribute('aria-invalid', 'true');
  await expect(code).toHaveAccessibleDescription('Enter the 6-digit code we sent.');
  expect(verified).toBe(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: `.scratch/remaining-handoff-2026-11-01/claim-${theme}-desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `.scratch/remaining-handoff-2026-11-01/claim-${theme}-mobile.png` });
  await page.getByRole('button', { name: 'Resend code', exact: true }).click();
  await expect.poll(() => otpRequests).toBe(2);
  await expect(code).toHaveValue('');
  await code.fill('111111');
  await page.getByRole('button', { name: 'Claim my tickets', exact: true }).click();
  await expect(code).toHaveAttribute('aria-invalid', 'true');
  await expect(code).toHaveAccessibleDescription(/code/i);
  expect(claimed).toBe(false);
  await code.fill('123456');
  await page.getByRole('button', { name: 'Claim my tickets', exact: true }).click();
  await expect.poll(() => claimed).toBe(true);
  await expect(code).toBeDisabled();
  await expect(page.getByPlaceholder('At least 8 characters', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Close claim', exact: true })).toBeDisabled();
  releaseClaim();
  await expect(page.getByRole('dialog', { name: 'Save to my account', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Account menu', exact: true }).first()).toBeVisible();
  expect(claimed).toBe(true);
  expect(verified).toBe(2);
});

}

test('save-account recovers from a claim interruption without consuming proof twice', async ({ page }) => {
  let verified = 0;
  let otpRequests = 0;
  let claimed = false;
  let claimCalls = 0;
  let signInCalls = 0;
  const claimKeys: string[] = [];
  const ticket = { ...ACTIVE_TICKET, registration_id: 'guest-registration', ticket_view_token: 'synthetic-view-token' };
  await page.addInitScript(() => {
    sessionStorage.setItem('digis:awaiting-confirm', 'guest-order');
    sessionStorage.setItem('digis:payment-id:guest-order', 'guest-payment');
    sessionStorage.setItem('digis:payment-event:guest-order', 'event-one');
    sessionStorage.setItem('digis:guest:quoteToken:guest-order', 'synthetic-quote');
    sessionStorage.setItem('digis:guest:phone:guest-order', '+251911000002');
  });
  await page.route(apiRoute(), async route => {
    const path = apiPath(route.request().url());
    let data: unknown = [];
    if (path === '/guest/payments/guest-payment/refresh') data = { state: 'ready', payment: { id: 'guest-payment', order_id: 'guest-order', status: 'succeeded' }, order: { id: 'guest-order', event_id: 'event-one', status: 'fulfilled' }, tickets: [ticket] };
    if (path === '/public/ticket_views/synthetic-view-token/request_otp') { otpRequests++; data = { challenge_id: 'claim-challenge', status: 'pending', expires_at: '2099-01-01T00:00:00Z' }; }
    if (path === '/phone_verifications/claim-challenge/verify') {
      verified++;
      if (verified > 1) return route.fulfill({ status: 409, json: { success: false, code: 'verification_already_used', error: 'Code already used.' } });
      data = { verification_token: 'synthetic-verification' };
    }
    if (path === '/registrations/guest-registration/claim_guest') {
      claimCalls++; claimKeys.push(route.request().headers()['idempotency-key']);
      if ('claim' === 'claim' && claimCalls === 1) return route.fulfill({ status: 503, json: { success: false, code: 'service_unavailable', error: 'Please retry.' } });
      claimed = true; data = { access_token: 'claimed-token', refresh_token: 'claimed-refresh' };
    }
    if (path === '/auth/login') {
      signInCalls++;
      if ('claim' === 'sign-in' && signInCalls === 1) return route.fulfill({ status: 503, json: { success: false, code: 'service_unavailable', error: 'Please retry sign in.' } });
      data = { access_token: 'claimed-token', refresh_token: 'claimed-refresh', user: account };
    }
    if (path === '/user') data = account;
    if (path === '/tickets') data = claimed ? [ticket] : [];
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'View My Ticket', exact: true }).click();
  await page.getByRole('button', { name: 'Save to my account', exact: true }).click();
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Verification code', exact: true })).toBeFocused();
  await page.getByRole('textbox', { name: 'Verification code', exact: true }).fill('123456');
  await page.getByPlaceholder('At least 8 characters', { exact: true }).fill('password123');
  await page.getByPlaceholder('Repeat password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Claim my tickets', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Save to my account' }).getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Claim my tickets', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Save to my account' })).toBeHidden();
  expect(verified).toBe(1);
  expect(otpRequests).toBe(1);
  expect(claimCalls).toBe(2);
  expect(signInCalls).toBe(1);
  if (claimKeys.length > 1) expect(claimKeys[1]).toBe(claimKeys[0]);
});

test('save-account recovers from a sign-in interruption without consuming proof twice', async ({ page }) => {
  let verified = 0;
  let otpRequests = 0;
  let claimed = false;
  let claimCalls = 0;
  let signInCalls = 0;
  const claimKeys: string[] = [];
  const ticket = { ...ACTIVE_TICKET, registration_id: 'guest-registration', ticket_view_token: 'synthetic-view-token' };
  await page.addInitScript(() => {
    sessionStorage.setItem('digis:awaiting-confirm', 'guest-order');
    sessionStorage.setItem('digis:payment-id:guest-order', 'guest-payment');
    sessionStorage.setItem('digis:payment-event:guest-order', 'event-one');
    sessionStorage.setItem('digis:guest:quoteToken:guest-order', 'synthetic-quote');
    sessionStorage.setItem('digis:guest:phone:guest-order', '+251911000002');
  });
  await page.route(apiRoute(), async route => {
    const path = apiPath(route.request().url());
    let data: unknown = [];
    if (path === '/guest/payments/guest-payment/refresh') data = { state: 'ready', payment: { id: 'guest-payment', order_id: 'guest-order', status: 'succeeded' }, order: { id: 'guest-order', event_id: 'event-one', status: 'fulfilled' }, tickets: [ticket] };
    if (path === '/public/ticket_views/synthetic-view-token/request_otp') { otpRequests++; data = { challenge_id: 'claim-challenge', status: 'pending', expires_at: '2099-01-01T00:00:00Z' }; }
    if (path === '/phone_verifications/claim-challenge/verify') {
      verified++;
      if (verified > 1) return route.fulfill({ status: 409, json: { success: false, code: 'verification_already_used', error: 'Code already used.' } });
      data = { verification_token: 'synthetic-verification' };
    }
    if (path === '/registrations/guest-registration/claim_guest') {
      claimCalls++; claimKeys.push(route.request().headers()['idempotency-key']);
      if ('sign-in' === 'claim' && claimCalls === 1) return route.fulfill({ status: 503, json: { success: false, code: 'service_unavailable', error: 'Please retry.' } });
      claimed = true; data = { access_token: 'claimed-token', refresh_token: 'claimed-refresh' };
    }
    if (path === '/auth/login') {
      signInCalls++;
      if ('sign-in' === 'sign-in' && signInCalls === 1) return route.fulfill({ status: 503, json: { success: false, code: 'service_unavailable', error: 'Please retry sign in.' } });
      data = { access_token: 'claimed-token', refresh_token: 'claimed-refresh', user: account };
    }
    if (path === '/user') data = account;
    if (path === '/tickets') data = claimed ? [ticket] : [];
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'View My Ticket', exact: true }).click();
  await page.getByRole('button', { name: 'Save to my account', exact: true }).click();
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Verification code', exact: true })).toBeFocused();
  await page.getByRole('textbox', { name: 'Verification code', exact: true }).fill('123456');
  await page.getByPlaceholder('At least 8 characters', { exact: true }).fill('password123');
  await page.getByPlaceholder('Repeat password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Claim my tickets', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Save to my account' }).getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Retry sign in', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Save to my account' })).toBeHidden();
  expect(verified).toBe(1);
  expect(otpRequests).toBe(1);
  expect(claimCalls).toBe(1);
  expect(signInCalls).toBe(2);
  if (claimKeys.length > 1) expect(claimKeys[1]).toBe(claimKeys[0]);
});
