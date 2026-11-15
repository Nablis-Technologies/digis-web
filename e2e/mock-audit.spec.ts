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

  const mockImgs = await page.evaluate((hosts) =>
    Array.from(document.querySelectorAll('img'))
      .map((i) => i.src)
      .filter((s) => s && !s.startsWith('data:') && hosts.some((h) => s.includes(h))),
    MOCK_HOSTS,
  );
  // Provenance assertion: no mock-host artwork may render on a live surface.
  expect(mockImgs, `mock-host images leaked: ${JSON.stringify(mockImgs.slice(0, 4))}`).toHaveLength(0);

  // ── Detail (deep link, forces fetchById) ──
  apiCalls.length = 0;
  await page.goto('/events/on-on');
  await expect(page.getByRole('heading', { name: 'On & On' })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(2000);
  console.log('DETAIL API calls:', JSON.stringify(apiCalls));
  const detailMockHost = await page.evaluate((hosts) =>
    Array.from(document.querySelectorAll('img'))
      .map((i) => i.src)
      .filter((s) => s && !s.startsWith('data:') && hosts.some((h) => s.includes(h))),
    MOCK_HOSTS,
  );
  expect(detailMockHost, `mock-host images leaked: ${JSON.stringify(detailMockHost.slice(0, 4))}`).toHaveLength(0);
});
