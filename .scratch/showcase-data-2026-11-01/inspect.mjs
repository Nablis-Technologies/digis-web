import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('http://localhost:5173/');
await page.getByRole('heading', { name: 'Anicon 2018', exact: true }).waitFor();
await page.locator('img:visible').first().waitFor();
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); } window.scrollTo(0, 0); });
await page.waitForFunction(() => [...document.images].filter(image => image.getBoundingClientRect().width > 0).every(image => image.complete && image.naturalWidth > 1));
await page.screenshot({ path: '.scratch/showcase-data-2026-11-01/catalog-desktop.png', fullPage: true });
await page.goto('http://localhost:5173/events/the-lab');
await page.getByRole('heading', { name: 'THE LAB', exact: true }).waitFor();
await page.waitForFunction(() => [...document.images].some(image => image.src.includes('active_storage') && image.complete && image.naturalWidth > 40));
await settleDetail(page);
await page.screenshot({ path: '.scratch/showcase-data-2026-11-01/the-lab-desktop.png' });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:5173/events/camping-to-coast');
await page.getByRole('heading', { name: 'Camping To Coast', exact: true }).waitFor();
await page.waitForFunction(() => [...document.images].some(image => image.src.includes('active_storage') && image.complete && image.naturalWidth > 40));
await settleDetail(page);
await page.screenshot({ path: '.scratch/showcase-data-2026-11-01/camping-mobile.png' });
await browser.close();
console.log('Captured catalog, THE LAB desktop and Camping To Coast mobile.');

async function settleDetail(page) { await page.waitForFunction(() => { let heading = document.querySelector('h1'); if (!heading) return false; while (heading) { if (Number(getComputedStyle(heading).opacity) < .99) return false; heading = heading.parentElement; } return [...document.images].filter(image => image.getBoundingClientRect().width > 0).every(image => image.complete && image.naturalWidth > 1); }); }
