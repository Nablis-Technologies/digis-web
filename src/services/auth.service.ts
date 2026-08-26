import type {
  AuthSession, AuthUser, CheckAccountRequest, CheckAccountResponse, CompleteGooglePhoneRequest,
  CompleteGooglePhoneResponse, GoogleSignInRequest, GoogleSignInResponse, PasswordResetRequest,
  PasswordResetResponse, PendingVerification, ResendOtpRequest, ResendOtpResponse, SetNewPasswordRequest,
  SetNewPasswordResponse, SignInRequest, SignInResponse, SignUpRequest, SignUpResponse,
  UpdateProfileRequest, UpdateProfileResponse, VerifyOtpRequest, VerifyOtpResponse,
} from '@/types/auth';

/**
 * MOCK auth API client. The exported function signatures and response shapes are
 * intended to be stable Rails JSON API contracts. When the Rails API exists,
 * replace only the internals of these functions with real HTTP calls; keep
 * AuthContext/components consuming the same camelCase service boundary.
 */

type StoredUser = AuthUser & { passwordHash?: string };
type StoredSession = AuthSession;
type PendingRecord = PendingVerification & { codeHash: string; draft?: StoredUser; resetIdentifier?: string };
type GooglePhoneRecord = { token: string; partialUser: StoredUser };

