import { test, expect } from '@playwright/test';

type ShowcaseProduct = {
  type: string;
  available: boolean;
  ticket_type?: { approval_mode?: string; resale_enabled?: boolean; transferable?: boolean; waitlist_enabled?: boolean };
};

test('a selected free public offer clearly offers RSVP', async ({ page }) => {
  await page.goto('/events/friends');
  await page.getByRole('heading', { name: 'Free Entry', exact: true }).click();
  await expect(page.getByRole('button', { name: 'RSVP', exact: true })).toBeVisible();
});

test('Pazimo RSVP exposes its public form and keeps the code-only offer gated', async ({ page }) => {
  await page.goto('/events/tempo-friday-rsvp');
  await expect(page.getByRole('heading', { name: 'Tempo Friday — RSVP', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Community Code RSVP', exact: true })).toHaveCount(0);
  await page.getByRole('heading', { name: 'Free RSVP', exact: true }).click();
  await expect(page.getByRole('button', { name: 'RSVP', exact: true })).toBeVisible();
  const products = (await (await page.request.get('/__digis_api/public/events/tempo-friday-rsvp/products')).json()).data;
  const offer = products.find((product: { name: string }) => product.name === 'Free RSVP');
  const schema = await page.request.get(`/__digis_api/public/events/tempo-friday-rsvp/ticket_types/${offer.ticket_type.id}/registration_schema`);
  expect(schema.ok()).toBe(true);
  const questions: { label: string; type: string }[] = (await schema.json()).data.forms.flatMap((form: { questions: { label: string; type: string }[] }) => form.questions);
  expect(questions.some(question => question.label === 'Age range')).toBe(true);
  expect(questions.some(question => question.type === 'multiple_choice')).toBe(true);
  expect(questions.some(question => question.type === 'date')).toBe(true);
  await page.getByPlaceholder('Enter your code').fill('TEMPO-COMMUNITY');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Community Code RSVP', exact: true })).toBeVisible();
});

test('real Pazimo RSVP checkout renders the published source questionnaire', async ({ page }) => {
  let submissions = 0;
  await page.route('**/public/events/tempo-friday-rsvp/admission_selections', route => {
    submissions++;
    return route.abort('blockedbyclient');
  });
  await page.goto('/events/tempo-friday-rsvp');
  await page.getByRole('heading', { name: 'Free RSVP', exact: true }).click();
  await page.getByRole('button', { name: 'RSVP', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Accept Showcase event terms', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByPlaceholder('Abebe').fill('Showcase Reviewer');
  await page.getByPlaceholder('+251 9 XX XXX XXX').fill('+251911777888');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('combobox', { name: /Age range/ })).toBeVisible();
  await expect(page.getByRole('combobox', { name: /How did you hear about Tempo Friday/ })).toBeVisible();
  await expect(page.getByRole('group', { name: /What kind of events do you usually attend/ })).toBeVisible();
  await expect(page.getByLabel(/Preferred follow-up date/)).toBeVisible();
  expect(submissions).toBe(0);
});

test('invitation-only RSVP requires a link and unlocks its free offer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ORIGINS', exact: true })).toBeVisible();
  await expect(page.getByText('Access Code Required', { exact: true })).toHaveCount(0);
  await page.goto('/events/origins-invitation');
  await expect(page.getByText('Invite-only event', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Enter your code')).toHaveCount(0);
  await page.goto('/events/origins-invitation?invitation=origins-rsvp-invite-0001');
  await page.getByRole('heading', { name: 'Invited Guest RSVP', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Regular', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'RSVP', exact: true })).toBeVisible();
});

for (const proof of ['code', 'invitation']) {
  test(`combined audience accepts its demo ${proof}`, async ({ page }) => {
    await page.goto(`/events/psy-addis-saltland${proof === 'invitation' ? '?invitation=saltland-invite-0001' : ''}`);
    if (proof === 'code') {
      await page.getByPlaceholder('Enter your code').fill('DRILL-CODE');
      await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    }
    await expect(page.getByRole('heading', { name: 'Regular', exact: true })).toBeVisible();
  });
}

test('live recurring showcase exposes selectable sessions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('RECURRING', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.goto('/events/thursday-jazz-sessions');
  const sessions = page.getByRole('radiogroup', { name: 'Session date' }).getByRole('radio');
  await expect(sessions).toHaveCount(7);
  await sessions.nth(1).click();
  await expect(sessions.nth(1)).toHaveAttribute('aria-checked', 'true');
});

test('live multi-day showcase renders passes and selectable days', async ({ page }) => {
  await page.goto('/events/addis-sound-festival-2026');
  await expect(page.getByRole('tablist', { name: 'Choose your days' })).toBeVisible();
  await expect(page.getByText('All 3 days', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Day 3/ }).click();
  await expect(page.getByRole('tab', { name: /Day 3/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Night Three Ticket', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Night One Ticket', exact: true })).toHaveCount(0);
});

test('live public catalog retains category and checkout capability diversity', async ({ page }) => {
  const products = async (slug: string): Promise<ShowcaseProduct[]> => {
    const response = await page.request.get(`/__digis_api/public/events/${slug}/products`);
    expect(response.ok()).toBe(true);
    return (await response.json()).data;
  };
  const workshop = await products('family-makers-workshop');
  expect(workshop.some(product => product.ticket_type?.approval_mode === 'manual')).toBe(true);
  expect(workshop.some(product => product.type === 'merchandise')).toBe(true);
  const tech = await products('addis-tech-forum');
  expect(tech.some(product => product.type === 'digital_addon')).toBe(true);
  const soldOut = await products('death-note-anime-convention');
  expect(soldOut.some(product => product.ticket_type?.waitlist_enabled === true && product.available === false)).toBe(true);
  const catalog = await page.request.get('/__digis_api/public/events?per_page=100');
  const body: { data: { categories: { name: string }[] }[] } = await catalog.json();
  const categories = new Set(body.data.flatMap(event => event.categories.map(category => category.name)));
  expect([...categories].sort()).toEqual(['Arts & Culture', 'Charity', 'Conference', 'Family & Kids', 'Food & Drink', 'Music', 'Networking', 'Sports', 'Workshop']);
  await page.goto('/events/death-note-anime-convention');
  await expect(page.getByRole('button', { name: /Join waitlist/i }).first()).toBeVisible();
});
