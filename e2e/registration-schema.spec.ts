import { test, expect, type Page } from '@playwright/test';
import { apiPath, apiRoute } from './support/api';

const buyer = { id: 'schema-buyer', phone: '+251911000001', profile: { full_name: 'Schema Buyer' }, roles: [], permissions: [] };
const question = (key: string, type: string, label: string, extra = {}) => ({ id: key, key, type, label, required: true, response_scope: 'registration', ...extra });
const schema = { event_id: 'schema-event', ticket_type_id: 'schema-type', forms: [
  { id: 'version-one', registration_form_id: 'form-one', form_name: 'Attendee preferences', version: 2, questions: [
    question('full_name', 'short_text', 'Attendee name', { validation_rules: { min_length: 3 } }),
    question('notes', 'long_text', 'Preparation notes'),
    question('arrival', 'single_choice', 'Arrival time', { options: [{ key: 'early', label: 'Before doors' }, { key: 'late', label: 'After doors' }], validation_rules: { allowed_option_keys: ['early'] } }),
    question('genres', 'multiple_choice', 'Music preferences', { options: [{ key: 'jazz', label: 'Jazz' }, { key: 'house', label: 'House' }], validation_rules: { min_items: 1, max_items: 1 } }),
    question('birth_date', 'date', 'Birth date', { validation_rules: { min_date: '1990-01-01', max_date: '2010-12-31' } }),
    question('updates', 'checkbox', 'Receive organizer updates'),
    question('dietary', 'short_text', 'Dietary needs', { response_scope: 'admission_slot', required: false }),
  ] },
  { id: 'version-two', registration_form_id: 'form-two', form_name: 'Booking details', version: 1, questions: [question('full_name', 'short_text', 'Booking name')] },
] };

