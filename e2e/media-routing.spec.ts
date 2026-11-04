import { test, expect } from '@playwright/test';

test('seeded event images load through the page origin when direct backend access is blocked', async ({ page }) => {
  await page.route('http://localhost:3000/**', route => route.abort('blockedbyclient'));
  await page.goto('/events/addis-city-cup');
  await expect(page.getByRole('heading', { name: 'Addis City Cup', exact: true })).toBeVisible();
  const image = page.locator('img:visible').first();
  await expect(image).toHaveAttribute('src', /\/__digis_api\/rails\/active_storage\//);
  await expect.poll(() => image.evaluate(element => element instanceof HTMLImageElement ? element.naturalWidth : 0)).toBeGreaterThan(100);
  await page.getByRole('button', { name: /View .* venue profile/ }).click();
  const venueImage = page.getByRole('dialog').locator('img').first();
  await expect(venueImage).toHaveAttribute('src', /\/__digis_api\/rails\/active_storage\//);
  await expect.poll(() => venueImage.evaluate(element => element instanceof HTMLImageElement ? element.naturalWidth : 0)).toBeGreaterThan(100);
});
