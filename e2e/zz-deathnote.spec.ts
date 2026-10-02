import { test, expect, type Page } from '@playwright/test';

// TEMP: gmail buyer + cheap ticket — full run to Chapa hosted payment.
const BUYER_IDENTIFIER = '+251900123456';
const BUYER_PASSWORD = 'password123';

async function loginThroughUi(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByPlaceholder('Phone number or email', { exact: true }).fill(BUYER_IDENTIFIER);
  await page.getByPlaceholder('Your password', { exact: true }).fill(BUYER_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).last().click();
  await expect(page.getByText('Welcome to Digis')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByPlaceholder('Phone number or email', { exact: true })).toBeHidden({ timeout: 15_000 });
}

test('gmail buyer buys convention pass and hits chapa', async ({ page }) => {
  test.setTimeout(120_000);
  const calls: string[] = [];
  page.on('response', async (res) => {
    if (/registrations|order_quotes|orders\/|payment_attempts/.test(res.url()) && res.request().method() === 'POST') {
      let body = '';
      try { body = JSON.stringify(await res.json()).slice(0, 250); } catch { body = `status ${res.status()}`; }
      calls.push(`${res.status()} POST ${res.url().split('/').slice(3).join('/')} :: ${body}`);
    }
  });

  await loginThroughUi(page);
  await page.goto('/events/death-note-anime-convention');
  await expect(page.getByRole('heading', { name: 'Select Your Ticket' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('heading', { name: 'Regular' }).first().click({ force: true });
  await page.getByRole('button', { name: /Buy Now/i }).click();
  await expect(page.getByText('Review', { exact: true }).first()).toBeVisible({ timeout: 10_000 });

  const consentToggle = page.locator('[role="checkbox"]').first();
  if (await consentToggle.count() > 0) {
    await expect(consentToggle).toBeVisible({ timeout: 10_000 });
    await consentToggle.click();
  }

  await page.getByRole('button', { name: /Continue/i }).click();
  const payNow = page.getByRole('button', { name: /^Pay .*/ });
  if (await payNow.count() === 0) {
    await page.getByRole('button', { name: /Continue/i }).click();
  }
  await expect(payNow).toBeEnabled({ timeout: 10_000 });
  await payNow.click();

  const redirected = await page
    .waitForURL(/chapa\.(co|global)/, { timeout: 30_000 })
    .then(() => true)
    .catch(() => false);

  console.log('CALLS:\n' + calls.join('\n'));
  console.log('REDIRECTED TO CHAPA:', redirected, 'URL:', page.url());
  await page.screenshot({ path: 'test-results/deathnote-outcome.png' });
});
