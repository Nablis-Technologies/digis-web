import { createContext, useContext, useEffect, useMemo, ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { getSession, setSession, clearSession, subscribe, getSnapshot } from "@/lib/session";
import { authService, toAuthUser } from "@/lib/auth";
import type { AuthUser } from "@/types/auth";

export type Result = { ok: boolean; error?: string; fieldErrors?: string[] };

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  signIn: (identifier: string, password: string) => Promise<Result>;
  signUp: (data: { phone: string; password: string }) => Promise<Result>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribe, getSnapshot);
  const user = useMemo(() => (session ? toAuthUser(session.user) : null), [session]);
  const isAuthenticated = !!session?.access_token;

  useEffect(() => {
    if (!getSession()) return;
    let cancelled = false;
    authService.me().then((res) => {
      if (cancelled || !res.ok) return;
      const current = getSession();
      if (current) setSession({ ...current, user: res.user });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = async (identifier, password) => {
    const res = await authService.signIn({ identifier, password });
    if (!res.ok) return { ok: false, error: res.error };
    setSession({
      access_token: res.access_token,
      refresh_token: res.refresh_token,
      user: res.user,
    });
    return { ok: true };
  };

  const signUp: AuthContextValue["signUp"] = async (data) => {
    const up = await authService.signUp(data);
    if (!up.ok) {
      return {
        ok: false,
        error: up.error,
        fieldErrors: "fieldErrors" in up ? up.fieldErrors : undefined,
      };
    }
    const si = await authService.signIn({ identifier: data.phone, password: data.password });
    if (!si.ok) return { ok: false, error: si.error };
    setSession({
      access_token: si.access_token,
      refresh_token: si.refresh_token,
      user: si.user,
    });
    return { ok: true };
  };

  const signOut = async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}