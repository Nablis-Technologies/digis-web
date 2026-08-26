import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import {
  X, Mail, Phone, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff,
  AlertCircle, Check, ShieldCheck, Loader2, Sparkles, ChevronDown, Search,
} from 'lucide-react';

/* ─── Country data ─────────────────────────────────────────── */
interface Country { code: string; name: string; dial: string; flag: string; }

const COUNTRIES: Country[] = [
  { code: 'ET', name: 'Ethiopia',       dial: '251', flag: '🇪🇹' },
  { code: 'KE', name: 'Kenya',          dial: '254', flag: '🇰🇪' },
  { code: 'NG', name: 'Nigeria',        dial: '234', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana',          dial: '233', flag: '🇬🇭' },
  { code: 'TZ', name: 'Tanzania',       dial: '255', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda',         dial: '256', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda',         dial: '250', flag: '🇷🇼' },
  { code: 'ER', name: 'Eritrea',        dial: '291', flag: '🇪🇷' },
  { code: 'SO', name: 'Somalia',        dial: '252', flag: '🇸🇴' },
  { code: 'DJ', name: 'Djibouti',       dial: '253', flag: '🇩🇯' },
  { code: 'SS', name: 'South Sudan',    dial: '211', flag: '🇸🇸' },
  { code: 'SD', name: 'Sudan',          dial: '249', flag: '🇸🇩' },
  { code: 'ZA', name: 'South Africa',   dial: '27',  flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt',          dial: '20',  flag: '🇪🇬' },
  { code: 'MA', name: 'Morocco',        dial: '212', flag: '🇲🇦' },
  { code: 'AE', name: 'UAE',            dial: '971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia',   dial: '966', flag: '🇸🇦' },
  { code: 'US', name: 'United States',  dial: '1',   flag: '🇺🇸' },
  { code: 'CA', name: 'Canada',         dial: '1',   flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', dial: '44',  flag: '🇬🇧' },
  { code: 'DE', name: 'Germany',        dial: '49',  flag: '🇩🇪' },
  { code: 'FR', name: 'France',         dial: '33',  flag: '🇫🇷' },
  { code: 'IN', name: 'India',          dial: '91',  flag: '🇮🇳' },
  { code: 'CN', name: 'China',          dial: '86',  flag: '🇨🇳' },
  { code: 'AU', name: 'Australia',      dial: '61',  flag: '🇦🇺' },
];
const DEFAULT_COUNTRY = COUNTRIES[0]; // Ethiopia

/** Prepend dial code unless the value is an email or already E.164 */
function buildPhone(value: string, dial: string): string {
  const v = value.trim();
  if (!v || v.includes('@') || v.startsWith('+')) return v;
  return `+${dial}${v.replace(/^0+/, '')}`;
}
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { primaryButtonSurface } from '@/lib/ui/disabledStyles';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput, AppTextArea } from '@/components/primitives/AppInput';

type Step = 'identify' | 'password' | 'register' | 'googlePhone' | 'otp' | 'forgot' | 'reset' | 'success';

interface AuthModalProps {
  onClose: () => void;
  onAuthed?: () => void;
}

export function AuthModal({ onClose, onAuthed }: AuthModalProps) {
  const { isDark } = useTheme();
  const auth = useAuth();
  const [step, setStep] = useState<Step>('identify');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const otpPurpose = useRef<'signup' | 'reset'>('signup');

  // form state
  const [identifier, setIdentifier] = useState(''); // unified entry (phone or email)
  const [entryWasEmail, setEntryWasEmail] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPass, setNewPass] = useState('');
  const [otp, setOtp] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);

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

  const go = (s: Step) => { setError(''); setStep(s); };

  const finishAuthed = () => {
    setStep('success');
    setTimeout(() => { onAuthed?.(); onClose(); }, 1400);
  };

  // ── Step 1: single entry, then branch
  const handleContinue = async () => {
    setError(''); setLoading(true);
    const full = buildPhone(identifier, country.dial);
    const res = await auth.checkAccount(full);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setEntryWasEmail(res.isEmail);
    if (res.exists) {
      go('password');
    } else {
      if (res.isEmail) { setEmail(full); setPhone(''); }
      else { setPhone(full); setEmail(''); }
      go('register');
    }
  };

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    const res = await auth.signInWithGoogle();
    setLoading(false);
    if (!res.ok) { setError(res.error || 'Could not sign in with Google.'); return; }
    if (res.needsPhone) go('googlePhone');
    else finishAuthed();
  };

  const handleSignIn = async () => {
    setError(''); setLoading(true);
    const res = await auth.signIn(buildPhone(identifier, country.dial), password);
    setLoading(false);
    if (res.ok) finishAuthed();
    else setError(res.error || 'Could not log in.');
  };

  const handleRegister = async () => {
    setError(''); setLoading(true);
    const res = await auth.startSignUp({ name, phone: buildPhone(phone, country.dial), email: email || undefined, password });
    setLoading(false);
    if (res.ok) { otpPurpose.current = 'signup'; setDevCode(res.devCode || ''); setOtp(''); go('otp'); }
    else setError(res.error || 'Could not create account.');
  };

  const handleGooglePhone = async () => {
    setError(''); setLoading(true);
    const res = await auth.completeGooglePhone(buildPhone(phone, country.dial));
    setLoading(false);
    if (res.ok) finishAuthed();
    else setError(res.error || 'Could not save phone number.');
  };

  const handleForgot = async () => {
    setError(''); setLoading(true);
    const res = await auth.requestPasswordReset(buildPhone(identifier, country.dial));
    setLoading(false);
    if (res.ok) { otpPurpose.current = 'reset'; setDevCode(res.devCode || ''); setOtp(''); go('otp'); }
    else setError(res.error || 'Could not start password reset.');
  };

  const handleVerify = async (codeOverride?: string) => {
    const code = codeOverride ?? otp;
    setError(''); setLoading(true);
    const res = await auth.verifyOtp(code);
    setLoading(false);
    if (res.ok) { if (otpPurpose.current === 'signup') finishAuthed(); else go('reset'); }
    else setError(res.error || 'Invalid code.');
  };

  const handleResend = async () => {
    const res = await auth.resendOtp();
    if (res.ok) setDevCode(res.devCode || '');
  };

  const handleReset = async () => {
    setError(''); setLoading(true);
    const res = await auth.setNewPassword(newPass);
    setLoading(false);
    if (res.ok) finishAuthed();
    else setError(res.error || 'Could not set new password.');
  };

  const titles: Record<Step, { kicker: string; title: string; sub: string }> = {
    identify: { kicker: 'Welcome to Digis', title: 'Log in or create an account', sub: 'Enter your phone number to continue. Email works too.' },
    password: { kicker: 'Welcome back', title: 'Enter your password', sub: `Signing in as ${identifier}.` },
    register: { kicker: 'Create your account', title: 'A few quick details', sub: 'Your phone number is required — email is optional.' },
    googlePhone: { kicker: 'One more thing', title: 'Add your phone number', sub: 'We use it to secure your tickets. Required to finish.' },
    otp: { kicker: 'Verify it’s you', title: 'Enter the 6-digit code', sub: `We sent a code to ${maskIdentifier(auth.pendingIdentifier || phone || identifier)}.` },
    forgot: { kicker: 'Reset password', title: 'Forgot your password?', sub: 'We’ll send a code to verify your identity.' },
    reset: { kicker: 'Almost done', title: 'Set a new password', sub: 'Choose something secure you’ll remember.' },
    success: { kicker: 'You’re in', title: 'Signed in', sub: 'Taking you back to the action.' },
  };
  const t = titles[step];
  const canBack = step !== 'identify' && step !== 'success';
  const backTo = (): Step => {
    if (step === 'password' || step === 'register' || step === 'forgot' || step === 'googlePhone') return 'identify';
    if (step === 'otp') return otpPurpose.current === 'reset' ? 'forgot' : 'register';
    if (step === 'reset') return 'identify';
    return 'identify';
  };

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
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(20,18,40,0.1)'}`,
          boxShadow: isDark
            ? '0 -20px 80px rgba(0,0,0,0.5)'
            : '0 -20px 80px rgba(20,18,40,0.18)',
        }}
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden relative flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)' }} />
        </div>

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${borderSoft}` }}>
          {canBack ? (
            <AppButton whileTap={{ scale: 0.9 }} onClick={() => go(backTo())}
              className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.04)', border: `1px solid ${borderSoft}` }}>
              <ArrowLeft className="w-4 h-4" strokeWidth={1.8} style={{ color: textMuted }} />
            </AppButton>
          ) : <div className="w-9 h-9" />}
          <p className="text-[9px] tracking-[3px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
            {t.kicker}
          </p>
          <AppButton whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.04)', border: `1px solid ${borderSoft}` }}>
            <X className="w-4 h-4" strokeWidth={1.8} style={{ color: textMuted }} />
          </AppButton>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto scrollbar-hide px-6 py-6">
          {step !== 'success' && (
            <div className="flex flex-col items-center mb-5">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 16, stiffness: 220 }}
                className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: isDark ? 'rgba(217,255,0,0.1)' : 'rgba(214,249,5,0.16)',
                  border: `1px solid ${isDark ? 'rgba(217,255,0,0.3)' : 'rgba(214,249,5,0.5)'}`,
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
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* ── IDENTIFY (unified entry) ── */}
              {step === 'identify' && (
                <>
                  <PhoneField
                    country={country} onCountryChange={setCountry}
                    placeholder="Phone or email"
                    value={identifier} onChange={(v) => { setIdentifier(v); setError(''); }}
                    isDark={isDark} onEnter={handleContinue}
                  />
                  <ErrorLine error={error} />
                  <PrimaryButton onClick={handleContinue} loading={loading} isDark={isDark} label="Continue" disabled={!identifier.trim()} />
                  <Divider isDark={isDark} />
                  <GoogleButton onClick={handleGoogle} disabled={loading} isDark={isDark} label="Continue with Google" />
                </>
              )}

              {/* ── PASSWORD (existing) ── */}
              {step === 'password' && (
                <>
                  <PasswordField value={password} onChange={(v) => { setPassword(v); setError(''); }} isDark={isDark} placeholder="Your password" onEnter={handleSignIn} />
                  <div className="flex justify-end -mt-1">
                    <AppButton onClick={() => go('forgot')} className="text-[11.5px] cursor-pointer" style={{ fontFamily: "'Inter', sans-serif", color: accent }}>
                      Forgot password?
                    </AppButton>
                  </div>
                  <ErrorLine error={error} />
                  <PrimaryButton onClick={handleSignIn} loading={loading} isDark={isDark} label="Log in" />
                </>
              )}

              {/* ── REGISTER (new) ── */}
              {step === 'register' && (
                <>
                  <Field icon={<User className="w-4 h-4" />} placeholder="Full name" value={name} onChange={(v) => { setName(v); setError(''); }} isDark={isDark} />
                  <PhoneField country={country} onCountryChange={setCountry} placeholder="Phone number" value={phone} onChange={(v) => { setPhone(v); setError(''); }} isDark={isDark} />
                  <Field icon={<Mail className="w-4 h-4" />} type="email" placeholder="Email (optional)" value={email} onChange={(v) => { setEmail(v); setError(''); }} isDark={isDark} optional />
                  <PasswordField value={password} onChange={(v) => { setPassword(v); setError(''); }} isDark={isDark} placeholder="Create a password (min 6 chars)" />
                  <ErrorLine error={error} />
                  <PrimaryButton onClick={handleRegister} loading={loading} isDark={isDark} label="Create account" />
                  <p className="text-[10.5px] leading-relaxed text-center px-2" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
                    By continuing you agree to Digis’ Terms & Privacy Policy.
                  </p>
                </>
              )}

              {/* ── GOOGLE PHONE ── */}
              {step === 'googlePhone' && (
                <>
                  <PhoneField country={country} onCountryChange={setCountry} placeholder="Phone number" value={phone} onChange={(v) => { setPhone(v); setError(''); }} isDark={isDark} onEnter={handleGooglePhone} />
                  <ErrorLine error={error} />
                  <PrimaryButton onClick={handleGooglePhone} loading={loading} isDark={isDark} label="Finish" disabled={!phone.trim()} />
                </>
              )}

              {/* ── OTP ── */}
              {step === 'otp' && (
                <>
                  <OtpInput value={otp} onChange={(v) => { setOtp(v); setError(''); }} isDark={isDark} onComplete={(code) => handleVerify(code)} />
                  {devCode && (
                    <div className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-3"
                      style={{ background: isDark ? 'rgba(217,255,0,0.06)' : 'rgba(214,249,5,0.06)', border: `1px solid ${isDark ? 'rgba(217,255,0,0.15)' : 'rgba(214,249,5,0.15)'}` }}>
                      <Sparkles className="w-3.5 h-3.5" style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} strokeWidth={1.75} />
                      <span className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
                        Demo code: <span style={{ color: textPrimary, fontWeight: 600, letterSpacing: '2px' }}>{devCode}</span>
                      </span>
                    </div>
                  )}
                  <ErrorLine error={error} />
                  <PrimaryButton onClick={() => handleVerify()} loading={loading} isDark={isDark} label="Verify" disabled={otp.length !== 6} />
                  <div className="text-center">
                    <AppButton onClick={handleResend} className="text-[11.5px] cursor-pointer" style={{ fontFamily: "'Inter', sans-serif", color: accent }}>
                      Didn’t get it? Resend code
                    </AppButton>
                  </div>
                </>
              )}

              {/* ── FORGOT ── */}
              {step === 'forgot' && (
                <>
                  <PhoneField country={country} onCountryChange={setCountry} placeholder="Phone or email" value={identifier} onChange={(v) => { setIdentifier(v); setError(''); }} isDark={isDark} onEnter={handleForgot} />
                  <ErrorLine error={error} />
                  <PrimaryButton onClick={handleForgot} loading={loading} isDark={isDark} label="Send reset code" />
                </>
              )}

              {/* ── RESET ── */}
              {step === 'reset' && (
                <>
                  <PasswordField value={newPass} onChange={(v) => { setNewPass(v); setError(''); }} isDark={isDark} placeholder="New password (min 6 chars)" />
                  <ErrorLine error={error} />
                  <PrimaryButton onClick={handleReset} loading={loading} isDark={isDark} label="Update password" />
                </>
              )}

              {/* ── SUCCESS ── */}
              {step === 'success' && (
                <div className="flex flex-col items-center py-4">
                  <div className="relative mb-5">
                    {/* pulse rings */}
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
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {step !== 'success' && (
          <div className="px-6 pb-6 pt-1 flex items-center justify-center gap-1.5" style={{ color: textDim }}>
            <ShieldCheck className="w-3 h-3" strokeWidth={1.8} />
            <span className="text-[10px] tracking-[1px] uppercase" style={{ fontFamily: "'Inter', sans-serif" }}>Encrypted &amp; secure</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── helpers / subcomponents ───────────────────────────── */
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

function maskIdentifier(v: string) {
  if (!v) return 'your contact';
  if (v.includes('@')) {
    const [u, d] = v.split('@');
    return `${u.slice(0, 2)}${'•'.repeat(Math.max(1, u.length - 2))}@${d}`;
  }
  const digits = v.replace(/\s/g, '');
  return `${digits.slice(0, 4)}•••${digits.slice(-2)}`;
}

function inputStyle(isDark: boolean): React.CSSProperties {
  return {
    fontFamily: "'Inter', sans-serif", fontSize: '14px',
    background: 'transparent', color: isDark ? '#fff' : '#1a1a1a',
    border: 'none', outline: 'none', width: '100%',
  };
}

/* ─── CountrySelector ──────────────────────────────────────── */
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
        style={{ borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,46,0.1)'}` }}
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
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,46,0.1)'}`,
              boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.7)' : '0 24px 64px rgba(20,18,40,0.18)',
            }}
          >
            {/* Search */}
            <div className="p-2.5" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.06)'}` }}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(26,26,46,0.04)' }}>
                <Search className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} style={{ color: textDim }} />
                <AppInput
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country…" autoFocus
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: "'Inter', sans-serif", fontSize: '12px', color: textPrimary, width: '100%',
                  }}
                />
              </div>
            </div>
            {/* List */}
            <div className="overflow-y-auto max-h-52 scrollbar-hide py-1">
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

