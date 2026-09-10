import { motion, AnimatePresence } from 'motion/react';
import { Lock, KeyRound, Check, BadgeCheck, Ticket as TicketIcon, Crown, Sparkles, Mail, Send, ShieldCheck, X, ArrowRight, Hourglass, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import type { InviteUnlockState } from '@/types';
import { disabledSurface } from '@/lib/ui/disabledStyles';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { AppInput } from '@/components/primitives/AppInput';
import { Money } from '@/lib/money';
import { audienceModule } from '@/lib/audience';

interface InviteOnlySectionProps {
  event: any;
  unlock: InviteUnlockState;
  onUnlockChange: (s: InviteUnlockState) => void;
  rsvpConfirmed: boolean;
  onConfirmRsvp: () => void;
  /** Backend Ticketing::TicketType ids for tiers whose audience is NOT public.
   *  When present, the code/invitation is validated against ALL of them via
   *  POST /ticketing/audience_authorizations (backend-authoritative unlock).
   *  When empty (no live gated tiers — mock/draft events), unlock stays local. */
  gatedTicketTypeIds?: string[];
}

export function InviteOnlySection({ event, unlock, onUnlockChange, rsvpConfirmed, onConfirmRsvp, gatedTicketTypeIds = [] }: InviteOnlySectionProps) {
  const { isDark } = useTheme();
  const accent = isDark ? '#d6f905' : '#d6f905';
  const accentRgb = isDark ? '214,249,5' : '214,249,5';
  // Brand yellow is invisible as text/icons on light surfaces — use a readable
  // darkened brand tone for text/icons in light mode (yellow stays for fills).
  const accentText = isDark ? '#d6f905' : '#5a6b00';

  const accessMode: 'code' | 'guestlist' | 'both' | 'request' = event.accessMode || 'code';
  const onGuestList: boolean = event.onGuestList ?? false;
  const guestName: string = event.guestName || 'Friend';
  const accessCodes: string[] = event.accessCodes || [];
  const isPaid: boolean = !!event.inviteOnlyPaid;
  const isWaitlistOnly: boolean = !!event.inviteWaitlistOnly;
  const waitlistAhead: number | undefined = event.waitlistAhead;

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [codeErrorMessage, setCodeErrorMessage] = useState('Invalid code. Check the invite you received.');
  const [checkingCode, setCheckingCode] = useState(false);

  const failCode = (message?: string) => {
    if (message) setCodeErrorMessage(message);
    setCodeError(true);
    setTimeout(() => setCodeError(false), 2200);
  };

  const tryCode = async () => {
    const trimmed = code.trim();
    if (trimmed.length === 0) { failCode(); return; }
    // No live gated tiers to validate against (mock/draft event) — keep the
    // display-only unlock. The backend re-validates at registration regardless.
    if (gatedTicketTypeIds.length === 0) {
      onUnlockChange({ unlocked: true, method: 'code', code: trimmed });
      return;
    }
    setCheckingCode(true);
    try {
      // Authorize against EVERY gated tier: a code valid for any of them opens
      // the gate (tiers may share one code or carry distinct ones).
      const results = await Promise.all(
        gatedTicketTypeIds.map((id) =>
          audienceModule.authorize({ ticketTypeId: id, accessCode: trimmed }).then((r) => r.authorized).catch(() => false),
        ),
      );
      if (results.some((ok) => ok)) {
        onUnlockChange({ unlocked: true, method: 'code', code: trimmed });
      } else {
        failCode('This access code is not valid for this event.');
      }
    } catch {
      failCode('Could not verify that code. Please try again.');
    } finally {
      setCheckingCode(false);
    }
  };

  const acceptGuestlist = () => onUnlockChange({ unlocked: true, method: 'guestlist' });

  const paidTickets = isPaid ? (event.inviteTickets || []) : [];

  return (
    <div>
      {/* Section heading */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, rgba(${accentRgb},0.2), transparent)` }} />
        <h2 className="text-[12px] tracking-[3px] uppercase" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? `rgba(${accentRgb},0.7)` : accentText }}>
          Invite Only
        </h2>
        <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, rgba(${accentRgb},0.2), transparent)` }} />
      </div>

      <div className="flex items-center justify-center gap-1.5 mb-7">
        <ShieldCheck className="w-3 h-3" style={{ color: accentText }} strokeWidth={2} />
        <span className="text-[10px] tracking-[1.5px] uppercase"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
          {isWaitlistOnly ? 'At capacity · Waitlist open' : isPaid ? 'Private event · Tickets after access' : 'Private event · Access required'}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {!unlock.unlocked ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: isDark ? 'rgba(255,255,255,0.025)' : '#fff',
            }}>
            <GlassReflection isDark={isDark} />
            {/* Decorative top */}
            <div className="relative z-10 h-28 overflow-hidden flex items-center justify-center"
              style={{
                background: isDark
                  ? `radial-gradient(ellipse at center, rgba(${accentRgb},0.18) 0%, rgba(${accentRgb},0.04) 40%, transparent 70%)`
                  : `radial-gradient(ellipse at center, rgba(${accentRgb},0.12) 0%, rgba(${accentRgb},0.03) 40%, transparent 70%)`,
              }}>
              {[0, 1, 2].map((i) => (
                <motion.div key={i}
                  className="absolute rounded-full"
                  style={{ border: `1px solid rgba(${accentRgb},${0.18 - i * 0.05})`, width: 60, height: 60 }}
                  animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: 'easeOut' }} />
              ))}
              <motion.div
                className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: isDark ? 'rgba(10,10,10,0.85)' : '#fff',
                  border: `1.5px solid rgba(${accentRgb},0.35)`,
                }}
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
                {isWaitlistOnly ? (
                  <Hourglass className="w-5 h-5" style={{ color: accentText }} strokeWidth={2} />
                ) : (
                  <Lock className="w-5 h-5" style={{ color: accentText }} strokeWidth={2} />
                )}
              </motion.div>
            </div>

            <div className="relative z-10 px-6 pt-2 pb-5 text-center">
              <h3 className="text-[18px] mb-1.5"
                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
                {isWaitlistOnly
                  ? 'All invitations claimed'
                  : accessMode === 'request' ? 'By invitation only' : 'This event is invite only'}
              </h3>
              <p className="text-[12px] leading-relaxed mb-5"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>
                {isWaitlistOnly
                  ? (waitlistAhead != null
                      ? `Join the waitlist — ${waitlistAhead} ahead of you. We'll release seats as guests decline.`
                      : "Join the waitlist — we'll release seats as guests decline.")
                  : accessMode === 'guestlist'
                    ? "Entry is by curated guest list only."
                    : accessMode === 'code'
                      ? "Enter the access code from your invitation to continue."
                      : accessMode === 'request'
                        ? "The host reviews each request personally. Tell them why you'd like to be there."
                        : "Verified guests are admitted automatically. Others may unlock with an access code."}
              </p>

              {/* Waitlist scenario */}
              {isWaitlistOnly && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
                  className="rounded-2xl p-4 mb-2 text-left"
                  style={{
                    background: isDark
                      ? `linear-gradient(135deg, rgba(${accentRgb},0.1), rgba(${accentRgb},0.02))`
                      : `linear-gradient(135deg, rgba(${accentRgb},0.06), rgba(${accentRgb},0.01))`,
                    border: `1px solid rgba(${accentRgb},0.2)`,
                  }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex -space-x-1.5 flex-shrink-0">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-7 h-7 rounded-full"
                          style={{
                            background: ['linear-gradient(135deg,#1a1a1a,#d6f905)','linear-gradient(135deg,#d6f905,#ec4899)','linear-gradient(135deg,#34d399,#10b981)'][i],
                            border: `2px solid ${isDark ? '#0e0e14' : '#fff'}`, zIndex: 5 - i,
                          }} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px]"
                        style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)', fontWeight: 500 }}>
                        {waitlistAhead != null ? `${waitlistAhead} people ahead` : 'Waitlist open'}
                      </p>
                    </div>
                  </div>
                  {/* No public waitlist-join endpoint exists (the waitlist is an
                      authenticated, registration-based flow) — display-only, no
                      fake "joined" state. */}
                  <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                    }}>
                    <Hourglass className="w-3.5 h-3.5" strokeWidth={2} />
                    <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                      Waitlist joins open once registration is available
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Guestlist auto-detected */}
              {!isWaitlistOnly && (accessMode === 'guestlist' || accessMode === 'both') && onGuestList && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
                  className="relative rounded-2xl p-4 mb-4 text-left overflow-hidden"
                  style={{
                    background: isDark
                      ? `linear-gradient(135deg, rgba(${accentRgb},0.12), rgba(${accentRgb},0.04))`
                      : `linear-gradient(135deg, rgba(${accentRgb},0.08), rgba(${accentRgb},0.02))`,
                    border: `1px solid rgba(${accentRgb},0.25)`,
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: accent }}>
                      <BadgeCheck className="w-5 h-5" style={{ color: isDark ? '#000' : '#fff' }} strokeWidth={2.25} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] tracking-[0.3px]"
                        style={{ fontFamily: "'Inter', sans-serif", color: accentText, fontWeight: 600 }}>
                        You're on the list
                      </p>
                      <p className="text-[14px] truncate"
                        style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
                        Welcome, {guestName}
                      </p>
                    </div>
                    <AppButton whileTap={{ scale: 0.96 }}
                      onClick={acceptGuestlist}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full cursor-pointer"
                      style={{ background: isDark ? '#0a0a0a' : '#1a1a1a', color: '#fff' }}>
                      <span className="text-[11px] tracking-[0.3px]"
                        style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                        Continue
                      </span>
                      <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
                    </AppButton>
                  </div>
                </motion.div>
              )}

              {/* NOT on guestlist */}
              {!isWaitlistOnly && accessMode === 'guestlist' && !onGuestList && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                  className="relative rounded-2xl overflow-hidden p-4 mb-4 text-left flex items-start gap-3"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  }}>
                  <GlassReflection isDark={isDark} />
                  <div className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
                    <UserPlus className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }} strokeWidth={2} />
                  </div>
                  <div className="relative z-10 flex-1">
                    <p className="text-[13px] mb-0.5"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 500 }}>
                      Not on the list
                    </p>
                    <p className="text-[11px]"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                      Send a request to the host below
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Code entry */}
              {!isWaitlistOnly && (accessMode === 'code' || accessMode === 'both') && (
                <div className="text-left">
                  <p className="text-[10px] tracking-[1.5px] uppercase mb-2"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                    {accessMode === 'both' && onGuestList ? 'Or enter access code' : 'Access code'}
                  </p>
                  <motion.div
                    animate={codeError ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-2 rounded-2xl p-1.5"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${codeError ? 'rgba(239,68,68,0.5)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}`,
                    }}>
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                      style={{ background: `rgba(${accentRgb},0.1)` }}>
                      <KeyRound className="w-4 h-4" style={{ color: accentText }} strokeWidth={2} />
                    </div>
                    <AppInput
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') tryCode(); }}
                      placeholder="Enter your code"
                      className="flex-1 bg-transparent outline-none text-[14px] tracking-[2px] uppercase"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }} />
                    <AppButton whileTap={{ scale: 0.95 }}
                      onClick={tryCode}
                      disabled={!code.trim() || checkingCode}
                      className="flex-shrink-0 px-4 py-2 rounded-xl disabled:cursor-not-allowed"
                      style={
                        code.trim() && !checkingCode
                          ? {
                              background: isDark ? 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)' : '#0a0a0a',
                              color: isDark ? '#0a0a0a' : '#fff',
                            }
                          : disabledSurface(isDark)
                      }>
                      <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                        {checkingCode ? 'Checking…' : 'Unlock'}
                      </span>
                    </AppButton>
                  </motion.div>
                  <AnimatePresence>
                    {codeError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-[11px] mt-2 ml-1"
                        style={{ fontFamily: "'Inter', sans-serif", color: '#ef4444' }}>
                        {codeErrorMessage}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Request access — there is no backend endpoint for requesting an invite,
                  so this is honest guidance rather than a fake "sent" state. */}
              {!isWaitlistOnly && (
                <div className="mt-5 pt-5"
                  style={{ borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
                  <p className="text-[12px] leading-relaxed"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>
                    No invite? Requesting access in-app isn’t available yet — contact the organizer for an invitation.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ) : unlock.method === 'waitlist' ? (
          <motion.div
            key="waitlist"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-5 text-center"
            style={{
              background: isDark
                ? `linear-gradient(135deg, rgba(${accentRgb},0.1), rgba(${accentRgb},0.02))`
                : `linear-gradient(135deg, rgba(${accentRgb},0.06), rgba(${accentRgb},0.01))`,
              border: `1px solid rgba(${accentRgb},0.22)`,
            }}>
            <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3"
              style={{ background: accent }}>
              <Hourglass className="w-5 h-5" style={{ color: isDark ? '#000' : '#fff' }} strokeWidth={2} />
            </div>
            <p className="text-[16px] mb-1"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
              You're on the waitlist
            </p>
            <p className="text-[12px] mb-3"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>
              {waitlistAhead != null ? `Position #${waitlistAhead + 1} · We'll notify you the moment a seat opens` : "We'll notify you the moment a seat opens"}
            </p>
            <AppButton onClick={() => onUnlockChange({ unlocked: false, method: null })}
              className="text-[10px] tracking-[1.2px] uppercase cursor-pointer"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
              Leave waitlist
            </AppButton>
          </motion.div>
        ) : (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
            <motion.div
              initial={{ scale: 0.96 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 220 }}
              className="relative rounded-3xl p-4 mb-4 overflow-hidden flex items-center gap-3"
              style={{
                background: isDark
                  ? `linear-gradient(135deg, rgba(${accentRgb},0.12), rgba(${accentRgb},0.03))`
                  : `linear-gradient(135deg, rgba(${accentRgb},0.08), rgba(${accentRgb},0.02))`,
                border: `1px solid rgba(${accentRgb},0.25)`,
              }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: accent }}>
                <Sparkles className="w-4 h-4" style={{ color: isDark ? '#000' : '#fff' }} strokeWidth={2.25} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 600 }}>
                  Access granted
                </p>
                <p className="text-[11px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}>
                  {unlock.method === 'guestlist' ? 'Verified via curated guest list' : 'Verified via access code'}
                </p>
              </div>
            </motion.div>

            {isPaid ? (
              <div className="space-y-3">
                <p className="text-[10px] tracking-[1.8px] uppercase mb-1"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                  Choose your access
                </p>
                {paidTickets.map((t: any) => (
                  <InviteTicketCard key={t.name}
                    ticket={t}
                    selected={unlock.selectedTicket === t.name || (!unlock.selectedTicket && t === paidTickets[0])}
                    onSelect={() => onUnlockChange({ ...unlock, selectedTicket: t.name })}
                    accent={accent} accentRgb={accentRgb} accentText={accentText} isDark={isDark} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl p-5"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                }}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `rgba(${accentRgb},0.1)`, border: `1px solid rgba(${accentRgb},0.18)` }}>
                    <Mail className="w-4 h-4" style={{ color: accentText }} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] mb-0.5"
                      style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
                      Confirm attendance
                    </p>
                    <p className="text-[12px] leading-relaxed"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>
                      Your spot is held. Confirm so the host knows you're coming and we can send the venue details.
                    </p>
                  </div>
                </div>
                <AppButton whileTap={{ scale: 0.98 }}
                  onClick={onConfirmRsvp}
                  disabled={rsvpConfirmed}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer"
                  style={{
                    background: rsvpConfirmed
                      ? (isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.1)')
                      : (isDark ? 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)' : '#0a0a0a'),
                    color: rsvpConfirmed ? accent : (isDark ? '#0a0a0a' : '#fff'),
                    border: rsvpConfirmed ? `1px solid rgba(${accentRgb},0.3)` : 'none',
                  }}>
                  {rsvpConfirmed ? (
                    <>
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                      <span className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                        Attendance confirmed
                      </span>
                    </>
                  ) : (
                    <span className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                      Confirm I'm attending
                    </span>
                  )}
                </AppButton>
                <p className="text-center text-[10px] tracking-[1.2px] uppercase mt-3"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>
                  Venue address shared after confirmation
                </p>
              </div>
            )}

            <AppButton onClick={() => onUnlockChange({ unlocked: false, method: null })}
              className="mt-4 mx-auto block text-[10px] tracking-[1.2px] uppercase cursor-pointer"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
              <span className="inline-flex items-center gap-1.5">
                <X className="w-3 h-3" strokeWidth={2} />
                Sign out of this event
              </span>
            </AppButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InviteTicketCard({ ticket, selected, onSelect, accent, accentRgb, accentText, isDark }: {
  ticket: any; selected: boolean; onSelect: () => void;
  accent: string; accentRgb: string; accentText: string; isDark: boolean;
}) {
  return (
    <AppButton
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className="w-full text-left relative rounded-3xl p-5 cursor-pointer overflow-hidden"
      style={{
        background: ticket.premium
          ? (isDark ? 'linear-gradient(155deg, #1e1340 0%, #0e0a18 100%)' : '#fafafa')
          : (isDark ? 'rgba(255,255,255,0.03)' : '#fff'),
        border: `${selected ? '1.5px' : '1px'} solid ${selected
          ? `rgba(${accentRgb},0.4)`
          : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')}`,
      }}>
      {ticket.premium && (
        <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-2xl"
          style={{
            background: `rgba(${accentRgb},0.15)`,
            border: `1px solid rgba(${accentRgb},0.25)`,
            borderTop: 'none', borderRight: 'none',
          }}>
          <div className="flex items-center gap-1">
            <Crown className="w-3 h-3" style={{ color: accentText }} strokeWidth={2} />
            <span className="text-[9px] tracking-[1.5px] uppercase"
              style={{ fontFamily: "'Inter', sans-serif", color: accentText, fontWeight: 600 }}>
              Premium
            </span>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[16px] mb-1"
            style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
            {ticket.name}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[22px] leading-none"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
              {Money.fromMinor(ticket.priceMinor, "ETB").formatNumber()}
            </span>
            <span className="text-[11px] tracking-[1px]"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
              ETB
            </span>
          </div>
        </div>
        <div className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            background: selected ? accent : 'transparent',
            border: selected ? 'none' : `1.5px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
          }}>
          {selected && <Check className="w-3.5 h-3.5" style={{ color: isDark ? '#000' : '#fff' }} strokeWidth={2.5} />}
        </div>
      </div>
      <div className="space-y-1.5">
        {ticket.perks.map((p: string, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full" style={{ background: `rgba(${accentRgb},0.5)` }} />
            <span className="text-[12px]"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)' }}>
              {p}
            </span>
          </div>
        ))}
      </div>
      {ticket.premium && (
        <TicketIcon className="absolute bottom-3 right-3 w-12 h-12 opacity-[0.04]"
          style={{ color: accentText }} strokeWidth={1} />
      )}
    </AppButton>
  );
}
