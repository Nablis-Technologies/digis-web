import { test, expect, type Page } from '@playwright/test';
import type { AuthUserWire } from '../src/types/auth';

const user: AuthUserWire = { id: 'profile-user', phone: '+251911000001', permissions: [], roles: [], profile: { first_name: 'አበበ', last_name: 'ቢቂላ', full_name: 'አበበ ቢቂላ', avatar_url: null } };

async function mockProfileApi(page: Page, signedIn = false, options: { rejectName?: boolean; avatar?: boolean; legacy?: boolean } = {}) {
  let currentUser: AuthUserWire = { ...user, profile: options.legacy ? null : { ...user.profile, avatar_url: options.avatar ? '/user/avatar' : null } };
  if (signedIn) await page.addInitScript(user => localStorage.setItem('digis_session', JSON.stringify({ access_token: 'profile-token', refresh_token: 'profile-refresh', user })), currentUser);
  const signups: unknown[] = [];
  const updates: unknown[] = [];
  const avatarReads: string[] = [];
  let avatarVersion = 'v1';
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (!url.pathname.startsWith('/__digis_api/') && url.port !== '3000') return route.continue();
    const path = url.pathname.replace(/^\/__digis_api/, '');
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    const reply = (data: unknown) => route.fulfill({ headers, json: { success: true, data } });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/user/avatar' && req.method() === 'PUT') {
      avatarVersion = 'v2';
      return reply(currentUser);
    }
    if (path === '/user/avatar' && req.method() === 'DELETE') {
      currentUser = { ...currentUser, profile: { ...currentUser.profile, avatar_url: null } };
      return reply(currentUser);
    }
    if (path === '/user/avatar') {
      avatarReads.push(avatarVersion);
      if (req.headers()['if-none-match'] === avatarVersion) return route.fulfill({ status: 304, headers });
      return route.fulfill({ headers: { ...headers, ETag: avatarVersion }, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv8sAAAAASUVORK5CYII=', 'base64') });
    }
    if (path === '/auth/signup/request_otp') return reply({ challenge_id: 'profile-challenge', status: 'pending', expires_at: '2099-01-01T00:00:00Z' });
    if (path === '/phone_verifications/profile-challenge/verify') return reply({ verification_token: 'profile-verification', expires_at: '2099-01-01T00:00:00Z' });
    if (path === '/auth/signup') {
      signups.push(req.postDataJSON());
      return reply({ user, access_token: 'profile-token', refresh_token: 'profile-refresh' });
    }
    if (path === '/user' && req.method() === 'PATCH') {
      updates.push(req.postDataJSON());
      if (options.rejectName) return route.fulfill({ status: 422, headers, json: { success: false, error: 'Validation failed', errors: { 'profile.last_name': ["can't be blank"] } } });
      currentUser = { ...user, profile: { ...user.profile, ...req.postDataJSON().profile, full_name: 'ከነኒሳ በቀለ' } };
      return reply(currentUser);
    }
    if (path === '/user') return reply(currentUser);
    return reply([]);
  });
  return { signups, updates, avatarReads };
}

test('signup preserves separate Unicode given and father names', async ({ page }) => {
  const { signups } = await mockProfileApi(page);
  await page.goto('/signup');
  await page.getByLabel('Given Name / ስም', { exact: true }).fill('አበበ');
  await page.getByLabel("Father's Name / የአባት ስም", { exact: true }).fill('ቢቂላ');
  await page.getByPlaceholder('Phone number', { exact: true }).fill('911000001');
  await page.getByPlaceholder('Create a password (min 8 chars)').fill('password123');
  await page.getByPlaceholder('Confirm your password').fill('password123');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByPlaceholder('••••••', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify & create account' }).click();
  await expect(page.getByText('Welcome to Digis')).toBeVisible();
  expect(signups).toHaveLength(1);
  expect(signups[0]).toMatchObject({ user: { first_name: 'አበበ', last_name: 'ቢቂላ' } });
});

test('avatar replacement refreshes private images even when its URL stays unchanged', async ({ page }) => {
  const { avatarReads } = await mockProfileApi(page, true, { avatar: true });
  await page.goto('/settings');
  const image = page.getByRole('img', { name: 'አበበ ቢቂላ', exact: true }).first();
  await expect(image).toBeVisible();
  const before = await image.getAttribute('src');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv8sAAAAASUVORK5CYII=', 'base64') });
  await expect.poll(async () => image.getAttribute('src')).not.toBe(before);
  expect(avatarReads).toContain('v2');
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('img', { name: 'አበበ ቢቂላ', exact: true })).toHaveCount(0);
});

test('profile validation hashes attach to the specific name field', async ({ page }) => {
  await mockProfileApi(page, true, { rejectName: true });
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  const father = page.getByLabel("Father's Name / የአባት ስም", { exact: true });
  await expect(father).toHaveAttribute('aria-invalid', 'true');
  await expect(father).toHaveAccessibleDescription(/can't be blank/);
});

test('profile editing requires both names and never duplicates the given name', async ({ page }) => {
  const { updates } = await mockProfileApi(page, true);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const father = page.getByLabel("Father's Name / የአባት ስም", { exact: true });
  await father.fill('');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(father).toHaveAttribute('aria-invalid', 'true');
  expect(updates).toHaveLength(0);
  await page.getByLabel('Given Name / ስም', { exact: true }).fill('ከነኒሳ');
  await father.fill('በቀለ');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('ከነኒሳ በቀለ', { exact: true }).first()).toBeVisible();
  expect(updates).toEqual([{ profile: { first_name: 'ከነኒሳ', last_name: 'በቀለ' } }]);
});

test('legacy accounts get a clear profile-completion path that disappears after saving', async ({ page }) => {
  await mockProfileApi(page, true, { legacy: true });
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Complete your profile', exact: true }).click();
  await expect(page).toHaveURL(/settings/);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Given Name / ስም', { exact: true }).fill('ከነኒሳ');
  await page.getByLabel("Father's Name / የአባት ስም", { exact: true }).fill('በቀለ');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Profile', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'ከነኒሳ በቀለ', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete your profile', exact: true })).toHaveCount(0);
});
