import { test, expect, type Page } from '@playwright/test';

const user = { id: 'respondent', phone: '+251911000001', profile: { full_name: 'Ticket Owner' }, permissions: [], roles: [] };
const walletTicket = {
  id: 'ticket-answers', status: 'active', unit_number: 1, admissions_per_unit_snapshot: 1,
  credential_mode: 'ticket', event: { id: 'event-answers', slug: 'answer-event', title: 'Answer Event', timezone: 'Africa/Addis_Ababa', currency: 'ETB' },
  product: { id: 'product-answers', name: 'Admission', type: 'ticket' }, ticket_type: null,
  event_dates: [{ id: 'date-answers', name: null, starts_at: '2027-12-30T16:00:00Z', ends_at: null, status: 'scheduled', venue: null }],
  admission_slots: [], credentials: [],
  registration_answers: { registration_id: 'registration-one', url: '/registrations/registration-one/answers', answers_editable_until: '2027-12-29T16:00:00Z' },
};
const nameAnswer = { id: 'answer-name', question_key: 'name', question_label: 'Attendee name', question_type: 'short_text',
  options: [], validation_rules: { min_length: 2, max_length: 100 }, response_scope: 'admission_slot', package_unit_number: 1,
  admission_position: 1, admission_slot_id: 'slot-one', editable: true, value: 'Original Name' };

async function setup(page: Page, options: { canEdit?: boolean; editable?: boolean; hasContext?: boolean; failRead?: boolean; failSave?: boolean; closedOnSave?: boolean; saveGate?: Promise<void>; secondAnswer?: boolean } = {}) {
  if (process.env.WALLET_QA_THEME) await page.addInitScript(theme => localStorage.setItem('tiketa-theme', theme), process.env.WALLET_QA_THEME);
  await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'answer-token', refresh_token: 'answer-refresh', user })), user);
  const requests: { body: unknown; key: string | undefined }[] = [];
  let value = 'Original Name';
  let readFailed = false;
  let saveFailed = false;
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (!url.pathname.startsWith('/__digis_api/') && url.port !== '3000') return route.continue();
    const path = url.pathname.replace(/^\/__digis_api/, '');
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    const reply = (data: unknown, status = 200) => route.fulfill({ status, headers, json: data });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/user') return reply({ success: true, data: user });
    if (path === '/tickets') return reply({ success: true, data: [{ ...walletTicket, ...(options.hasContext === false ? { registration_answers: null } : {}) }] });
    if (path === '/registrations/registration-one/answers') {
      if (options.failRead && !readFailed) { readFailed = true; return reply({ success: false, error: 'Try again', code: 'service_unavailable' }, 503); }
      return reply({ success: true, data: { registration_id: 'registration-one', answers_editable_until: '2027-12-29T16:00:00Z', can_edit_answers: options.canEdit ?? true,
        answers: [{ ...nameAnswer, editable: options.editable ?? true, value }, ...(options.secondAnswer ? [{ ...nameAnswer, id: 'second-answer', question_label: 'Second attendee' }] : []), { ...nameAnswer, id: 'erased-answer', question_label: 'Erased private answer', editable: false, value: undefined }] } });
    }
    if (path === '/registration_answers/answer-name/revise') {
      const body = req.postDataJSON();
      requests.push({ body, key: req.headers()['idempotency-key'] });
      await options.saveGate;
      if (options.closedOnSave) return reply({ success: false, error: 'Closed', code: 'correction_window_closed' }, 422);
      if (options.failSave && !saveFailed) { saveFailed = true; return reply({ success: false, error: 'Try again', code: 'service_unavailable' }, 503); }
      value = body.value;
      return reply({ success: true, data: { id: 'revision-one', registration_answer_id: 'answer-name', revision_number: 1, source: 'attendee_correction' } });
    }
    return reply({ success: true, data: [] });
  });
  await page.goto('/tickets/ticket-answers');
  return requests;
}

