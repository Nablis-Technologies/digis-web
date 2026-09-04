import { test, expect } from '@playwright/test';

const MOCK_HOSTS = ['i.ibb.co', 'unsplash.com', 'pazimo.com', 'i.postimg.cc'];

test('runtime provenance audit - discovery + detail', async ({ page }) => {
  const apiCalls: string[] = [];
  page.on('response', (r) => {
    if (r.url().includes(':3000') && r.url().includes('/public/')) {
      apiCalls.push(`${r.status()} ${r.url().replace('http://localhost:3000', '')}`);
    }
  });

  // ── Discovery ──
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Worth showing up for.' })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(2500);
  console.log('DISCOVERY API calls:', JSON.stringify(apiCalls));

  const cardImgs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('main img, img'))
      .map((i) => i.src)
      .filter((s) => s && !s.startsWith('data:'))
  );
  const backendImgs = cardImgs.filter((s) => s.includes('localhost:3000'));
  const mockImgs = cardImgs.filter((s) => MOCK_HOSTS.some((h) => s.includes(h)));
  console.log(`DISCOVERY images: ${cardImgs.length} total | backend: ${backendImgs.length} | mock-host: ${mockImgs.length}`);
  mockImgs.slice(0, 4).forEach((s) => console.log('  mock img:', s.slice(0, 90)));

  // ── Detail (deep link, forces fetchById) ──
  apiCalls.length = 0;
  await page.goto('/events/on-on');
  await expect(page.getByRole('heading', { name: 'On & On' })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(2000);
  console.log('DETAIL API calls:', JSON.stringify(apiCalls));
  const detailImgs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).map((i) => i.src).filter((s) => s && !s.startsWith('data:'))
  );
  console.log(`DETAIL images: ${detailImgs.length} total | backend: ${detailImgs.filter((s) => s.includes('localhost:3000')).length} | mock-host: ${detailImgs.filter((s) => MOCK_HOSTS.some((h) => s.includes(h))).length}`);
});
