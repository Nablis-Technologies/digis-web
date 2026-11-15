import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];
for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
  await page.setViewportSize(viewport);
  await page.goto('http://localhost:5173/events/thursday-jazz-sessions');
  await expect(page.getByRole('heading', {name:'Thursday Jazz Sessions',exact:true}).filter({visible:true})).toBeVisible();
  await expect(page.getByText('RECURRING',{exact:true}).filter({visible:true})).toBeVisible();
  const sessions = page.getByRole('radiogroup',{name:'Session date'}).getByRole('radio');
  await expect(sessions).toHaveCount(7);
  await sessions.nth(1).click();
  await expect(sessions.nth(1)).toHaveAttribute('aria-checked','true');
  results.push({width:viewport.width,recurringBadge:true,sessions:await sessions.count(),sessionSelection:true});
  if(viewport.width===390) {
    await page.getByText('RECURRING',{exact:true}).filter({visible:true}).scrollIntoViewIfNeeded();
    await page.getByText('RECURRING',{exact:true}).filter({visible:true}).evaluate(element => element.scrollIntoView({behavior:'instant',block:'center'}));
    await expect(page.getByText('RECURRING',{exact:true}).filter({visible:true})).toBeInViewport();
    await page.screenshot({path:'.scratch/showcase-data-2026-11-01/recurring-mobile.png'});
  }
}
await browser.close();
console.log(JSON.stringify(results,null,2));
