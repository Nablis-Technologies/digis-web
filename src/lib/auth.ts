/**
 * Auth module — owns the `/auth/*` HTTP contract against digis_backend.
 *
 * Backend contract (verified against the live API):
 *   - POST /auth/login    body { identifier, password } -> { user, access_token, refresh_token }
 *   - POST /auth/signup   body { user: { phone, password } } -> { user } (no tokens; auto-login)
 *   - GET  /auth/me       -> { user }
 *   - POST /auth/logout   body { refresh_token }
 *   - POST /auth/refresh  handled inside src/lib/api.ts (silent 401->refresh->retry)
 *
 * The backend is the source of truth for identity. There is NO OTP / Google /
 * password-reset / check-account surface — the UI is simplified to
 * identifier+password + direct signup.
 *
 * Session persistence lives in src/lib/session.ts (the single owner);
 * this module only maps wire <-> domain and does not touch localStorage.
 */

import axios from "axios";
import { apiFetch, ApiError, apiClient } from "@/lib/api";
import { mapApiError } from "@/lib/errors";
import { getSession } from "@/lib/session";
import type {
  AuthResult,
  AuthSession,
  AuthUser,
  AuthUserWire,
  MeResponse,
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  SignUpResponse,
  SignupOtpResponse,
  VerifySignupOtpResponse,
  UpdateProfileInput,
  UpdateProfileResponse,
  AvatarResponse,
  UserProfile,
} from "@/types/auth";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export interface AuthSessionWire {
  access_token: string;
  refresh_token: string;
  user: AuthUserWire;
}

/* ─── Wire -> domain mapping ─── */

/**
 * Display name: server full_name from profile when present, then wire.name,
 * else derived from email local-part / phone so the UI always has one.
 */
export function toAuthUser(wire: AuthUserWire): AuthUser {
  const email = wire.email ?? undefined;
  const phone = wire.phone ?? undefined;
  const profile: UserProfile | null = wire.profile
    ? {
        first_name: wire.profile.first_name || "",
        last_name: wire.profile.last_name || "",
        full_name:
          wire.profile.full_name && wire.profile.full_name !== `${wire.profile.first_name || ""} ${wire.profile.first_name || ""}`.trim()
            ? wire.profile.full_name
            : wire.profile.first_name === wire.profile.last_name
            ? wire.profile.first_name || ""
            : `${wire.profile.first_name || ""} ${wire.profile.last_name || ""}`.trim(),
        avatar_url: wire.profile.avatar_url ?? null,
      }
    : null;

  const name =
    profile?.full_name?.trim() ||
    wire.name?.trim() ||
    (email ? email.split("@")[0] : "") ||
    (phone ? phone.slice(-4) : "") ||
    "Member";

  return {
    id: wire.id,
    name,
    email,
    phone,
    verified_at: wire.verified_at ?? undefined,
    permissions: wire.permissions ?? [],
    roles: (wire.roles ?? []).map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      active: r.active,
    })),
    profile,
  };
}

function toSession(wire: AuthSessionWire): AuthSession {
  return { access_token: wire.access_token, refresh_token: wire.refresh_token, user: toAuthUser(wire.user) };
}

/* ─── The module ─── */