/* ─── PhoneField (with dial selector) ─────────────────────── */
function PhoneField({ country, onCountryChange, placeholder, value, onChange, isDark, onEnter }: {
  country: Country; onCountryChange: (c: Country) => void;
  placeholder?: string; value: string; onChange: (v: string) => void;
  isDark: boolean; onEnter?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex items-center gap-0 px-4 py-3.5 rounded-xl transition-all"
      style={{
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.03)',
        border: `1px solid ${focused ? (isDark ? 'rgba(217,255,0,0.5)' : 'rgba(214,249,5,0.6)') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)')}`,
      }}>
      <CountrySelector country={country} onChange={onCountryChange} isDark={isDark} />
      <AppInput
        type="tel" value={value} placeholder={placeholder || 'Phone number'}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
        style={{ ...inputStyle(isDark), paddingLeft: '10px' }}
      />
    </div>
  );
}

/* ─── Generic Field ────────────────────────────────────────── */
function Field({ icon, label, type = 'text', placeholder, value, onChange, isDark, onEnter, optional }: {
  icon: React.ReactNode; label?: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; isDark: boolean; onEnter?: () => void; optional?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.45)';
  return (
    <div>
      {label && (
        <label className="text-[10px] tracking-[1.5px] uppercase mb-2 ml-1 block" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
          {label}{optional && <span className="ml-1 normal-case tracking-normal">· optional</span>}
        </label>
      )}
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all"
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.03)',
          border: `1px solid ${focused ? (isDark ? 'rgba(217,255,0,0.5)' : 'rgba(214,249,5,0.6)') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)')}`,
          }}>
        <span style={{ color: focused ? (isDark ? '#d6f905' : '#0a0a0a') : textDim }}>{icon}</span>
        <AppInput
          type={type} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
          style={inputStyle(isDark)} />
      </div>
    </div>
  );
}

