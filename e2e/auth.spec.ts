import { test, expect, type Page } from '@playwright/test';

/**
 * Auth e2e smoke — login, session persistence, invalid credentials, logout
 * (with server-side refresh-token revocation regression check), and signup.
 * Runs against the live backend (VITE_API_BASE_URL = http://localhost:3000)
 * and the dev server on :5173 (reused per playwright.config.ts).
 */

const API = 'http://localhost:3000';
const SESSION_KEY = 'digis_session';
const SEED_IDENTIFIER = '+251911000001'; // seeded admin (db/seeds/base.rb)
const SEED_PASSWORD = 'password123';

interface StoredSession {
  access_token: string;
  refresh_token: string;
  user: { id: string; phone?: string; email?: string };
}

async function getSession(page: Page): Promise<StoredSession | null> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY);
  return raw ? (JSON.parse(raw) as StoredSession) : null;
}

/** Open the auth modal and sign in through the real UI. */
async function loginThroughUi(page: Page, identifier = SEED_IDENTIFIER, password = SEED_PASSWORD) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  await page.getByPlaceholder('Phone number or email', { exact: true }).fill(identifier);
  await page.getByPlaceholder('Your password', { exact: true }).fill(password);
  // Two "Log in" buttons exist while the modal is open (TopBar + modal submit);
  // the modal is mounted last in the DOM, so .last() is the submit button.
  await page.getByRole('button', { name: 'Log in' }).last().click();
  // The success screen is visible for ~1.4s before the modal self-closes;
  // the signup+auto-login chain can take several seconds under a single
  // backend container, so allow a wide window (no fixed sleeps — still
  // event-driven, the 1.4s screen only closes after it appears).
  await expect(page.getByText('Welcome to Digis')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByPlaceholder('Phone number or email', { exact: true })).toBeHidden({
    timeout: 20_000,
  });
}

async function expectAuthenticated(page: Page) {
  const session = await getSession(page);
  expect(session?.access_token).toBeTruthy();
  expect(session?.refresh_token).toBeTruthy();
  // TopBar swaps the guest icon for the avatar and drops the "Log in" pill.
  // NOTE: the avatar is labelled "Account menu" (distinct from Navigation's
  // "Profile" pill). TopBar renders its triggers twice (desktop + mobile
  // cluster) — both DOM-present — so take the first (desktop) instance.
  await expect(page.locator('button[aria-label="Account menu"]').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toHaveCount(0);
}

test.describe('auth', () => {
  test('logs in with valid credentials', async ({ page }) => {
    await loginThroughUi(page);
    await expectAuthenticated(page);
  });

  test('session persists across reload', async ({ page }) => {
    await loginThroughUi(page);
    await page.reload();
    // Restored synchronously from localStorage, then revalidated via /auth/me.
    await expectAuthenticated(page);
  });

  test('invalid credentials show an error and store no session', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
    await page.getByPlaceholder('Phone number or email', { exact: true }).fill(SEED_IDENTIFIER);
    await page.getByPlaceholder('Your password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Log in' }).last().click();

    // The 401 round-trip can be slow under load; give it a wide window.
    await expect(page.getByText('Incorrect email/phone or password.')).toBeVisible({ timeout: 15_000 });
    expect(await getSession(page)).toBeNull();
  });

  test('logout clears the session and revokes the refresh token server-side', async ({
    page,
    request,
  }) => {
    await loginThroughUi(page);
    const before = await getSession(page);
    expect(before?.refresh_token).toBeTruthy();
    const refreshToken = before!.refresh_token;

    await page.goto('/settings');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

    // Regression check for the logout fix: the backend requires an
    // Authorization header, so assert the request actually carries it.
    const logoutRequest = page.waitForRequest((req) => req.url().includes('/auth/logout'));
    await page.getByRole('button', { name: 'Sign out' }).click();
    const req = await logoutRequest;
    expect(req.headers()['authorization']).toMatch(/^Bearer /);

    // clearSession runs after the async revoke round-trip — the "Log in"
    // pill reappearing proves the local session was dropped. (.first(): the
    // mobile Navigation bar's login button is DOM-present but CSS-hidden.)
    await expect(page.getByRole('button', { name: 'Log in' }).first()).toBeVisible({
      timeout: 10_000,
    });
    expect(await getSession(page)).toBeNull();

    // The revoked refresh token must no longer mint an access token.
    const res = await request.post(`${API}/auth/refresh`, {
      data: { refresh_token: refreshToken },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('signup creates an account and signs in', async ({ page }) => {
    // Must satisfy the backend's Ethiopian-mobile format (`+2519` + 8 digits,
    // enforced since BACKEND_GAPS #10) — a random but valid number.
    const phone = `+2519${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;

    await page.goto('/');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.getByRole('button', { name: "Don't have an account? Create one" }).click();
    // Wait for the signup form to fully swap in (AnimatePresence mode="wait"
    // keeps the exiting signin form mounted briefly — a substring match on
    // "Phone number" would hit the dying signin input instead).
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
    await page.getByPlaceholder('Phone number', { exact: true }).fill(phone);
    // Registration carries the identity fields the backend accepts: an optional
    // email plus an explicit password confirmation.
    await expect(page.getByPlaceholder('Email (optional)', { exact: true })).toBeVisible();
    await page.getByPlaceholder('Create a password (min 8 chars)', { exact: true }).fill('Test1234!');
    await page.getByPlaceholder('Confirm your password', { exact: true }).fill('Test1234!');
    await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled();
    await page.getByRole('button', { name: 'Create account' }).click();

    // signUp returns the user only; AuthContext auto-signs in with the same
    // credentials, so the success screen appears only after both round-trips.
    // The chain is slow (~5-10s) and the screen self-closes after 1.4s.
    await expect(page.getByText('Welcome to Digis')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByPlaceholder('Phone number', { exact: true })).toBeHidden({
      timeout: 25_000,
    });
    await expectAuthenticated(page);

    const session = await getSession(page);
    expect(session?.user.phone).toBe(phone);
  });
});
