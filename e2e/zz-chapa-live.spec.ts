import { test, expect, type Page } from '@playwright/test';

// TEMP: second clean verified buyer — Chapa test mode now enabled.
const BUYER_IDENTIFIER = '+251911000002';
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

test('fresh buyer reaches chapa hosted checkout', async ({ page }) => {
  test.setTimeout(120_000);
  const calls: string[] = [];
  page.on('response', async (res) => {
    if (/registrations|order_quotes|orders\/|payment_attempts/.test(res.url()) && res.request().method() === 'POST') {
      let body = '';
      try { body = JSON.stringify(await res.json()).slice(0, 300); } catch { body = `status ${res.status()}`; }
      calls.push(`${res.status()} POST ${res.url()} :: ${body}`);
    }
  });

  await loginThroughUi(page);
  await page.goto('/events/on-on');
  await expect(page.getByRole('heading', { name: 'Select Your Ticket' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('heading', { name: 'Regular' }).first().click();
  await page.getByRole('button', { name: /Buy Now/i }).click();
  await expect(page.getByText('Review', { exact: true }).first()).toBeVisible({ timeout: 10_000 });

  // Terms consent is its own box on the review step, below the order summary.
  const consentToggle = page.locator('[role="checkbox"]').first();
  await expect(consentToggle).toBeVisible({ timeout: 10_000 });
  await consentToggle.click();

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
  await page.screenshot({ path: 'test-results/chapa-redirect-outcome.png' });
  expect(redirected).toBe(true);
});
