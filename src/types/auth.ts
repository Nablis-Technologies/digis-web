/**
 * Auth wire contract — mirrors digis_backend (Core::UserAuthSerializer +
 * /auth endpoints).
 *
 * Backend user fields: `id, email, phone, verified_at, permissions, roles`.
 * There is NO `name`, `photo`, or `provider` — `name` is derived client-side
 * (email local-part / phone) so the UI can keep showing a display name.
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
  /** Derived client-side from email/phone — the backend has no `name`. */
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
export type SignUpRequest = { phone: string; password: string };
export type SignUpResponse = AuthResult<{ user: AuthUser }>;

export type MeResponse = AuthResult<{ user: AuthUser }>;
export type LogoutResponse = AuthResult<Record<string, never>>;