function PasswordField({ value, onChange, isDark, placeholder, onEnter }: { value: string; onChange: (v: string) => void; isDark: boolean; placeholder: string; onEnter?: () => void }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.45)';
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all"
      style={{
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.03)',
        border: `1px solid ${focused ? (isDark ? 'rgba(217,255,0,0.5)' : 'rgba(214,249,5,0.6)') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)')}`,
      }}>
      <span style={{ color: focused ? (isDark ? '#d6f905' : '#0a0a0a') : textDim }}><Lock className="w-4 h-4" /></span>
      <AppInput type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} style={inputStyle(isDark)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }} />
      <AppButton type="button" onClick={() => setShow((s) => !s)} className="cursor-pointer flex-shrink-0" style={{ color: textDim }}>
        {show ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
      </AppButton>
    </div>
  );
}

function OtpInput({ value, onChange, isDark, onComplete }: { value: string; onChange: (v: string) => void; isDark: boolean; onComplete: (code: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');
  const textPrimary = isDark ? '#fff' : '#1a1a1a';

  const setAt = (i: number, ch: string) => {
    const arr = value.padEnd(6, ' ').slice(0, 6).split('');
    arr[i] = ch || ' ';
    const next = arr.join('').replace(/ /g, '');
    onChange(next);
    return next;
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {digits.map((d, i) => (
        <AppInput
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric" maxLength={1}
          value={d.trim()}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1);
            const next = setAt(i, ch);
            if (ch && i < 5) refs.current[i + 1]?.focus();
            if (next.length === 6) onComplete(next);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d.trim() && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (pasted) { onChange(pasted); if (pasted.length === 6) onComplete(pasted); refs.current[Math.min(pasted.length, 5)]?.focus(); }
          }}
          className="w-11 rounded-xl text-center outline-none transition-all"
          style={{
            fontFamily: "'Zalando Sans Expanded', sans-serif", fontSize: '20px', fontWeight: 300,
            height: 52, color: textPrimary,
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.03)',
            border: `1px solid ${d.trim() ? (isDark ? 'rgba(217,255,0,0.5)' : 'rgba(214,249,5,0.6)') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)')}`,
          }}
        />
      ))}
    </div>
  );
}

function GoogleButton({ onClick, disabled, isDark, label }: { onClick: () => void; disabled?: boolean; isDark: boolean; label: string }) {
  return (
    <AppButton whileTap={{ scale: 0.98 }} onClick={onClick} disabled={disabled}
      className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl cursor-pointer disabled:opacity-50"
      style={{ background: '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(26,26,46,0.12)'}` }}>
      <GoogleIcon />
      <span className="text-[14px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: '#1a1a1a' }}>{label}</span>
    </AppButton>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function Divider({ isDark }: { isDark: boolean }) {
  const line = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px" style={{ background: line }} />
      <span className="text-[10px] tracking-[1.5px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,46,0.4)' }}>or</span>
      <div className="flex-1 h-px" style={{ background: line }} />
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
