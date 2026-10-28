import { test, expect } from '@playwright/test';

const MOCK_HOSTS = ['i.ibb.co', 'unsplash.com', 'pazimo.com', 'i.postimg.cc'];

test('runtime provenance audit - discovery + detail', async ({ page }) => {
  const catalog = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/public/events') && r.request().method() === 'GET');
  // ── Discovery ──
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Worth showing up for.' })).toBeVisible({ timeout: 15_000 });
  const response = await catalog;
  expect(response.ok(), 'Catalog must load before provenance can pass').toBe(true);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.data.length, 'Seeded catalog must contain real events').toBeGreaterThan(0);
  await expect(page.getByRole('heading', { name: body.data[0].title, exact: true }).first()).toBeVisible();

  const mockImgs = await page.evaluate((hosts) =>
    Array.from(document.querySelectorAll('img'))
      .map((i) => i.src)
      .filter((s) => s && !s.startsWith('data:') && hosts.some((h) => s.includes(h))),
    MOCK_HOSTS,
  );
  // Provenance assertion: no mock-host artwork may render on a live surface.
  expect(mockImgs, `mock-host images leaked: ${JSON.stringify(mockImgs.slice(0, 4))}`).toHaveLength(0);

  // ── Detail (deep link, forces fetchById) ──
  const detail = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/public/events/on-on'));
  await page.goto('/events/on-on');
  await expect(page.getByRole('heading', { name: 'On & On' })).toBeVisible({ timeout: 15_000 });
  expect((await detail).ok(), 'Event detail must come from a successful API response').toBe(true);
  const detailMockHost = await page.evaluate((hosts) =>
    Array.from(document.querySelectorAll('img'))
      .map((i) => i.src)
      .filter((s) => s && !s.startsWith('data:') && hosts.some((h) => s.includes(h))),
    MOCK_HOSTS,
  );
  expect(detailMockHost, `mock-host images leaked: ${JSON.stringify(detailMockHost.slice(0, 4))}`).toHaveLength(0);
});
