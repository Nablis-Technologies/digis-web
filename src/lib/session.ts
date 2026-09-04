/**
 * Session store — the single owner of the authenticated session.
 *
 * One source of truth for `{ access_token, refresh_token, user }`, persisted to
 * localStorage. Both `api.ts` (the axios refresh interceptor) and `AuthContext`
 * (via `useSyncExternalStore`) read and write through this module, so a token
 * rotation is visible to the UI immediately without any event wiring.
 *
 * `api.ts` stays React-free: it imports this module directly.
 */

import type { AuthUserWire } from '@/types/auth';

export interface Session {
  access_token: string;
  refresh_token: string;
  user: AuthUserWire;
}

const SESSION_KEY = 'digis_session';

let cached: Session | null | undefined = undefined;
const listeners = new Set<() => void>();

function read(): Session | null {
  if (cached !== undefined) return cached;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    cached = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cached = null;
  }
  return cached;
}

function persist(session: Session | null): void {
  cached = session;
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable — keep in-memory only */
  }
  listeners.forEach((l) => l());
}

/** Current session, or null when signed out. */
export function getSession(): Session | null {
  return read();
}

/** Persist a new session (e.g. after login, signup, or token refresh). */
export function setSession(session: Session): void {
  persist(session);
}

/** Clear the session (logout, refresh failure). */
export function clearSession(): void {
  persist(null);
}

/** React `useSyncExternalStore` snapshot — stable reference when unchanged. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React `useSyncExternalStore` snapshot getter. */
export function getSnapshot(): Session | null {
  return read();
}