test('respondent reads and corrects a retained answer through the wallet', async ({ page }) => {
  const requests = await setup(page);
  await page.getByRole('button', { name: 'View registration answers' }).click();
  const dialog = page.getByRole('dialog', { name: 'Registration answers' });
  await expect(dialog.getByText('Original Name', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Erased private answer')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Edit Attendee name' }).click();
  if (process.env.WALLET_QA_THEME) {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: `e2e/.screenshots/wallet-answers-${process.env.WALLET_QA_THEME}-${width}.png`, fullPage: true });
    }
  }
  await dialog.getByLabel('Attendee name', { exact: true }).fill('Corrected Name');
  await dialog.getByRole('button', { name: 'Save answer', exact: true }).click();
  await expect(dialog.getByText('Answer saved.', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Corrected Name', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].body).toEqual({ value: 'Corrected Name', source: 'attendee_correction' });
  expect(requests[0].key).toMatch(/^[0-9a-f-]{36}$/);
});

test('saving an answer protects its draft and prevents switching editors', async ({ page }) => {
  let releaseSave = () => {};
  const saveGate = new Promise<void>(resolve => { releaseSave = resolve; });
  const requests = await setup(page, { saveGate, secondAnswer: true });
  await page.getByRole('button', { name: 'View registration answers' }).click();
  const dialog = page.getByRole('dialog', { name: 'Registration answers' });
  await dialog.getByRole('button', { name: 'Edit Attendee name', exact: true }).click();
  const input = dialog.getByLabel('Attendee name', { exact: true });
  await input.fill('Pending Name');
  await dialog.getByRole('button', { name: 'Save answer', exact: true }).click();
  try {
    await expect(input).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Edit Second attendee', exact: true })).toBeDisabled();
    expect(requests[0].body).toEqual({ value: 'Pending Name', source: 'attendee_correction' });
  } finally { releaseSave(); }
  await expect(dialog.getByText('Answer saved.', { exact: true })).toBeVisible();
});

for (const permission of ['collection', 'answer'] as const) {
  test(`${permission} edit permission can make retained answers read-only`, async ({ page }) => {
    const requests = await setup(page, permission === 'collection' ? { canEdit: false } : { editable: false });
    await page.getByRole('button', { name: 'View registration answers' }).click();
    const dialog = page.getByRole('dialog', { name: 'Registration answers' });
    await expect(dialog.getByText('Original Name', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Edit Attendee name' })).toHaveCount(0);
    expect(requests).toHaveLength(0);
  });
}

test('a transferred ticket without respondent context offers no answer access', async ({ page }) => {
  await setup(page, { hasContext: false });
  await expect(page.getByRole('button', { name: 'Close ticket' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View registration answers' })).toHaveCount(0);
});

test('answer read failure provides a working retry', async ({ page }) => {
  await setup(page, { failRead: true });
  await page.getByRole('button', { name: 'View registration answers' }).click();
  const dialog = page.getByRole('dialog', { name: 'Registration answers' });
  await dialog.getByRole('button', { name: 'Retry loading answers' }).click();
  await expect(dialog.getByText('Original Name', { exact: true })).toBeVisible();
});

test('a failed correction preserves the draft and retry identity', async ({ page }) => {
  const requests = await setup(page, { failSave: true });
  await page.getByRole('button', { name: 'View registration answers' }).click();
  const dialog = page.getByRole('dialog', { name: 'Registration answers' });
  await dialog.getByRole('button', { name: 'Edit Attendee name' }).click();
  const input = dialog.getByLabel('Attendee name', { exact: true });
  await input.fill('X');
  await dialog.getByRole('button', { name: 'Save answer', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('at least 2 characters');
  expect(requests).toHaveLength(0);
  await input.fill('Retry Name');
  await dialog.getByRole('button', { name: 'Save answer', exact: true }).click();
  await expect(input).toHaveValue('Retry Name');
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByRole('button', { name: 'Save answer', exact: true }).click();
  await expect(dialog.getByText('Answer saved.', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
});

test('server closure during correction blocks saving and provides a refresh', async ({ page }) => {
  const requests = await setup(page, { closedOnSave: true });
  await page.getByRole('button', { name: 'View registration answers' }).click();
  const dialog = page.getByRole('dialog', { name: 'Registration answers' });
  await dialog.getByRole('button', { name: 'Edit Attendee name' }).click();
  await dialog.getByLabel('Attendee name', { exact: true }).fill('Too Late');
  await dialog.getByRole('button', { name: 'Save answer', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('correction window has closed');
  await expect(dialog.getByRole('button', { name: 'Save answer', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Refresh answers' })).toBeVisible();
  expect(requests).toHaveLength(1);
});
