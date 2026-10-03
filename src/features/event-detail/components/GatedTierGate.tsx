import { motion, AnimatePresence } from 'motion/react';
import { Lock, KeyRound, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { disabledSurface } from '@/lib/ui/disabledStyles';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge, glassField } from '@/lib/ui/glass';
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
  acceptsCode = true,
  onUnlocked,
  children,
}: GatedTierGateProps) {
  const { isDark } = useTheme();
  const accentRgb = '214,249,5';
  const accentText = isDark ? '#d6f905' : '#5a6b00';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

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
    <div className="rounded-3xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.025)' : '#fff' }}>
      <GlassReflection isDark={isDark} />
      <div className="relative z-10 px-6 py-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
          style={{ background: isDark ? 'rgba(10,10,10,0.85)' : '#fff', boxShadow: `0 0 0 1.5px rgba(${accentRgb},0.35), ${glassEdge(isDark).boxShadow}` }}>
          <Lock className="w-5 h-5" style={{ color: accentText }} strokeWidth={2} />
        </div>
        <h3 className="text-[18px] mb-1.5"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
          {hasPublicTiers ? 'Unlock more tickets' : invitationOnly ? 'Invite-only event' : 'This event requires access'}
        </h3>
        <p className="text-[12px] leading-relaxed mb-5"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>
          {invitationOnly
            ? 'This event is invitation-only. Open the invitation link you received to unlock tickets.'
            : 'Enter the access code or open the invitation link you received to unlock these tickets.'}
        </p>

        {acceptsCode && (
          <motion.div
            animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden flex items-center gap-2 rounded-2xl p-1.5"
            style={glassField(isDark)}>
            <GlassReflection isDark={isDark} edgeState={error ? 'error' : undefined} />
            <div className="relative z-10 flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
              style={{ background: `rgba(${accentRgb},0.1)` }}>
              <KeyRound className="w-4 h-4" style={{ color: accentText }} strokeWidth={2} />
            </div>
            <AppInput
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') tryCode(); }}
              placeholder="Enter your code"
              className="relative z-10 flex-1 min-w-0 bg-transparent outline-none text-[14px] tracking-[2px] uppercase"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }} />
            <AppButton whileTap={{ scale: 0.95 }}
              onClick={tryCode}
              disabled={!code.trim() || checking}
              className="flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-xl disabled:cursor-not-allowed"
              style={
                code.trim() && !checking
                  ? { background: isDark ? 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)' : '#0a0a0a', color: isDark ? '#0a0a0a' : '#fff' }
                  : disabledSurface(isDark)
              }>
              <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                {checking ? 'Checking…' : 'Unlock'}
              </span>
            </AppButton>
          </motion.div>
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

        <div className="flex items-center justify-center gap-1.5 mt-5">
          <ShieldCheck className="w-3 h-3" style={{ color: accentText }} strokeWidth={2} />
          <span className="text-[10px] tracking-[1.5px] uppercase"
            style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
            {invitationOnly ? 'Invitation required' : 'Access required'}
          </span>
        </div>
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

  return panel;
}
