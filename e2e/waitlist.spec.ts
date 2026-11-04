import { expect, test } from '@playwright/test';
import { apiPath, apiRoute } from './support/api';

for (const offerCount of [1, 2]) {
  test(`sold-out event with ${offerCount} waitlist offers enrolls the chosen offer after retry`, async ({ page }) => {
    const eventPath = '/public/events/waitlist-preview';
    const offers = Array.from({ length: offerCount }, (_, i) => ({
      id: `offer-${i + 1}`, name: `Admission ${i + 1}`, type: 'ticket', available: false,
      price_options: [{ currency: 'ETB', amount_minor: 50000, active_from: '2020-01-01T00:00:00Z' }],
      ticket_type: { id: `tier-${i + 1}`, audience: 'public', approval_mode: 'automatic', waitlist_enabled: true },
    }));
    const offerPath = `${eventPath}/admission_offers/offer-${offerCount}/waitlist`;
    let joins = 0;
    let verifications = 0;
    await page.route(apiRoute(), async route => {
      const path = apiPath(route.request().url());
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
      const reply = (data: unknown) => route.fulfill({ headers, json: { success: true, data } });
      if (route.request().method() === 'OPTIONS') return route.fulfill({ headers, status: 204 });
      if (path === eventPath) return reply({
        id: 'event-waitlist', slug: 'waitlist-preview', title: 'Waitlist event', currency: 'ETB', event_lifecycle: 'upcoming',
        ticket_availability: 'sold_out', event_dates: [{ id: 'date-1', starts_at: '2035-01-01T18:00:00Z', status: 'scheduled' }],
      });
      if (path === `${eventPath}/products`) return reply(offers);
      if (path === `${offerPath}/request_otp`) return reply({ challenge_id: 'challenge', status: 'pending' });
      if (path.endsWith('/phone_verifications/challenge/verify')) {
        verifications += 1;
        return reply({ verification_token: 'phone-proof' });
      }
      if (path === offerPath) {
        expect(route.request().postDataJSON().waitlist.verification_token).toBe('phone-proof');
        joins += 1;
        if (joins === 1) return route.fulfill({ headers, status: 503, json: { success: false, error: 'Try again' } });
        return reply({ registration: { id: 'registration', status: 'waitlisted' }, next_action: { type: 'waitlisted' } });
      }
      return route.fallback();
    });

    await page.goto('/events/waitlist-preview');
    const sheet = page.getByRole('dialog', { name: 'Ticket waitlist' });
    if (offerCount === 1) {
      await page.getByRole('button', { name: 'Join waitlist', exact: true }).last().click();
    } else {
      await page.getByRole('button', { name: 'View tiers' }).click();
      await expect(sheet).toHaveCount(0);
      await page.getByRole('button', { name: 'Join Waitlist', exact: true }).nth(1).click();
    }
    await sheet.getByPlaceholder('+251 9..').fill('+251911777888');
    await sheet.getByRole('button', { name: 'Send code' }).click();
    await sheet.getByLabel('Verification code').fill('123456');
    const join = sheet.getByRole('button', { name: 'Verify & join' });
    await join.click();
    await expect(sheet.getByRole('alert')).toBeVisible();
    await expect(sheet.getByText("You're on the waitlist")).toHaveCount(0);
    await sheet.getByRole('button', { name: 'Retry join' }).click();
    await expect(sheet.getByText("You're on the waitlist")).toBeVisible();
    expect(joins).toBe(2);
    expect(verifications).toBe(1);
  });
}
