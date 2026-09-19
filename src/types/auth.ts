/**
 * Auth wire contract — mirrors digis_backend (Core::UserAuthSerializer +
 * /auth endpoints).
 *
 * Backend user fields: `id, email, phone, verified_at, permissions, roles`.
 * There is NO `name` yet (BACKEND_GAPS.md #8) — the signup form collects it and
 * sends it, and the UI falls back to a derived display name (email local-part /
 * phone) until the backend persists and serializes it.
 *
 * Session shape (src/lib/session.ts): `{ access_token, refresh_token, user }`.
 */

export type AuthRole = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

export type AuthUser = {
  id: string;
  /** Server name when the backend provides one; else derived from email/phone. */
  name: string;
  email?: string;
  phone?: string;
  verified_at?: string;
  permissions: string[];
  roles: AuthRole[];
};

/** Raw user as the backend serializes it (Core::UserAuthSerializer). */
export type AuthUserWire = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  verified_at?: string | null;
  permissions?: string[] | null;
  roles?: Array<{ id: string; code: string; name: string; active: boolean }> | null;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
};

export type AuthErrorResponse = { ok: false; error: string; fieldErrors?: string[] };
export type AuthSuccessResponse<T = {}> = { ok: true; error?: never } & T;
export type AuthResult<T = {}> = AuthSuccessResponse<T> | AuthErrorResponse;

export type SignInRequest = { identifier: string; password: string };
export type SignInResponse = AuthResult<AuthSession>;

/** Signup is phone-first. Backend accepts email/phone + password. */
/**
 * POST /auth/signup body. Phone-first: phone is the identity, email is
 * optional (`Core::User` validates `email` with `allow_blank`), and the backend
 * validates `password_confirmation` — so we send the confirmation explicitly
 * instead of echoing the password. `name` is collected and sent; the backend
 * does not persist it yet (BACKEND_GAPS #8), so it is dropped server-side until
 * the `name` column / serializer field lands.
 */
export type SignUpRequest = {
  name: string;
  phone: string;
  email?: string;
  password: string;
  passwordConfirmation: string;
};
export type SignUpResponse = AuthResult<{ user: AuthUser }>;

export type MeResponse = AuthResult<{ user: AuthUser }>;
export type LogoutResponse = AuthResult<Record<string, never>>;