async function setup(page: Page, readSchema: () => unknown = () => schema) {
  const submissions: unknown[] = [];
  await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'schema-token', refresh_token: 'schema-refresh', user })), buyer);
  await page.route(apiRoute(), async route => {
    const path = apiPath(route.request().url());
    if (path.endsWith('/registration_schema')) {
      const data = readSchema();
      if (data === 'unavailable') return route.fulfill({ status: 503, json: { success: false, error: 'Unavailable', code: 'service_unavailable' } });
      return route.fulfill({ json: { success: true, data } });
    }
    if (path === '/public/events/schema-event/admission_selections') {
      submissions.push(route.request().postDataJSON().admission_selection);
      return route.fulfill({ json: { success: true, data: { registrations: [], next_action: { type: 'awaiting_approval' } } } });
    }
    let data: unknown = [];
    if (path === '/user') data = buyer;
    if (path === '/public/events/schema-event') data = { id: 'schema-event', slug: 'schema-event', title: 'Published Registration', currency: 'ETB', event_dates_preview: [{ id: 'date-one', starts_at: '2030-08-01T18:00:00Z' }] };
    if (path === '/public/events/schema-event/products') data = [{ id: 'schema-product', name: 'Group Admission', type: 'ticket', available: true, min_per_order: 1, max_per_order: 5, price_options: [{ currency: 'ETB', amount_minor: 10000, active_from: '2000-01-01T00:00:00Z', active_to: null }], ticket_type: { id: 'schema-type', admissions_per_unit: 2, audience: 'public', date_selection: 'fixed' } }];
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/events/schema-event');
  await page.getByRole('heading', { name: 'Group Admission', exact: true }).click();
  await page.getByRole('button', { name: 'Buy Now', exact: true }).click();
  return submissions;
}

test('ordinary checkout renders published questions and submits each form version and attendee coordinate', async ({ page }) => {
  const submissions = await setup(page);
  await page.getByRole('button', { name: '+', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Attendee name (required)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Attendee name (required)', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  expect(submissions).toEqual([]);
  await page.getByLabel('Attendee name (required)', { exact: true }).fill('AB');
  await page.getByLabel('Preparation notes (required)', { exact: true }).fill('Arriving together');
  await expect(page.getByLabel('Arrival time (required)', { exact: true }).getByRole('option', { name: 'After doors' })).toHaveCount(0);
  await page.getByLabel('Arrival time (required)', { exact: true }).selectOption('early');
  await page.getByLabel('Jazz', { exact: true }).check();
  await page.getByLabel('House', { exact: true }).check();
  await page.getByLabel('Birth date (required)', { exact: true }).fill('2015-01-02');
  await page.getByLabel('Receive organizer updates (required)', { exact: true }).check();
  await page.getByLabel('Booking name (required)', { exact: true }).fill('Booking Guest');
  for (let unit = 1; unit <= 2; unit++) for (let position = 1; position <= 2; position++) {
    await page.getByLabel(`Dietary needs — Package ${unit}, attendee ${position}`, { exact: true }).fill(`Guest ${unit}-${position}`);
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('Use at least 3 characters.', { exact: true })).toBeVisible();
  await expect(page.getByText('Select no more than 1 options.', { exact: true })).toBeVisible();
  await expect(page.getByText('Choose a date within the allowed range.', { exact: true })).toBeVisible();
  expect(submissions).toEqual([]);
  await page.getByLabel('Attendee name (required)', { exact: true }).fill('Aster Guest');
  await page.getByLabel('House', { exact: true }).uncheck();
  await page.getByLabel('Birth date (required)', { exact: true }).fill('2000-01-02');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: /^Pay / }).click();
  await expect(page.getByRole('heading', { name: 'Submission received', exact: true })).toBeVisible();
  expect(submissions).toEqual([{ items: [{ event_product_id: 'schema-product', quantity: 2, consents: [], answers: [
    { form_version_id: 'version-one', question_key: 'full_name', value: 'Aster Guest' },
    { form_version_id: 'version-one', question_key: 'notes', value: 'Arriving together' },
    { form_version_id: 'version-one', question_key: 'arrival', value: 'early' },
    { form_version_id: 'version-one', question_key: 'genres', value: ['jazz'] },
    { form_version_id: 'version-one', question_key: 'birth_date', value: '2000-01-02' },
    { form_version_id: 'version-one', question_key: 'updates', value: true },
    { form_version_id: 'version-one', question_key: 'dietary', value: 'Guest 1-1', package_unit_number: 1, admission_position: 1 },
    { form_version_id: 'version-one', question_key: 'dietary', value: 'Guest 1-2', package_unit_number: 1, admission_position: 2 },
    { form_version_id: 'version-one', question_key: 'dietary', value: 'Guest 2-1', package_unit_number: 2, admission_position: 1 },
    { form_version_id: 'version-one', question_key: 'dietary', value: 'Guest 2-2', package_unit_number: 2, admission_position: 2 },
    { form_version_id: 'version-two', question_key: 'full_name', value: 'Booking Guest' },
  ] }], charge_currency: 'ETB' }]);
});

for (const failure of ['unavailable', 'malformed', 'unsupported required type']) {
  test(`organizer schema ${failure} blocks submission and offers a working retry`, async ({ page }) => {
    let recovered = false;
    const submissions = await setup(page, () => recovered ? { ...schema, forms: [] } : failure === 'unavailable' ? 'unavailable' : failure === 'malformed' ? [] : {
      ...schema, forms: [{ ...schema.forms[0], questions: [question('future_question', 'unknown_required_widget', 'Unavailable question')] }],
    });
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Retry questions', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: /^Pay / })).toHaveCount(0);
    expect(submissions).toEqual([]);
    recovered = true;
    await page.getByRole('button', { name: 'Retry questions', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: /^Pay / }).click();
    await expect(page.getByRole('heading', { name: 'Submission received', exact: true })).toBeVisible();
    expect(submissions).toEqual([{ items: [{ event_product_id: 'schema-product', quantity: 1, answers: [], consents: [] }], charge_currency: 'ETB' }]);
  });
}
