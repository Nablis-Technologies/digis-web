import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import {
  X, Phone, Lock, User, ArrowRight, ArrowLeft, ShieldCheck, Eye, EyeOff,
  AlertCircle, Check, Loader2, Sparkles, ChevronDown, Search,
} from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { mapFieldErrors } from '@/lib/errors';
import { primaryButtonSurface } from '@/lib/ui/disabledStyles';
import { glassEdge, glassField } from '@/lib/ui/glass';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput } from '@/components/primitives/AppInput';
import { FieldError } from '@/components/primitives/FieldError';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import type { CSSProperties } from 'react';

/* â”€â”€â”€ Country data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface Country { code: string; name: string; dial: string; flag: string; }

const COUNTRIES: Country[] = [
  { code: 'ET', name: 'Ethiopia',       dial: '251', flag: 'ðŸ‡ªðŸ‡¹' },
  { code: 'KE', name: 'Kenya',          dial: '254', flag: 'ðŸ‡°ðŸ‡ª' },
  { code: 'NG', name: 'Nigeria',        dial: '234', flag: 'ðŸ‡³ðŸ‡¬' },
  { code: 'GH', name: 'Ghana',          dial: '233', flag: 'ðŸ‡¬ðŸ‡­' },
  { code: 'TZ', name: 'Tanzania',       dial: '255', flag: 'ðŸ‡¹ðŸ‡¿' },
  { code: 'UG', name: 'Uganda',         dial: '256', flag: 'ðŸ‡ºðŸ‡¬' },
  { code: 'RW', name: 'Rwanda',         dial: '250', flag: 'ðŸ‡·ðŸ‡¼' },
  { code: 'ER', name: 'Eritrea',        dial: '291', flag: 'ðŸ‡ªðŸ‡·' },
  { code: 'SO', name: 'Somalia',        dial: '252', flag: 'ðŸ‡¸ðŸ‡´' },
  { code: 'DJ', name: 'Djibouti',       dial: '253', flag: 'ðŸ‡©ðŸ‡¯' },
  { code: 'SS', name: 'South Sudan',    dial: '211', flag: 'ðŸ‡¸ðŸ‡¸' },
  { code: 'SD', name: 'Sudan',          dial: '249', flag: 'ðŸ‡¸ðŸ‡©' },
  { code: 'ZA', name: 'South Africa',   dial: '27',  flag: 'ðŸ‡¿ðŸ‡¦' },
  { code: 'EG', name: 'Egypt',          dial: '20',  flag: 'ðŸ‡ªðŸ‡¬' },
  { code: 'MA', name: 'Morocco',        dial: '212', flag: 'ðŸ‡²ðŸ‡¦' },
  { code: 'AE', name: 'UAE',            dial: '971', flag: 'ðŸ‡¦ðŸ‡ª' },
  { code: 'SA', name: 'Saudi Arabia',   dial: '966', flag: 'ðŸ‡¸ðŸ‡¦' },
  { code: 'US', name: 'United States',  dial: '1',   flag: 'ðŸ‡ºðŸ‡¸' },
  { code: 'CA', name: 'Canada',         dial: '1',   flag: 'ðŸ‡¨ðŸ‡¦' },
  { code: 'GB', name: 'United Kingdom', dial: '44',  flag: 'ðŸ‡¬ðŸ‡§' },
  { code: 'DE', name: 'Germany',        dial: '49',  flag: 'ðŸ‡©ðŸ‡ª' },
  { code: 'FR', name: 'France',         dial: '33',  flag: 'ðŸ‡«ðŸ‡·' },
  { code: 'IN', name: 'India',          dial: '91',  flag: 'ðŸ‡®ðŸ‡³' },
  { code: 'CN', name: 'China',          dial: '86',  flag: 'ðŸ‡¨ðŸ‡³' },
  { code: 'AU', name: 'Australia',      dial: '61',  flag: 'ðŸ‡¦ðŸ‡º' },
];
const DEFAULT_COUNTRY = COUNTRIES[0]; // Ethiopia

/** Prepend dial code unless the value is an email or already E.164 */
function buildPhone(value: string, dial: string): string {
  const v = value.trim();
  if (!v || v.includes('@') || v.startsWith('+')) return v;
  return `+${dial}${v.replace(/^0+/, '')}`;
}

