import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hourglass, Check, X } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassControl, glassField } from '@/lib/ui/glass';
import { waitlistModule } from '@/lib/waitlist';
import { registrationModule } from '@/lib/registration';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ApiError, messageForCode } from '@/lib/errors';
import type { Event, TicketTier } from '@/types';

/**
 * Offer-scoped waitlist join for a sold-out, waitlist-enabled offer.
 * Signed-in buyers join directly; guests prove their phone with the shared
 * OTP flow, then join with the verification token.
 */
export function WaitlistSheet({ slug, offer, dates, accessCode, invitationToken, onClose }: { slug: string; offer: TicketTier; dates: NonNullable<Event['eventDates']>; accessCode?: string; invitationToken?: string; onClose: () => void }) {
  const { isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const accent = '#d6f905';

  const eligibleDates = dates.filter(date => Date.parse(date.startsAt) > Date.now()
    && (!offer.coveredEventDateIds?.length || offer.coveredEventDateIds.includes(date.id)));
  const [dateId, setDateId] = useState('');
  const selectedEventDateId = offer.dateSelection === 'choose_one'
    ? (dateId || (eligibleDates.length === 1 ? eligibleDates[0].id : undefined))
    : undefined;

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [code, setCode] = useState('');
  const [phoneProof, setPhoneProof] = useState<string>();
  const [challengeId, setChallengeId] = useState<string>();
  const [phase, setPhase] = useState<'form' | 'code' | 'done'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [focused, setFocused] = useState(false);

  const notRegistered = async (e: unknown) => {
    setError(e instanceof ApiError ? messageForCode(e.code, e.message) : 'Something went wrong. Please try again.');
  };

  const joinDirect = async (verificationToken?: string) => {
    setLoading(true);
    setError(undefined);
    try {
      await waitlistModule.join(slug, {
        eventProductId: offer.id ?? '',
        selectedEventDateId,
        ...(verificationToken ? { verificationToken } : {}),
        ...(phone ? { phone } : {}),
        // Audience proof for a gated offer — the backend re-authorizes it inside
        // the waitlist submit, so omitting it fails an invite/access-code offer.
        ...(accessCode ? { accessCode } : {}),
        ...(invitationToken ? { invitationToken } : {}),
      });
      setPhase('done');
    } catch (e) {
      if (!verificationToken && e instanceof ApiError && e.code === 'phone_verification_required') {
        // Guest must verify first — fall through to OTP.
        await sendCode();
        return;
      }
      if (verificationToken && e instanceof ApiError && ['phone_verification_invalid', 'phone_verification_required'].includes(e.code)) {
        setPhoneProof(undefined);
        setCode('');
        setPhase('form');
      }
      await notRegistered(e);
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const challenge = await waitlistModule.requestOtp(slug, offer.id ?? '', {
        phone,
        selectedEventDateId,
        ...(accessCode ? { accessCode } : {}),
        ...(invitationToken ? { invitationToken } : {}),
      });
      setChallengeId(challenge.challengeId);
      setPhase('code');
    } catch (e) {
      await notRegistered(e);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndJoin = async () => {
    if (!challengeId) return;
    setLoading(true);
    setError(undefined);
    try {
      const { verificationToken } = await registrationModule.verifyPhoneOtp(challengeId, code);
      setPhoneProof(verificationToken);
      await joinDirect(verificationToken);
    } catch (e) {
      await notRegistered(e);
    } finally {
      setLoading(false);
    }
  };

  const primary = () => {
    if (phase === 'code') return phoneProof ? () => joinDirect(phoneProof) : verifyAndJoin;
    if (isAuthenticated) return () => joinDirect();
    return sendCode;
  };

  const canSubmit = loading || (offer.dateSelection === 'choose_one' && !selectedEventDateId)
    ? false
    : phase === 'code'
      ? !!phoneProof || code.length === 6
      : isAuthenticated || phone.replace(/\D/g, '').length >= 10;

  const label = loading ? 'Please wait…' : phase === 'code' ? (phoneProof ? 'Retry join' : 'Verify & join') : isAuthenticated ? 'Join waitlist' : 'Send code';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(4,4,4,0.66)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        role="dialog" aria-modal="true" aria-label="Ticket waitlist"
        onClick={(e) => e.stopPropagation()}
        className="relative overflow-hidden w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] px-6 pt-6 pb-6"
        style={{ background: 'var(--card)' }}
      >
        <GlassReflection isDark={isDark} />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={glassControl(isDark, 'accent')}>
              <Hourglass className="w-5 h-5" style={{ color: accent }} strokeWidth={2} />
            </div>
            <AppButton onClick={onClose} ariaLabel="Close" className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
              <X className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }} />
            </AppButton>
          </div>

          <AnimatePresence mode="wait">
            {phase === 'done' ? (
              <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="text-[19px] font-light mb-2" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#111' }}>
                  You're on the waitlist
                </h3>
                <p className="text-[13px] leading-relaxed mb-6" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                  Your waitlist request for {offer.name} is confirmed.
                </p>
                <AppButton onClick={onClose} className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)', color: '#0a0a0a' }}>
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                  <span className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Done</span>
                </AppButton>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h3 className="text-[19px] font-light mb-2" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#111' }}>
                  {phase === 'code' ? 'Verify your phone' : 'Join the waitlist'}
                </h3>
                <p className="text-[13px] leading-relaxed mb-5" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                  {phase === 'code'
                    ? 'Enter the code we sent to your phone to confirm.'
                    : 'Join the waitlist for this ticket tier.'}
                </p>

                {phase === 'form' && offer.dateSelection === 'choose_one' && eligibleDates.length !== 1 && (
                  <label className="mb-4 block text-sm">
                    Session date
                    <select value={dateId} onChange={event => setDateId(event.target.value)}
                      className="mt-2 block w-full rounded-xl bg-card p-3" style={glassField(isDark)}>
                      <option value="">{eligibleDates.length ? 'Choose a date' : 'No dates available'}</option>
                      {eligibleDates.map(date => (
                        <option key={date.id} value={date.id}>
                          {new Date(date.startsAt).toLocaleString('en-ET', { dateStyle: 'medium', timeStyle: 'short' })}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {phase === 'code' ? (
                  <InputOTP maxLength={6} value={code} aria-label="Verification code" autoComplete="one-time-code"
                    disabled={loading || !!phoneProof} onChange={value => setCode(value.replace(/\D/g, ''))}>
                    <InputOTPGroup>
                      {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} />)}
                    </InputOTPGroup>
                  </InputOTP>
                ) : !isAuthenticated && (
                  <div className="relative rounded-2xl overflow-hidden" style={glassField(isDark, { error: !!error, focused })}>
                    <GlassReflection isDark={isDark} />
                    <AppInput
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                      placeholder="+251 9.."
                      inputMode="tel"
                      disabled={isAuthenticated}
                      className="relative z-10 w-full h-12 px-4 text-[14px] outline-none"
                      style={{ color: isDark ? '#fff' : '#111' }}
                    />
                  </div>
                )}

                {error && <p role="alert" className="text-[12px] mt-2.5" style={{ fontFamily: "'Inter', sans-serif", color: '#f87171' }}>{error}</p>}

                <AppButton
                  onClick={primary()}
                  disabled={!canSubmit}
                  className="mt-5 w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)', color: '#0a0a0a' }}>
                  <span className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>{label}</span>
                </AppButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
