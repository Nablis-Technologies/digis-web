import { randomUuid } from '@/lib/api';
import { OtpCodeField, PasswordField } from '@/features/auth/components/AuthFormFields';
import { primaryButtonSurface } from '@/lib/ui/disabledStyles';
import { motion } from 'motion/react';
import { X, Phone, ArrowRight, Check, UserCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import type { UserTicket } from '@/types';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { registrationModule } from '@/lib/registration';
import { guestWallet } from '@/lib/guest-wallet';
import { ApiError, mapApiError, mapFieldErrors } from '@/lib/errors';
import { FieldError } from '@/components/primitives/FieldError';
import { glassField } from '@/lib/ui/glass';

/**
 * Guest ticket → account claim (#31 resolved). A guest whose ticket carries a
 * signed view token + registration id ("Save to my account") proves phone
 * ownership via OTP, sets a password, and is signed in — the ticket then lives
 * in the account wallet instead of only the device wallet.
 */
export function ClaimGuestSheet({ ticket, onClose, onClaimed }: {
  ticket: UserTicket;
  onClose: () => void;
  onClaimed: () => void;
}) {
  const { isDark } = useTheme();
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [otpStage, setOtpStage] = useState<'idle' | 'sending' | 'sent' | 'submitting'>('idle');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const proof = useRef<string | null>(null);
  const claimKey = useRef(randomUuid());
  const [accountClaimed, setAccountClaimed] = useState(false);
  // Per-field messages so a failure points at the input that caused it; `formError`
  // carries anything that names no field (API/ownership failures).
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const busy = otpStage === 'sending' || otpStage === 'submitting';
  const panel = useRef<HTMLElement>(null);
  const busyRef = useRef(busy);
  const closeRef = useRef(onClose);
  busyRef.current = busy;
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.querySelector<HTMLInputElement>('input')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!busyRef.current) closeRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex="0"]') ?? [])].filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) { event.preventDefault(); panel.current?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard, true);
    return () => { document.removeEventListener('keydown', keyboard, true); if (previous?.isConnected) previous.focus(); };
  }, []);

  // Pre-fill the phone we already captured at guest checkout, so the buyer
  // never re-types what we know — they only confirm it with the OTP.
  useEffect(() => {
    let alive = true;
    void guestWallet.getPhone(ticket.id).then((stored) => {
      if (alive && stored) setPhone((cur) => cur || stored);
    });
    return () => { alive = false; };
  }, [ticket.id]);

  const text = isDark ? '#fff' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.64)' : 'rgba(0,0,0,0.64)';
  const surface = isDark ? '#101115' : '#fff';
  const accent = '#d6f905';

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const inputSurface = (invalid = false, field = ''): React.CSSProperties => glassField(isDark, { error: invalid, focused: focusedField === field });
  const inputStyle: React.CSSProperties = { color: text, fontFamily: "'Inter', sans-serif" };
  const focusProps = (field: string) => ({ onFocus: () => setFocusedField(field), onBlur: () => setFocusedField(null) });

  const clearAll = () => { setErrors({}); setFormError(''); };
  const clearField = (field: string) => setErrors((prev) => {
    if (!prev[field]) return prev;
    const next = { ...prev };
    delete next[field];
    return next;
  });

  const validatePhone = (): boolean => {
    if (phone.replace(/\D/g, '').length < 9) {
      setErrors({ phone: 'Add the phone number you checked out with.' });
      return false;
    }
    return true;
  };
  const validateClaim = (): boolean => {
    const next: Record<string, string> = {};
    if (!accountClaimed && !/^\d{6}$/.test(otpCode)) next.otp = 'Enter the 6-digit code we sent.';
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (password !== passwordConfirm) next.passwordConfirm = 'Passwords do not match.';
    if (Object.keys(next).length) { setErrors(next); return false; }
    return true;
  };

  const sendCode = async () => {
    if (busy || accountClaimed) return;
    clearAll();
    if (!validatePhone()) return;
    if (!ticket.ticketViewToken) {
      setFormError('This ticket can’t be claimed — no signed view token.');
      return;
    }
    proof.current = null;
    claimKey.current = randomUuid();
    setOtpStage('sending');
    try {
      const { challengeId: id } = await registrationModule.claimOtpRequest(ticket.ticketViewToken, phone);
      setChallengeId(id);
      setOtpCode('');
      setOtpStage('sent');
      requestAnimationFrame(() => panel.current?.querySelector<HTMLInputElement>('input[autocomplete="one-time-code"]')?.focus());
    } catch (err) {
      setFormError(mapApiError(err));
      setOtpStage('idle');
    }
  };

  const claim = async () => {
    if (busy) return;
    clearAll();
    if (!validateClaim()) return;
    if (!ticket.registrationId || !challengeId) {
      setFormError('Something went wrong — please try again.');
      return;
    }
    setOtpStage('submitting');
    try {
      if (!accountClaimed) {
        if (!proof.current) {
          const verified = await registrationModule.verifyPhoneOtp(challengeId, otpCode);
          proof.current = verified.verificationToken;
        }
        await registrationModule.claimGuest(ticket.registrationId, {
          phone, verificationToken: proof.current, password, passwordConfirmation: passwordConfirm,
        }, claimKey.current);
        setAccountClaimed(true);
      }
      // The claim set this password on the identity — sign in with it so the
      // ticket appears in the account wallet.
      const result = await signIn(phone, password);
      if (!result.ok) {
        setFormError(`Your account was saved. ${result.error ?? 'We could not sign you in.'} Retry signing in.`);
        setOtpStage('sent');
        return;
      }
      onClaimed();
    } catch (err) {
      // Backend field errors (e.g. a rejected password) point at their input.
      if (err instanceof ApiError && ['code_invalid', 'code_format_invalid', 'verification_expired', 'attempts_exhausted', 'verification_already_used'].includes(err.code ?? '')) {
        proof.current = null;
        setErrors({ otp: mapApiError(err) });
        setOtpStage('sent');
        return;
      }
      const { fields, general } = mapFieldErrors(err instanceof ApiError ? err.fieldErrors : undefined);
      const mapped: Record<string, string> = {};
      if (fields.password) mapped.password = fields.password;
      if (fields.passwordConfirmation) mapped.passwordConfirm = fields.passwordConfirmation;
      if (Object.keys(mapped).length) setErrors(mapped);
      setFormError(general.join(' ') || (Object.keys(mapped).length ? '' : mapApiError(err)));
      setOtpStage('sent');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end sm:items-center sm:justify-center"
      style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)' }}
      onClick={() => { if (!busy) onClose(); }}
    >
      <motion.section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Save to my account"
        initial={{ y: 44, opacity: 0, scale: 0.985 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 44, opacity: 0, scale: 0.985 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-t-[28px] sm:rounded-[28px]"
        style={{ background: surface }}
      >
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)' }} /></div>
        <div className="relative z-10 px-5 sm:px-6 pt-4 pb-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl grid place-items-center" style={{ background: isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.16)' }}>
                  <UserCheck className="w-4 h-4" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2} />
                </div>
                <span className="text-[10px] tracking-[1.8px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: muted, fontWeight: 700 }}>Save to my account</span>
              </div>
              <h3 className="text-[21px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text }}>Keep this ticket for good</h3>
              <p className="text-[12px] mt-1" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                Link your <span style={{ color: text }}>{ticket.eventName}</span> ticket to an account so it stays in My Tickets on any device.
              </p>
            </div>
            <AppButton onClick={() => { if (!busy) onClose(); }} disabled={busy} aria-label="Close claim" className="w-9 h-9 rounded-full grid place-items-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: muted }}><X className="w-4 h-4" /></AppButton>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="claim-phone" className="text-[10px] tracking-[1.4px] uppercase mb-1.5 block" style={{ fontFamily: "'Inter', sans-serif", color: muted, fontWeight: 700 }}>Phone</label>
              <div className="relative rounded-xl overflow-hidden" style={inputSurface(Boolean(errors.phone), 'phone')}>
                <GlassReflection isDark={isDark} />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10" style={{ color: muted }}><Phone className="w-4 h-4" /></span>
                <AppInput
                  id="claim-phone" type="tel" value={phone} disabled={challengeId !== null || busy}
                  onChange={(e) => { setPhone(e.target.value); clearField('phone'); }}
                  {...focusProps('phone')}
                  placeholder="The phone you checked out with"
                  className="relative z-10 w-full h-12 pl-10 pr-3.5 outline-none text-[13px]"
                  style={inputStyle} aria-invalid={errors.phone ? true : undefined}
                />
              </div>
              <FieldError error={errors.phone} />
            </div>

            {challengeId !== null && (
              <>
                <div>
                  <label className="text-[10px] tracking-[1.4px] uppercase mb-1.5 block" style={{ fontFamily: "'Inter', sans-serif", color: muted, fontWeight: 700 }}>Verification code</label>
                  <OtpCodeField autoFocus value={otpCode} onChange={value => { setOtpCode(value); clearField('otp'); }} isDark={isDark} error={errors.otp} disabled={busy || proof.current !== null || accountClaimed} />
                  <p className="mt-2 text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                    We sent a code to <span style={{ color: text }}>{phone}</span>.{' '}
                    <AppButton type="button" onClick={sendCode} disabled={busy || accountClaimed} className="inline min-h-9 text-[11px] underline" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? accent : '#0a0a0a' }}>Resend code</AppButton>
                  </p>
                </div>

                <div>
                  <label className="text-[10px] tracking-[1.4px] uppercase mb-1.5 block" style={{ fontFamily: "'Inter', sans-serif", color: muted, fontWeight: 700 }}>Create a password</label>
                  <PasswordField value={password} onChange={value => { setPassword(value); claimKey.current = randomUuid(); clearField('password'); }} isDark={isDark} label="Create a password" placeholder="At least 8 characters" autoComplete="new-password" error={errors.password} disabled={busy || accountClaimed} />
                  <div className="mt-3"><PasswordField value={passwordConfirm} onChange={value => { setPasswordConfirm(value); claimKey.current = randomUuid(); clearField('passwordConfirm'); }} isDark={isDark} label="Confirm password" placeholder="Repeat password" autoComplete="new-password" error={errors.passwordConfirm} disabled={busy || accountClaimed} /></div>
                </div>
              </>
            )}

            {formError && <FieldError error={formError} className="flex items-start gap-1.5 text-[11px]" />}
          </div>

          <AppButton
            onClick={otpStage === 'sent' ? claim : sendCode}
            disabled={otpStage === 'sending' || otpStage === 'submitting'}
            className="mt-5 w-full h-12 rounded-2xl flex items-center justify-center gap-2"
            style={{ ...primaryButtonSurface(!busy, isDark), color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13 }}
          >
            {otpStage === 'submitting' ? (accountClaimed ? 'Signing in…' : 'Linking…') : accountClaimed ? 'Retry sign in' : otpStage === 'sent' ? 'Claim my tickets' : otpStage === 'sending' ? 'Sending…' : 'Send code'}
            {otpStage === 'sent' && <Check className="w-4 h-4" strokeWidth={2.4} />}
            {otpStage === 'idle' && <ArrowRight className="w-4 h-4" strokeWidth={2.2} />}
          </AppButton>
        </div>
      </motion.section>
    </motion.div>
  );
}