const USERS_KEY = 'digis_users';
const SESSION_KEY = 'digis_session';
const DEV_OTP_KEY = 'digis_mock_last_otp';
const pendingVerifications = new Map<string, PendingRecord>();
const googlePhoneCompletions = new Map<string, GooglePhoneRecord>();

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
export const isPhone = (v: string) => /^(\+251|0)?9\d{8}$/.test(v.replace(/\s/g, ''));
export const normPhone = (v: string) => v.replace(/\s/g, '');
const genId = () => `u_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
const genOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const genToken = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const devLogOtp = (purpose: string, identifier: string, code: string) => {
  try { sessionStorage.setItem(DEV_OTP_KEY, code); } catch {}
  console.info(`[Digis mock auth] ${purpose} OTP for ${identifier}: ${code}`);
};

async function sha256(value: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0;
  for (let i = 0; i < value.length; i++) h = Math.imul(31, h) + value.charCodeAt(i) | 0;
  return `fallback_${h}`;
}

function getStoredUsers(): StoredUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
}
function setStoredUsers(users: StoredUser[]): void { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
export function getStoredSession(): StoredSession | null {
  try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function setStoredSession(session: StoredSession | null): void {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

function matchUser(users: StoredUser[], identifier: string): StoredUser | undefined {
  const id = identifier.trim().toLowerCase();
  const phone = normPhone(identifier);
  return users.find((u) => (u.email && u.email.toLowerCase() === id) || (u.phone && u.phone === phone));
}
function publicUser(u: StoredUser): AuthUser {
  const { passwordHash, ...user } = u;
  return user;
}
function makeSession(user: StoredUser): AuthSession {
  return { token: genToken('mock_token'), user: publicUser(user) };
}
async function withPasswordHash(user: Omit<StoredUser, 'passwordHash'>, password: string): Promise<StoredUser> {
  return { ...user, passwordHash: await sha256(password) };
}

export const authService = {
  async checkAccount(input: CheckAccountRequest): Promise<CheckAccountResponse> {
    await wait(650);
    const value = input.identifier.trim();
    const email = isEmail(value);
    if (!email && !isPhone(value)) return { ok: false, error: 'Enter a valid phone number or email.' };
    const inStore = !!matchUser(getStoredUsers(), value);
    const byRule = email && value.toLowerCase().startsWith('a');
    return { ok: true, exists: inStore || byRule, isEmail: email };
  },

  async signIn(input: SignInRequest): Promise<SignInResponse> {
    await wait(700);
    if (!input.password) return { ok: false, error: 'Please enter your password.' };
    const users = getStoredUsers();
    let found = matchUser(users, input.identifier);
    if (found) {
      if (found.provider === 'google') return { ok: false, error: 'This account uses Google sign-in. Continue with Google.' };
      const passwordHash = await sha256(input.password);
      if (!found.passwordHash) {
        const legacy = found as StoredUser & { password?: string };
        if (legacy.password !== input.password) return { ok: false, error: 'Incorrect password. Please try again.' };
        found.passwordHash = passwordHash;
        delete legacy.password;
        setStoredUsers(users);
      } else if (found.passwordHash !== passwordHash) return { ok: false, error: 'Incorrect password. Please try again.' };
      return { ok: true, ...makeSession(found) };
    }
    if (isEmail(input.identifier) && input.identifier.trim().toLowerCase().startsWith('a')) {
      found = await withPasswordHash({ id: genId(), name: input.identifier.split('@')[0], email: input.identifier.trim(), provider: 'password' }, input.password);
      setStoredUsers([...users, found]);
      return { ok: true, ...makeSession(found) };
    }
    return { ok: false, error: 'No account found. Please sign up instead.' };
  },

  async startSignUp(input: SignUpRequest): Promise<SignUpResponse> {
    await wait(700);
    if (!input.name.trim() || input.name.trim().length < 2) return { ok: false, error: 'Please enter your name.' };
    if (!isPhone(input.phone)) return { ok: false, error: 'Enter a valid Ethiopian phone number.' };
    if (input.email && !isEmail(input.email)) return { ok: false, error: 'Enter a valid email, or leave it blank.' };
    if (input.password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    const users = getStoredUsers();
    if (matchUser(users, input.phone) || (input.email && matchUser(users, input.email))) return { ok: false, error: 'An account with this contact already exists. Sign in instead.' };
    const draft = await withPasswordHash({ id: genId(), name: input.name.trim(), phone: normPhone(input.phone), email: input.email ? input.email.trim() : undefined, provider: 'password' }, input.password);
    const code = genOtp();
    const verification: PendingVerification = { verificationToken: genToken('mock_verification'), identifier: normPhone(input.phone), purpose: 'signup' };
    pendingVerifications.set(verification.verificationToken, { ...verification, codeHash: await sha256(code), draft });
    devLogOtp('signup', verification.identifier, code);
    return { ok: true, verification };
  },

  async signInWithGoogle(_input: GoogleSignInRequest = {}): Promise<GoogleSignInResponse> {
    await wait(900);
    const email = 'you@gmail.com';
    const found = matchUser(getStoredUsers(), email);
    if (found && found.phone) return { ok: true, needsPhone: false, ...makeSession(found) };
    const partialUser = found ?? { id: genId(), name: 'Google User', email, provider: 'google' as const };
    const token = genToken('mock_google_phone');
    googlePhoneCompletions.set(token, { token, partialUser });
    return { ok: true, needsPhone: true, phoneCompletionToken: token };
  },

  async completeGooglePhone(input: CompleteGooglePhoneRequest): Promise<CompleteGooglePhoneResponse> {
    await wait(700);
    const pending = googlePhoneCompletions.get(input.phoneCompletionToken);
    if (!pending) return { ok: false, error: 'Your session expired. Please start over.' };
    if (!isPhone(input.phone)) return { ok: false, error: 'Enter a valid Ethiopian phone number.' };
    const users = getStoredUsers();
    if (matchUser(users, input.phone)) return { ok: false, error: 'That phone number is already linked to another account.' };
    const finalUser: StoredUser = { ...pending.partialUser, phone: normPhone(input.phone) };
    const idx = users.findIndex((u) => u.id === finalUser.id);
    if (idx >= 0) users[idx] = finalUser; else users.push(finalUser);
    setStoredUsers(users);
    googlePhoneCompletions.delete(input.phoneCompletionToken);
    return { ok: true, ...makeSession(finalUser) };
  },

  async requestPasswordReset(input: PasswordResetRequest): Promise<PasswordResetResponse> {
    await wait(700);
    if (!isEmail(input.identifier) && !isPhone(input.identifier)) return { ok: false, error: 'Enter a valid phone number or email.' };
    const code = genOtp();
    const verification: PendingVerification = { verificationToken: genToken('mock_verification'), identifier: input.identifier, purpose: 'password_reset' };
    pendingVerifications.set(verification.verificationToken, { ...verification, codeHash: await sha256(code), resetIdentifier: input.identifier });
    devLogOtp('password reset', input.identifier, code);
    return { ok: true, verification };
  },

  async verifyOtp(input: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    await wait(600);
    const pending = pendingVerifications.get(input.verificationToken);
    if (!pending) return { ok: false, error: 'Your session expired. Please start over.' };
    if (await sha256(input.code.trim()) !== pending.codeHash) return { ok: false, error: 'That code is incorrect. Please try again.' };
    pendingVerifications.delete(input.verificationToken);
    if (pending.purpose === 'signup' && pending.draft) {
      setStoredUsers([...getStoredUsers(), pending.draft]);
      return { ok: true, session: makeSession(pending.draft) };
    }
    return { ok: true, passwordResetToken: genToken(`mock_reset_${encodeURIComponent(pending.resetIdentifier || pending.identifier)}`) };
  },

  async resendOtp(input: ResendOtpRequest): Promise<ResendOtpResponse> {
    await wait(500);
    const pending = pendingVerifications.get(input.verificationToken);
    if (!pending) return { ok: false, error: 'Nothing to resend.' };
    const code = genOtp();
    pending.codeHash = await sha256(code);
    pendingVerifications.set(input.verificationToken, pending);
    devLogOtp(pending.purpose, pending.identifier, code);
    return { ok: true, verification: { verificationToken: pending.verificationToken, identifier: pending.identifier, purpose: pending.purpose } };
  },

  async updateProfile(input: UpdateProfileRequest): Promise<UpdateProfileResponse> {
    await wait(550);
    const session = getStoredSession();
    if (!session || session.token !== input.token) return { ok: false, error: 'You need to be signed in.' };
    const updates = input.updates;
    const name = updates.name !== undefined ? updates.name.trim() : undefined;
    const email = updates.email !== undefined ? updates.email.trim() : undefined;
    const phone = updates.phone !== undefined ? normPhone(updates.phone) : undefined;
    if (name !== undefined && name.length < 2) return { ok: false, error: 'Please enter your name (at least 2 characters).' };
    if (email && !isEmail(email)) return { ok: false, error: 'Enter a valid email, or leave it blank.' };
    if (phone && !isPhone(phone)) return { ok: false, error: 'Enter a valid Ethiopian phone number, or leave it blank.' };
    const users = getStoredUsers();
    if (email && users.some((u) => u.id !== session.user.id && u.email?.toLowerCase() === email.toLowerCase())) return { ok: false, error: 'That email is already linked to another account.' };
    if (phone && users.some((u) => u.id !== session.user.id && u.phone === phone)) return { ok: false, error: 'That phone number is already linked to another account.' };
    const merged: AuthUser = { ...session.user, ...(name !== undefined ? { name } : {}), ...(email !== undefined ? { email: email || undefined } : {}), ...(phone !== undefined ? { phone: phone || undefined } : {}), ...(updates.photo !== undefined ? { photo: updates.photo ?? undefined } : {}) };
    const idx = users.findIndex((u) => u.id === session.user.id);
    if (idx >= 0) { users[idx] = { ...users[idx], ...merged }; setStoredUsers(users); }
    return { ok: true, token: input.token, user: merged };
  },

  async setNewPassword(input: SetNewPasswordRequest): Promise<SetNewPasswordResponse> {
    await wait(700);
    const identifier = input.passwordResetToken.match(/^mock_reset_(.+?)_\d+_/)?.[1];
    if (!identifier) return { ok: false, error: 'Your session expired. Please start over.' };
    if (input.password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    const resetIdentifier = decodeURIComponent(identifier);
    const users = getStoredUsers();
    let found = matchUser(users, resetIdentifier);
    if (!found) {
      found = await withPasswordHash({ id: genId(), name: isEmail(resetIdentifier) ? resetIdentifier.split('@')[0] : 'Member', email: isEmail(resetIdentifier) ? resetIdentifier : undefined, phone: isPhone(resetIdentifier) ? normPhone(resetIdentifier) : undefined, provider: 'password' }, input.password);
      setStoredUsers([...users, found]);
    } else {
      found.passwordHash = await sha256(input.password);
      setStoredUsers(users);
    }
    return { ok: true, ...makeSession(found) };
  },
};

export const authKeys = {
  session: ['auth', 'session'] as const,
  currentUser: ['auth', 'currentUser'] as const,
};
