// Central API client for the digis_backend Rails API — backed by axios.
//
// Contract (verified against the running backend):
//  - No /api or /api/v1 prefix: paths are host-root, e.g. "auth/login".
//  - Auth via `Authorization: Bearer <access_token>`.
//  - Responses are wrapped: { success, message, data, pagination }.
//  - Errors are { success:false, error, code } (code is flat/top-level).
//  - Mutating requests require an `Idempotency-Key` header.
//
// Responsibilities living here:
//  - single axios instance (base URL, timeout, JSON)
//  - auth header + idempotency-key injection (request interceptor)
//  - transparent 401 → refresh → retry (response interceptor, single-flight)
//  - envelope unwrap → { data, pagination? } (apiFetch)
//
// Session reads/writes go through the session store (src/lib/session.ts) so a
// token rotation is immediately visible to AuthContext via useSyncExternalStore.

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getSession, setSession, clearSession, type Session } from '@/lib/session';
import { toApiError } from '@/lib/errors';
import { routeDevelopmentMedia } from '@/lib/dev-storage-routing';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export interface Pagination {
  current_page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/* ─── Request interceptor: auth header + idempotency key ─── */

/**
 * crypto.randomUUID is only defined in secure contexts (https or localhost).
 * The app is also opened over plain http via Vite's LAN URL (e.g. testing on
 * a phone), where it is undefined — fall back to an RFC 4122 v4 UUID built
 * from getRandomValues (still cryptographically random, no Math.random).
 */
function randomIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Caller-owned UUIDs (consent request_uuid, etc.) with the same
 * non-secure-context fallback as the idempotency keys above.
 */
export function randomUuid(): string {
  return randomIdempotencyKey();
}

type SessionRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean; _digisUserId?: string | null };

apiClient.interceptors.request.use((config: SessionRequestConfig) => {
  const session = getSession();
  if (config._digisUserId === undefined) config._digisUserId = session?.user.id ?? null;
  if (config._digisUserId !== (session?.user.id ?? null)) throw new Error('The account changed before this request could finish.');
  if (session?.access_token) {
    config.headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  const method = (config.method ?? 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !config.headers.has('Idempotency-Key')) {
    config.headers.set('Idempotency-Key', randomIdempotencyKey());
  }
  return config;
});

/* ─── 401 → refresh → retry (single-flight) ─── */

let refreshInFlight: { key: string; promise: Promise<string | null> } | null = null;

/**
 * Refresh the access token once and share the result across concurrent 401s.
 * On failure (revoked/expired refresh token) clears the session and returns null.
 */
async function getNewAccessToken(): Promise<string | null> {
  const session = getSession();
  if (!session) return null;
  const key = `${session.user.id}:${session.refresh_token}`;
  if (!refreshInFlight || refreshInFlight.key !== key) {
    const flight = { key, promise: doRefresh() };
    flight.promise = flight.promise.finally(() => { if (refreshInFlight === flight) refreshInFlight = null; });
    refreshInFlight = flight;
  }
  return refreshInFlight.promise;
}

async function doRefresh(): Promise<string | null> {
  const session = getSession();
  if (!session?.refresh_token) return null;
  try {
    // Plain axios (not apiClient) — public endpoint, must not re-enter the
    // response interceptor and risk an infinite 401 loop.
    const res = await axios.post<{
      data?: { access_token: string; refresh_token: string; user?: unknown };
    }>(`${BASE_URL}/auth/refresh`, { refresh_token: session.refresh_token });
    const current = getSession();
    if (!current || current.user.id !== session.user.id || current.refresh_token !== session.refresh_token) return null;
    const data = res.data?.data;
    if (data?.access_token && data?.refresh_token) {
      setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: (data.user ?? current.user) as Session['user'],
      });
      return data.access_token;
    }
    clearSession();
    return null;
  } catch (e) {
    // Only a definitive auth rejection signs the user out. A transient failure
    // (rate limit 429, 5xx, offline) must keep the stored session — otherwise a
    // momentary backend hiccup silently logs the user out on the next reload.
    const status = axios.isAxiosError(e) ? e.response?.status : undefined;
    const current = getSession();
    if ((status === 401 || status === 403) && current?.user.id === session.user.id && current.refresh_token === session.refresh_token) clearSession();
    return null;
  }
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const status = error.response?.status;
    const config = error.config as SessionRequestConfig | undefined;

    if (status === 401 && config && !config._retry && !(config.url ?? '').includes('/auth/refresh')) {
      if (!config._digisUserId || config._digisUserId !== getSession()?.user.id) return Promise.reject(error);
      config._retry = true;
      const token = await getNewAccessToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
        return apiClient(config);
      }
    }
    return Promise.reject(error);
  },
);

/* ─── Public interface (what deep modules call) ─── */

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON-serializable body; serialized automatically. */
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Call the backend and unwrap the envelope.
 * Returns `{ data, pagination? }` — `pagination` is present only for
 * paginated list endpoints. Throws a normalized `ApiError` on failure.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  try {
    const res = await apiClient.request<{
      success: boolean;
      message?: string;
      data?: T;
      pagination?: Pagination;
    }>({
      url: normalizePath(path),
      method: options.method ?? 'GET',
      data: options.body,
      headers: options.headers,
      signal: options.signal,
    });
    const body = res.data;
    return {
      data: import.meta.env.DEV && BASE_URL === '/__digis_api'
        ? routeDevelopmentMedia(body?.data as T)
        : (body?.data ?? undefined) as T,
      pagination: body?.pagination,
    };
  } catch (e) {
    throw toApiError(e);
  }
}

// Re-export for callers that want the normalized error type without importing errors.ts.
export { ApiError } from '@/lib/errors';
