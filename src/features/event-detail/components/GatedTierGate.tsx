import { createPortal } from 'react-dom';
import { purchaseBarGlass } from './PurchaseBar';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Lock, KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassControl, glassField } from '@/lib/ui/glass';
import { audienceModule, type AudienceProof } from '@/lib/audience';

interface GatedTierGateProps {
  /** Backend Ticketing::TicketType ids whose audience is NOT public — the proof
   *  is validated against ALL of them (valid for any opens the gate). */
  gatedTicketTypeIds: string[];
  unlocked: boolean;
  /** Invitation token that arrived in the event URL (?invitation=…) — the
   *  backend emails it as a link, so it is auto-tried on mount (no typing). */
  invitationToken?: string;
  /** When some tiers are public, keep them visible while the rest stay locked
   *  (the backend gates per ticket type, not per event). */
  hasPublicTiers?: boolean;
  stickyTarget?: HTMLElement | null;
  /** True when at least one gated offer accepts an access code
   *  (`access_code`/`code_or_invitation`). When false the offers are
   *  `invitation`-only, so a code input could never succeed — show the
   *  invitation-link path instead. */
  acceptsCode?: boolean;
  /** Called with the accepted proof so checkout can carry it as audience_proof. */
  onUnlocked: (proof: AudienceProof) => void;
  children: React.ReactNode;
}

/**
 * Gate for ticket offers whose audience is not public (access_code / invitation
 * / code_or_invitation). The backend is the only validator
 * (POST /ticketing/audience_authorizations). A single pasted value is tried as
 * an access code and then as an invitation token; a token from an invitation
 * link unlocks automatically.
 */
export function GatedTierGate({
  gatedTicketTypeIds,
  unlocked,
  invitationToken,
  hasPublicTiers = false,
  stickyTarget,
  acceptsCode = true,
  onUnlocked,
  children,
}: GatedTierGateProps) {
  const { isDark } = useTheme();
  const accentText = isDark ? '#d6f905' : '#5a6b00';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [focused, setFocused] = useState(false);

  // A token from the invitation link → unlock without the buyer typing anything.
  const idsKey = gatedTicketTypeIds.join(',');
  useEffect(() => {
    if (unlocked || !invitationToken) return;
    let alive = true;
    setChecking(true);
    audienceModule
      .proveInvitation(gatedTicketTypeIds, invitationToken)
      .then((proof) => {
        if (!alive) return;
        if (proof) onUnlocked(proof);
        else setError('This invitation link is not valid for this event.');
      })
      .catch(() => { if (alive) setError('Could not verify your invitation. Please try again.'); })
      .finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitationToken, unlocked, idsKey]);

  const tryCode = async () => {
    const trimmed = code.trim();
    if (trimmed.length === 0) { setError('Enter the access code or invitation from your link.'); return; }
    setChecking(true);
    setError(null);
    try {
      const proof = await audienceModule.resolveProof(gatedTicketTypeIds, trimmed);
      if (proof) onUnlocked(proof);
      else setError('That code or invitation is not valid for this event.');
    } catch {
      setError('Could not verify that code. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  if (unlocked) return <>{children}</>;

  const invitationOnly = !acceptsCode;
  const panel = (
    <div className="relative rounded-2xl overflow-hidden" style={stickyTarget ? purchaseBarGlass(isDark) : { background: isDark ? 'rgba(255,255,255,0.025)' : '#fff' }}>
      <GlassReflection isDark={isDark} />
      <div className={stickyTarget ? "relative z-10 px-4 py-3 sm:px-5" : "relative z-10 p-4"}>
        {(!stickyTarget || invitationOnly) && <div className={invitationOnly ? "flex items-center gap-2.5" : "flex items-center gap-3"}>
        <div className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl"
          style={glassControl(isDark)}>
          <GlassReflection isDark={isDark} />
          <Lock aria-hidden="true" className="relative h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
        <h3 className={invitationOnly ? "mb-1 text-[9px] uppercase leading-none tracking-[1.5px] text-muted-foreground" : "mb-0.5 text-sm"}
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
          {hasPublicTiers ? 'Unlock more tickets' : invitationOnly ? 'Invite only' : 'This event requires access'}
        </h3>
        <p className={invitationOnly ? "text-xs leading-tight" : "text-xs leading-snug"}
          style={{ fontFamily: invitationOnly ? "'Zalando Sans Expanded', sans-serif" : "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)' }}>
          {invitationOnly
            ? 'Open your invitation link'
            : 'Use your access code or invitation link.'}
        </p>

        </div>
        </div>}

        {acceptsCode && (
          <div className={stickyTarget ? "flex items-center justify-between gap-3" : "mt-3"}>
            {stickyTarget && (
              <div className="flex shrink-0 items-center gap-2">
                <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={glassControl(isDark)}>
                  <GlassReflection isDark={isDark} />
                  <Lock aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                </span>
                <div className="hidden min-[380px]:block">
                  <p className="mb-1.5 text-[9px] font-medium uppercase leading-none tracking-[1.8px] text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>Locked</p>
                  <p className="whitespace-nowrap text-[14px] font-light leading-none tracking-[-0.3px] text-foreground" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>Private event</p>
                </div>
              </div>
            )}
          <motion.div
            animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className={stickyTarget ? "relative flex h-11 min-w-0 max-w-[220px] flex-1 items-center overflow-hidden rounded-xl" : "relative flex h-11 min-w-0 items-center gap-2 overflow-hidden rounded-xl px-1"}
            style={glassField(isDark, { error: !!error, focused, shadow: false })}>
            {!stickyTarget && <GlassReflection isDark={isDark} />}
            {!stickyTarget && <div className="relative z-10 flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
              style={glassControl(isDark)}>
              <GlassReflection isDark={isDark} />
              <KeyRound className="w-4 h-4" style={{ color: accentText }} strokeWidth={2} />
            </div>}
            <AppInput
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') tryCode(); }}
              aria-label="Enter your code"
              placeholder={stickyTarget ? "Enter code" : "Enter your code"}
              className={stickyTarget ? "relative z-10 h-full w-full min-w-0 bg-transparent pl-3 pr-12 text-sm outline-none" : "relative z-10 h-full min-w-0 flex-1 bg-transparent pr-12 text-sm outline-none"}
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }} />
            <AppButton whileTap={{ scale: 0.95 }}
              onClick={tryCode}
              ariaLabel={checking ? "Checking access code" : "Unlock"}
              aria-busy={checking}
              disabled={!code.trim() || checking}
              className="absolute right-1 z-20 grid h-8 w-8 place-items-center rounded-lg disabled:cursor-not-allowed"
              style={glassControl(isDark)}>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </AppButton>
          </motion.div>
          </div>
        )}

        {invitationOnly && checking && !error && (
          <p className="text-[11px] mt-2"
            style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
            Checking your invitation…
          </p>
        )}

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-[11px] mt-2"
              style={{ fontFamily: "'Inter', sans-serif", color: '#ef4444' }}>
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // Mixed event: public tiers stay buyable; the panel sits below to unlock the rest.
  if (hasPublicTiers) {
    return (
      <div className="space-y-6">
        {children}
        {panel}
      </div>
    );
  }

  return stickyTarget ? createPortal(panel, stickyTarget) : panel;
}