export const authService = {
  /** POST /auth/login — exchange identifier+password for a token pair + user. */
  async signIn(input: SignInRequest): Promise<SignInResponse> {
    try {
      const { data } = await apiFetch<AuthSessionWire>("/auth/login", {
        method: "POST",
        body: { identifier: input.identifier, password: input.password },
      });
      return { ok: true, ...toSession(data) };
    } catch (e) {
      return { ok: false, error: mapApiError(e) };
    }
  },

  /** POST /auth/signup/request_otp — initiate phone verification for account creation. */
  async requestSignupOtp(phone: string): Promise<SignupOtpResponse> {
    try {
      const { data } = await apiFetch<{ challenge_id: string; status: string; expires_at: string }>(
        "/auth/signup/request_otp",
        {
          method: "POST",
          body: { phone },
        },
      );
      return { ok: true, ...data };
    } catch (e) {
      return { ok: false, error: mapApiError(e) };
    }
  },

  /** POST /phone_verifications/:id/verify — trade 6-digit OTP code for signed verification_token. */
  async verifySignupOtp(challenge_id: string, code: string): Promise<VerifySignupOtpResponse> {
    try {
      const { data } = await apiFetch<{ verification_token: string; expires_at: string }>(
        `/phone_verifications/${challenge_id}/verify`,
        {
          method: "POST",
          body: { code },
        },
      );
      return { ok: true, ...data };
    } catch (e) {
      return { ok: false, error: mapApiError(e) };
    }
  },

  /** POST /auth/signup (G-14) — create the account with first_name & last_name.
   *  The backend returns user + access_token + refresh_token.
   *  Surfaces the backend's per-field errors alongside the friendly message. */
  async signUp(input: SignUpRequest): Promise<SignUpResponse> {
    try {
      const { data } = await apiFetch<AuthSessionWire>("/auth/signup", {
        method: "POST",
        body: {
          user: {
            first_name: input.firstName,
            last_name: input.lastName,
            phone: input.phone,
            ...(input.email ? { email: input.email } : {}),
            password: input.password,
            password_confirmation: input.passwordConfirmation,
          },
          verification_token: input.verification_token,
        },
      });
      return { ok: true, ...toSession(data) };
    } catch (e) {
      const fieldErrors = e instanceof ApiError ? e.fieldErrors : undefined;
      return { ok: false, error: mapApiError(e), fieldErrors };
    }
  },

  /** GET /user (G-14 breaking change: replaces retired GET /auth/me). Caller handles the session. */
  async me(): Promise<MeResponse> {
    try {
      // The backend returns { success: true, data: user }
      const res = await apiFetch<AuthUserWire | { user: AuthUserWire }>("/user");
      const rawUser = "user" in res.data ? res.data.user : res.data;
      return { ok: true, user: toAuthUser(rawUser) };
    } catch (e) {
      return { ok: false, error: mapApiError(e) };
    }
  },

  /** PATCH /user (G-14) — update first_name and/or last_name. */
  async updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResponse> {
    try {
      const res = await apiFetch<AuthUserWire | { user: AuthUserWire }>("/user", {
        method: "PATCH",
        body: {
          profile: {
            ...(input.first_name !== undefined ? { first_name: input.first_name } : {}),
            ...(input.last_name !== undefined ? { last_name: input.last_name } : {}),
          },
        },
      });
      const rawUser = "user" in res.data ? res.data.user : res.data;
      return { ok: true, user: toAuthUser(rawUser) };
    } catch (e) {
      const fieldErrors = e instanceof ApiError ? e.fieldErrors : undefined;
      return { ok: false, error: mapApiError(e), fieldErrors };
    }
  },

  /** PUT /user/avatar (G-47) — upload or replace user avatar image via multipart/form-data. */
  async uploadAvatar(file: File): Promise<AvatarResponse> {
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await apiClient.put<{ success: boolean; data: AuthUserWire }>("/user/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return { ok: true, user: toAuthUser(res.data.data) };
    } catch (e) {
      const fieldErrors = e instanceof ApiError ? e.fieldErrors : undefined;
      return { ok: false, error: mapApiError(e), fieldErrors };
    }
  },

  /** DELETE /user/avatar (G-47) — remove current user avatar (idempotent). */
  async removeAvatar(): Promise<AvatarResponse> {
    try {
      const { data } = await apiFetch<AuthUserWire>("/user/avatar", {
        method: "DELETE",
      });
      return { ok: true, user: toAuthUser(data) };
    } catch (e) {
      return { ok: false, error: mapApiError(e) };
    }
  },

  /**
   * Fetch authenticated avatar binary (GET /user/avatar) and return an Object URL blob.
   * Returns null if avatar is not found (404) or on error.
   */
  async getAvatarBlobUrl(etag?: string): Promise<{ url: string | null; etag?: string; notModified?: boolean }> {
    try {
      const res = await apiClient.get<Blob>("/user/avatar", {
        responseType: "blob",
        headers: etag ? { "If-None-Match": etag } : undefined,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 304 || status === 404,
      });

      if (res.status === 304) {
        return { url: null, notModified: true, etag };
      }
      if (res.status === 404) {
        return { url: null };
      }

      const newEtag = res.headers["etag"] as string | undefined;
      const objectUrl = URL.createObjectURL(res.data);
      return { url: objectUrl, etag: newEtag };
    } catch {
      return { url: null };
    }
  },

  /**
   * POST /auth/logout — server-side revoke of the refresh token.
   *
   * The backend requires authentication (`authentication_required` otherwise),
   * so the current access token is attached explicitly. Plain axios (not
   * apiFetch) is still used so an expired access token can't trigger the
   * refresh interceptor, which would rotate the refresh token before we
   * revoke it. Revocation is best-effort: on failure (e.g. expired access
   * token) the caller clears the session locally regardless.
   */
  async logout(): Promise<AuthResult> {
    const session = getSession();
    if (!session?.refresh_token) return { ok: true };
    try {
      await axios.post(
        `${BASE_URL}/auth/logout`,
        { refresh_token: session.refresh_token },
        {
          headers: session.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        },
      );
      return { ok: true };
    } catch {
      return { ok: true };
    }
  },
};