interface AuthModalProps {
  onClose: () => void;
  onAuthed?: () => void;
  /** Mode to open in â€” the route (`/login` | `/signup`) seeds it. */
  initialMode?: 'signin' | 'signup';
  /** Notified on a user mode switch so the route can stay in sync. */
  onModeChange?: (mode: 'signin' | 'signup') => void;
}

/**
 * Phone-first auth, matching digis_backend's identifier+password surface.
 * No OTP / Google / password-reset (the backend has none â€” see BACKEND_GAPS.md #8).
 *
 * Mode is local state seeded from the route: switching flips the UI immediately
 * and the parent mirrors it into the URL. It must not depend on the route round
 * trip to re-render (that made the form lag behind the URL).
 */
export function AuthModal({ onClose, onAuthed, initialMode = 'signin', onModeChange }: AuthModalProps) {
  const { isDark } = useTheme();
  const auth = useAuth();
  const [mode, setModeState] = useState<'signin' | 'signup'>(initialMode);
  const setMode = (next: 'signin' | 'signup') => {
    setModeState(next);
    onModeChange?.(next);
  };
  const [loading, setLoading] = useState(false);
  // Per-field messages (keyed by field) plus a form-level line for anything
  // that names no field â€” so a failure points at the exact input, not the form.
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  // form state
  const [identifier, setIdentifier] = useState(''); // sign-in phone
  const [fullName, setFullName] = useState(''); // signup only
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);

  // signup phone verification state
  const [signupStep, setSignupStep] = useState<'details' | 'otp'>('details');
  const [challengeId, setChallengeId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendingOtp, setResendingOtp] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.45)';
  const accent = isDark ? '#d6f905' : '#0a0a0a';
  const bgPanel = isDark ? '#0a0a0a' : '#ffffff';
  const borderSoft = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.08)';

  const clearAllErrors = () => { setErrors({}); setFormError(''); };
  const clearField = (field: string) => setErrors((prev) => {
    if (!prev[field]) return prev;
    const next = { ...prev };
    delete next[field];
    return next;
  });

  const switchMode = (m: 'signin' | 'signup') => {
    clearAllErrors();
    setSignupStep('details');
    setMode(m);
  };

  const finishAuthed = () => {
    setSuccess(true);
    setTimeout(() => { onAuthed?.(); onClose(); }, 1400);
  };

  const handleSignIn = async () => {
    clearAllErrors(); setLoading(true);
    const res = await auth.signIn(buildPhone(identifier, country.dial), password);
    setLoading(false);
    if (res.ok) finishAuthed();
    else setFormError(res.error || 'Could not log in.');
  };

  const handleRequestSignupOtp = async () => {
    clearAllErrors();
    const trimmedName = fullName.trim();
    const e164 = buildPhone(phone, country.dial);

    const next: Record<string, string> = {};
    if (!trimmedName) next.name = 'Enter your name.';
    if (!/^\+[1-9]\d{6,14}$/.test(e164)) next.phone = 'Enter a valid mobile number for the selected country.';
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword) next.passwordConfirmation = 'Passwords do not match.';
    if (Object.keys(next).length) { setErrors(next); return; }

    setLoading(true);
    const res = await auth.requestSignupOtp(e164);
    setLoading(false);

    if (!res.ok) {
      const errStr = res.error || '';
      if (/taken|already/i.test(errStr)) {
        setErrors({ phone: 'This phone already has a Digis account.' });
        setFormError('Log in with your password — or if you bought a ticket as a guest, log in to set a password.');
      } else {
        setFormError(errStr || 'Could not send verification code.');
      }
      return;
    }

    setChallengeId(res.challenge_id);
    setSignupStep('otp');
    setOtpCode('');
  };

  const handleVerifyAndSignUp = async () => {
    clearAllErrors();
    const trimmedCode = otpCode.trim();
    if (trimmedCode.length < 4) {
      setErrors({ otp: 'Please enter the 6-digit verification code.' });
      return;
    }

    setLoading(true);
    const verifyRes = await auth.verifySignupOtp(challengeId, trimmedCode);
    if (!verifyRes.ok) {
      setLoading(false);
      setErrors({ otp: verifyRes.error || 'Invalid or expired verification code.' });
      return;
    }

    const trimmedName = fullName.trim();
    const e164 = buildPhone(phone, country.dial);
    const res = await auth.signUp({
      name: trimmedName,
      phone: e164,
      password,
      passwordConfirmation: confirmPassword,
      verification_token: verifyRes.verification_token,
    });
    setLoading(false);

    if (res.ok) {
      finishAuthed();
      return;
    }

    const { fields, general } = mapFieldErrors(res.fieldErrors);
    const mapped: Record<string, string> = {};
    for (const key of ['name', 'phone', 'password', 'passwordConfirmation']) {
      if (fields[key]) mapped[key] = fields[key];
    }
    setErrors(mapped);
    setFormError(general.join(' ') || (Object.keys(mapped).length ? '' : res.error || 'Could not create account.'));
  };

  const handleResendOtp = async () => {
    const e164 = buildPhone(phone, country.dial);
    setResendingOtp(true);
    setFormError('');
    const res = await auth.requestSignupOtp(e164);
    setResendingOtp(false);
    if (res.ok) {
      setChallengeId(res.challenge_id);
      setOtpCode('');
    } else {
      setFormError(res.error || 'Failed to resend code.');
    }
  };

  const titles = {
    signin: { kicker: 'Welcome back', title: 'Log in', sub: 'Enter your phone number and password to continue.' },
    signup: signupStep === 'otp'
      ? { kicker: 'Confirm phone', title: 'Enter verification code', sub: `Enter the 6-digit code sent to ${buildPhone(phone, country.dial)}` }
      : { kicker: 'Create your account', title: 'Create an account', sub: 'Your phone number is required.' },
  };
  const t = titles[mode];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(4,4,4,0.7)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative w-full sm:max-w-md max-h-[94vh] overflow-hidden flex flex-col rounded-t-[32px] sm:rounded-[32px]"
        style={{
          background: bgPanel,
          boxShadow: isDark
            ? '0 -20px 80px rgba(0,0,0,0.5)'
            : '0 -20px 80px rgba(20,18,40,0.18)',
        }}
      >
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 contents">
        {/* Mobile grab handle */}
        <div className="sm:hidden relative flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)' }} />
        </div>

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 flex items-center justify-between" style={{ boxShadow: `inset 0 -1px 0 ${borderSoft}` }}>
          <div className="w-9 h-9" />
          <p className="text-[9px] tracking-[3px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
            {t.kicker}
          </p>
          <AppButton whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.04)', ...glassEdge(isDark) }}>
            <X className="w-4 h-4" strokeWidth={1.8} style={{ color: textMuted }} />
          </AppButton>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto scrollbar-hide px-6 py-6">
          {!success && (
            <div className="flex flex-col items-center mb-5">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 16, stiffness: 220 }}
                className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: isDark ? 'rgba(217,255,0,0.1)' : 'rgba(214,249,5,0.16)',
                  ...glassEdge(isDark),
                }}
              >
                <DigisMark className="w-7 h-7" color={isDark ? '#d6f905' : '#0a0a0a'} />
              </motion.div>
            </div>
          )}
          <div className="text-center mb-6">
            <h3 className="text-[24px] font-light mb-1.5 tracking-[-0.3px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
              {t.title}
            </h3>
            <p className="text-[12.5px] leading-relaxed max-w-[320px] mx-auto" style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
              {t.sub}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center py-4"
              >
                <div className="relative mb-5">
                  {[0, 1].map((i) => (
                    <motion.div key={i}
                      className="absolute inset-0 rounded-full"
                      style={{ border: '1.5px solid rgba(52,211,153,0.5)' }}
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
                    />
                  ))}
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14, stiffness: 200 }}
                    className="relative w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' }}>
                    <Check className="w-9 h-9 text-white" strokeWidth={3} />
                  </motion.div>
                </div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" strokeWidth={2} style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} />
                  <span className="text-[14px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 500, color: textPrimary }}>
                    Welcome to Digis
                  </span>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {mode === 'signin' && (
                  <>
                    <PhoneField
                      country={country} onCountryChange={setCountry}
                      placeholder="Phone number"
                      value={identifier} onChange={(v) => { setIdentifier(v); clearField('identifier'); }} error={errors.identifier}
                      isDark={isDark} onEnter={handleSignIn}
                    />
                    <PasswordField value={password} onChange={(v) => { setPassword(v); clearField('password'); }} error={errors.password} isDark={isDark} placeholder="Your password" onEnter={handleSignIn} />
                    <ErrorLine error={formError} />
                    <PrimaryButton onClick={handleSignIn} loading={loading} isDark={isDark} label="Log in" disabled={!identifier.trim() || !password} />
                  </>
                )}

                {mode === 'signup' && signupStep === 'details' && (
                  <>
                    <NameField value={fullName} onChange={(v) => { setFullName(v); clearField('name'); }} error={errors.name} isDark={isDark} onEnter={handleRequestSignupOtp} />
                    <PhoneField
                      country={country} onCountryChange={setCountry}
                      placeholder="Phone number"
                      value={phone} onChange={(v) => { setPhone(v); clearField('phone'); }} error={errors.phone}
                      isDark={isDark} onEnter={handleRequestSignupOtp}
                    />
                    <PasswordField value={password} onChange={(v) => { setPassword(v); clearField('password'); }} error={errors.password} isDark={isDark} placeholder="Create a password (min 8 chars)" onEnter={handleRequestSignupOtp} />
                    <PasswordField value={confirmPassword} onChange={(v) => { setConfirmPassword(v); clearField('passwordConfirmation'); }} error={errors.passwordConfirmation} isDark={isDark} placeholder="Confirm your password" onEnter={handleRequestSignupOtp} />
                    <ErrorLine error={formError} />
                    <PrimaryButton onClick={handleRequestSignupOtp} loading={loading} isDark={isDark} label="Continue" disabled={!fullName.trim() || !phone.trim() || !password || !confirmPassword} />
                    <p className="text-[10.5px] leading-relaxed text-center px-2" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
                      By continuing you agree to Digis’ Terms & Privacy Policy.
                    </p>
                  </>
                )}

                {mode === 'signup' && signupStep === 'otp' && (
                  <div className="space-y-4">
                    <OtpCodeField
                      value={otpCode}
                      onChange={(v) => { setOtpCode(v); clearField('otp'); }}
                      error={errors.otp}
                      isDark={isDark}
                      onEnter={handleVerifyAndSignUp}
                    />
                    <ErrorLine error={formError} />
                    <PrimaryButton
                      onClick={handleVerifyAndSignUp}
                      loading={loading}
                      isDark={isDark}
                      label="Verify & create account"
                      disabled={otpCode.trim().length < 4}
                    />
                    <div className="flex items-center justify-between pt-1 px-1 text-[11.5px]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      <button
                        type="button"
                        onClick={() => { clearAllErrors(); setSignupStep('details'); }}
                        className="cursor-pointer flex items-center gap-1.5 transition-opacity hover:opacity-80"
                        style={{ color: textMuted, background: 'none', border: 'none' }}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Edit details</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendingOtp}
                        className="cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{ color: accent, background: 'none', border: 'none', fontWeight: 500 }}
                      >
                        {resendingOtp ? 'Sending…' : 'Resend code'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-center pt-1">
                  <AppButton
                    onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                    className="text-[11.5px] cursor-pointer"
                    style={{ fontFamily: "'Inter', sans-serif", color: accent }}
                  >
                    {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Log in'}
                  </AppButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        </div>
      </motion.div>
    </motion.div>
  );
}

/* â”€â”€â”€ helpers / subcomponents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function DigisMark({ className, color }: { className?: string; color: string }) {
  return (
    <svg viewBox="0 0 1000 1000" className={className} fill={color}>
      <path d="M481.88,355.78v142.38c-46.95-6.63-89.03-20.18-126.27-40.59-43.22-23.76-78.63-55.56-106.26-95.49-7.6-10.97-14.62-22.59-21.08-34.81-19.52-37.09-32.65-79-39.35-125.65h161.2c4.05,22.52,10.15,42.5,18.25,60.06,16.46,35.55,40.87,61.77,73.22,78.58,7.03,3.65,14.4,6.9,22.15,9.71,5.83,2.16,11.89,4.1,18.15,5.81Z" />
      <rect x="482.05" y="196.36" width="325.96" height="160.48" />
      <path d="M801.18,817.1h-161.33c-4.02-21.15-9.93-40.07-17.6-56.71-16.46-35.58-40.87-61.8-73.22-78.6-32.38-16.76-72.3-25.18-119.72-25.18h-81.21v-137.52h89.73c15.1,0,29.79.6,44.04,1.79,9.41.77,18.64,1.81,27.68,3.13,46.63,6.65,88.44,20.18,125.48,40.49,55.09,30.26,97.52,73.71,127.32,130.27,19.07,36.22,32,76.96,38.83,122.32Z" />
      <rect x="187.65" y="656.64" width="160.46" height="160.46" />
    </svg>
  );
}

function inputStyle(isDark: boolean): CSSProperties {
  return {
    fontFamily: "'Inter', sans-serif", fontSize: '14px',
    background: 'transparent', color: isDark ? '#fff' : '#1a1a1a',
    border: 'none', outline: 'none', width: '100%',
  };
}

/* â”€â”€â”€ CountrySelector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function CountrySelector({ country, onChange, isDark }: {
  country: Country; onChange: (c: Country) => void; isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = search
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase()))
    : COUNTRIES;

  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted   = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const textDim     = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(26,26,46,0.4)';

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <AppButton
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className="flex items-center gap-1.5 pr-3 cursor-pointer select-none"
        style={{ boxShadow: `inset -1px 0 0 ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,46,0.1)'}` }}
      >
        <span className="text-[17px] leading-none">{country.flag}</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: textMuted }}>+{country.dial}</span>
        <ChevronDown
          className="w-3 h-3 transition-transform duration-150"
          style={{ color: textDim, transform: open ? 'rotate(180deg)' : 'none' }}
          strokeWidth={2.2}
        />
      </AppButton>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute left-0 top-full mt-2 z-[310] w-64 rounded-2xl overflow-hidden"
            style={{
              background: isDark ? '#111' : '#fff',
              boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.7)' : '0 24px 64px rgba(20,18,40,0.18)',
            }}
          >
            <GlassReflection isDark={isDark} />
            {/* Search */}
            <div className="relative z-10 p-2.5" style={{ boxShadow: `inset 0 -1px 0 ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.06)'}` }}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(26,26,46,0.04)' }}>
                <Search className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} style={{ color: textDim }} />
                <AppInput
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search countryâ€¦" autoFocus
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: "'Inter', sans-serif", fontSize: '12px', color: textPrimary, width: '100%',
                  }}
                />
              </div>
            </div>
            {/* List */}
            <div className="relative z-10 overflow-y-auto max-h-52 scrollbar-hide py-1">
              {filtered.map(c => {
                const active = c.code === country.code;
                return (
                  <AppButton key={c.code} type="button"
                    onClick={() => { onChange(c); setOpen(false); setSearch(''); }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left cursor-pointer"
                    style={{ background: active ? (isDark ? 'rgba(217,255,0,0.09)' : 'rgba(214,249,5,0.1)') : 'transparent' }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.04)'; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <span className="text-[16px] leading-none w-6 flex-shrink-0">{c.flag}</span>
                    <span className="flex-1 text-[12.5px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: textPrimary }}>{c.name}</span>
                    <span className="text-[11px] tabular-nums flex-shrink-0" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>+{c.dial}</span>
                    {active && <Check className="w-3 h-3 flex-shrink-0 ml-1" strokeWidth={2.5} style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} />}
                  </AppButton>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center py-6 text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>No countries found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* â”€â”€â”€ PhoneField (with dial selector) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function PhoneField({ country, onCountryChange, placeholder, value, onChange, isDark, onEnter, error }: {
  country: Country; onCountryChange: (c: Country) => void;
  placeholder?: string; value: string; onChange: (v: string) => void;
  isDark: boolean; onEnter?: () => void; error?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-0 px-4 py-3.5 rounded-xl transition-all overflow-hidden"
        style={glassField(isDark, { error: !!error, focused })}>
        <GlassReflection isDark={isDark} />
        <CountrySelector country={country} onChange={onCountryChange} isDark={isDark} />
        <AppInput
          type="tel" value={value} placeholder={placeholder || 'Phone number'}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
          aria-invalid={error ? true : undefined}
          style={{ ...inputStyle(isDark), paddingLeft: '10px' }}
        />
      </div>
      <FieldError error={error} />
    </div>
  );
}

/* â”€â”€â”€ Name field (signup only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function NameField({ value, onChange, isDark, onEnter, error }: { value: string; onChange: (v: string) => void; isDark: boolean; onEnter?: () => void; error?: string }) {
  const [focused, setFocused] = useState(false);
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.45)';
  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all overflow-hidden"
        style={glassField(isDark, { error: !!error, focused })}>
        <GlassReflection isDark={isDark} />
        <span style={{ color: focused ? (isDark ? '#d6f905' : '#0a0a0a') : textDim }}><User className="w-4 h-4" /></span>
        <AppInput type="text" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="Name" style={inputStyle(isDark)} aria-invalid={error ? true : undefined}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }} />
      </div>
      <FieldError error={error} />
    </div>
  );
}

function PasswordField({ value, onChange, isDark, placeholder, onEnter, error }: { value: string; onChange: (v: string) => void; isDark: boolean; placeholder: string; onEnter?: () => void; error?: string }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.45)';
  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all overflow-hidden"
        style={glassField(isDark, { error: !!error, focused })}>
        <GlassReflection isDark={isDark} />
        <span style={{ color: focused ? (isDark ? '#d6f905' : '#0a0a0a') : textDim }}><Lock className="w-4 h-4" /></span>
        <AppInput type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} style={inputStyle(isDark)} aria-invalid={error ? true : undefined}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }} />
        <AppButton type="button" onClick={() => setShow((s) => !s)} className="cursor-pointer flex-shrink-0" style={{ color: textDim }}>
          {show ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
        </AppButton>
      </div>
      <FieldError error={error} />
    </div>
  );
}

function OtpCodeField({
  value,
  onChange,
  isDark,
  onEnter,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
  onEnter?: () => void;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div
        className="flex items-center justify-center px-4 py-3 rounded-xl transition-all overflow-hidden"
        style={glassField(isDark, { error: !!error, focused })}
      >
        <GlassReflection isDark={isDark} />
        <AppInput
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
          className="text-center font-mono text-[22px] tracking-[8px] outline-none w-full bg-transparent"
          style={{ color: isDark ? '#fff' : '#111' }}
          aria-invalid={error ? true : undefined}
          aria-label="Verification code"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnter) onEnter();
          }}
        />
      </div>
      <FieldError error={error} />
    </div>
  );
}

function PrimaryButton({ onClick, loading, isDark, label, disabled }: { onClick: () => void; loading?: boolean; isDark: boolean; label: string; disabled?: boolean }) {
  const enabled = !loading && !disabled;
  return (
    <AppButton whileHover={{ scale: enabled ? 1.01 : 1 }} whileTap={{ scale: enabled ? 0.98 : 1 }}
      onClick={onClick} disabled={!enabled}
      className="relative w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 overflow-hidden"
      style={{
        ...primaryButtonSurface(enabled, isDark),
        fontFamily: "'Inter', sans-serif", fontSize: '14px', letterSpacing: '0.5px', fontWeight: 600,
      }}>
      {enabled && (
        <motion.span
          className="absolute inset-y-0 w-1/3 pointer-events-none"
          style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent)' }}
          initial={{ x: '-150%' }}
          animate={{ x: '350%' }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
        />
      )}
      {loading
        ? <Loader2 className="relative w-4 h-4 animate-spin" />
        : (<><span className="relative">{label}</span><ArrowRight className="relative w-4 h-4" strokeWidth={2.25} /></>)}
    </AppButton>
  );
}

function ErrorLine({ error }: { error: string }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-1.5 justify-center">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" strokeWidth={2} />
          <p className="text-[11.5px]" style={{ fontFamily: "'Inter', sans-serif", color: '#f87171' }}>{error}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
