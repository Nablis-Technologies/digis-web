import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthSession, AuthUser, PendingVerification } from '@/types';
import { authKeys, authService, getStoredSession, setStoredSession } from '@/services/auth.service';

export type Result = { ok: boolean; error?: string; devCode?: string };

const readMockDevCode = () => { try { return sessionStorage.getItem('digis_mock_last_otp') || undefined; } catch { return undefined; } };

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  checkAccount: (identifier: string) => Promise<{ exists: boolean; isEmail: boolean; error?: string }>;
  signIn: (identifier: string, password: string) => Promise<Result>;
  startSignUp: (data: { name: string; phone: string; email?: string; password: string }) => Promise<Result>;
  signInWithGoogle: () => Promise<{ ok: boolean; needsPhone: boolean; error?: string }>;
  completeGooglePhone: (phone: string) => Promise<Result>;
  verifyOtp: (code: string) => Promise<Result>;
  resendOtp: () => Promise<Result>;
  requestPasswordReset: (identifier: string) => Promise<Result>;
  setNewPassword: (password: string) => Promise<Result>;
  updateProfile: (updates: { name?: string; email?: string; phone?: string; photo?: string | null }) => Promise<Result>;
  signOut: () => void;
  pendingIdentifier: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [pending, setPending] = useState<PendingVerification | null>(null);
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(null);
  const [phoneCompletionToken, setPhoneCompletionToken] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const updateProfileMutation = useMutation({
    mutationKey: ['auth', 'updateProfile'],
    mutationFn: authService.updateProfile,
    onSuccess: (res) => {
      if (res.ok) {
        const next = { token: res.token, user: res.user };
        establishSession(next);
        queryClient.setQueryData(authKeys.session, next);
        queryClient.setQueryData(authKeys.currentUser, res.user);
      }
    },
  });

  useEffect(() => {
    const saved = getStoredSession();
    if (saved?.token && saved.user) setSession(saved);
  }, []);

  const establishSession = (next: AuthSession) => {
    setStoredSession(next);
    setSession(next);
  };

  const checkAccount: AuthContextValue['checkAccount'] = async (identifier) => {
    const res = await authService.checkAccount({ identifier });
    if (!res.ok) return { exists: false, isEmail: false, error: res.error };
    return { exists: res.exists, isEmail: res.isEmail };
  };

  const signIn: AuthContextValue['signIn'] = async (identifier, password) => {
    const res = await authService.signIn({ identifier, password });
    if (res.ok) establishSession({ token: res.token, user: res.user });
    return { ok: res.ok, error: res.ok ? undefined : res.error };
  };

  const startSignUp: AuthContextValue['startSignUp'] = async (data) => {
    const res = await authService.startSignUp(data);
    if (res.ok) setPending(res.verification);
    return { ok: res.ok, error: res.ok ? undefined : res.error, devCode: res.ok ? readMockDevCode() : undefined };
  };

  const signInWithGoogle: AuthContextValue['signInWithGoogle'] = async () => {
    const res = await authService.signInWithGoogle({});
    if (!res.ok) return { ok: false, needsPhone: false, error: res.error };
    if (res.session) establishSession(res.session);
    if (res.phoneCompletionToken) setPhoneCompletionToken(res.phoneCompletionToken);
    return { ok: true, needsPhone: res.needsPhone };
  };

  const completeGooglePhone: AuthContextValue['completeGooglePhone'] = async (phone) => {
    if (!phoneCompletionToken) return { ok: false, error: 'Your session expired. Please start over.' };
    const res = await authService.completeGooglePhone({ phoneCompletionToken, phone });
    if (res.ok) { establishSession({ token: res.token, user: res.user }); setPhoneCompletionToken(null); }
    return { ok: res.ok, error: res.ok ? undefined : res.error };
  };

  const requestPasswordReset: AuthContextValue['requestPasswordReset'] = async (identifier) => {
    const res = await authService.requestPasswordReset({ identifier });
    if (res.ok) setPending(res.verification);
    return { ok: res.ok, error: res.ok ? undefined : res.error, devCode: res.ok ? readMockDevCode() : undefined };
  };

  const verifyOtp: AuthContextValue['verifyOtp'] = async (code) => {
    if (!pending) return { ok: false, error: 'Your session expired. Please start over.' };
    const res = await authService.verifyOtp({ verificationToken: pending.verificationToken, code });
    if (res.ok) {
      if (res.session) establishSession(res.session);
      if (res.passwordResetToken) setPasswordResetToken(res.passwordResetToken);
      setPending(null);
    }
    return { ok: res.ok, error: res.ok ? undefined : res.error };
  };

  const resendOtp: AuthContextValue['resendOtp'] = async () => {
    if (!pending) return { ok: false, error: 'Nothing to resend.' };
    const res = await authService.resendOtp({ verificationToken: pending.verificationToken });
    if (res.ok) setPending(res.verification);
    return { ok: res.ok, error: res.ok ? undefined : res.error, devCode: res.ok ? readMockDevCode() : undefined };
  };

  const setNewPassword: AuthContextValue['setNewPassword'] = async (password) => {
    if (!passwordResetToken) return { ok: false, error: 'Your session expired. Please start over.' };
    const res = await authService.setNewPassword({ passwordResetToken, password });
    if (res.ok) { establishSession({ token: res.token, user: res.user }); setPasswordResetToken(null); }
    return { ok: res.ok, error: res.ok ? undefined : res.error };
  };

  const updateProfile: AuthContextValue['updateProfile'] = async (updates) => {
    if (!session) return { ok: false, error: 'You need to be signed in.' };
    const res = await updateProfileMutation.mutateAsync({ token: session.token, updates });
    return { ok: res.ok, error: res.ok ? undefined : res.error };
  };

  const signOut = () => {
    setStoredSession(null);
    setSession(null);
    setPending(null);
    setPasswordResetToken(null);
    setPhoneCompletionToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        isAuthenticated: !!session?.token,
        checkAccount,
        signIn,
        startSignUp,
        signInWithGoogle,
        completeGooglePhone,
        verifyOtp,
        resendOtp,
        requestPasswordReset,
        setNewPassword,
        updateProfile,
        signOut,
        pendingIdentifier: pending?.identifier ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
