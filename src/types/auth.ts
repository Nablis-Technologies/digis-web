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

export type UserProfile = {
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string | null;
};

export type UserProfileWire = {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

export type AuthUser = {
  id: string;
  /** Server name when the backend provides one; else derived from profile/email/phone. */
  name: string;
  email?: string;
  phone?: string;
  verified_at?: string;
  permissions: string[];
  roles: AuthRole[];
  profile?: UserProfile | null;
};

/** Raw user as the backend serializes it (Core::CurrentUserSerializer / Core::UserAuthSerializer). */
export type AuthUserWire = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  verified_at?: string | null;
  permissions?: string[] | null;
  roles?: Array<{ id: string; code: string; name: string; active: boolean }> | null;
  profile?: UserProfileWire | null;
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

export type SignupOtpRequest = { phone: string };
export type SignupOtpResponse = AuthResult<{
  challenge_id: string;
  status: string;
  expires_at: string;
}>;

export type VerifySignupOtpRequest = {
  challenge_id: string;
  code: string;
};
export type VerifySignupOtpResponse = AuthResult<{
  verification_token: string;
  expires_at: string;
}>;

/**
 * POST /auth/signup body (G-14). Phone-first with separate first_name and last_name,
 * and required OTP verification token.
 */
export type SignUpRequest = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  password: string;
  passwordConfirmation: string;
  verification_token: string;
};
export type SignUpResponse = AuthResult<AuthSession>;

export type UpdateProfileInput = {
  first_name?: string;
  last_name?: string;
};

export type UpdateProfileResponse = AuthResult<{ user: AuthUser }>;
export type AvatarResponse = AuthResult<{ user: AuthUser }>;

export type MeResponse = AuthResult<{ user: AuthUser }>;
export type LogoutResponse = AuthResult<Record<string, never>>;
