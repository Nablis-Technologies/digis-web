import { motion, AnimatePresence } from 'motion/react';
import { Lock, KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { disabledSurface } from '@/lib/ui/disabledStyles';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { audienceModule } from '@/lib/audience';

interface GatedTierGateProps {
  /** Backend Ticketing::TicketType ids whose audience is NOT public — the code
   *  is validated against ALL of them (a code valid for any opens the gate). */
  gatedTicketTypeIds: string[];
  unlocked: boolean;
  onUnlocked: () => void;
  children: React.ReactNode;
}

/**
 * Gate for a ticketed event whose tiers are audience-gated (access_code /
 * invitation / code_or_invitation) but is NOT a config-driven invite-only event.
 * The ticket selector + purchase bar stay hidden until a code that the backend
 * authorizes for ANY gated tier is entered (POST /ticketing/audience_authorizations).
 * This is the server-authoritative version of the old local-only unlock.
 */
export function GatedTierGate({ gatedTicketTypeIds, unlocked, onUnlocked, children }: GatedTierGateProps) {
  const { isDark } = useTheme();
  const accent = isDark ? '#d6f905' : '#d6f905';
  const accentRgb = isDark ? '214,249,5' : '214,249,5';
  const accentText = isDark ? '#d6f905' : '#5a6b00';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const tryCode = async () => {
    const trimmed = code.trim();
    if (trimmed.length === 0) { setError('Enter the access code from your invitation.'); return; }
    setChecking(true);
    setError(null);
    try {
      // Authorize against EVERY gated tier — a code valid for any of them opens
      // the gate (tiers may share one code or carry distinct ones).
      const ok = await audienceModule.authorizeAny(gatedTicketTypeIds, { accessCode: trimmed });
      if (ok) {
        onUnlocked();
      } else {
        setError('This access code is not valid for this event.');
      }
    } catch {
      setError('Could not verify that code. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.025)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
      <GlassReflection isDark={isDark} />
      <div className="relative z-10 px-6 py-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
          style={{ background: isDark ? 'rgba(10,10,10,0.85)' : '#fff', border: `1.5px solid rgba(${accentRgb},0.35)` }}>
          <Lock className="w-5 h-5" style={{ color: accentText }} strokeWidth={2} />
        </div>
        <h3 className="text-[18px] mb-1.5"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
          This event requires access
        </h3>
        <p className="text-[12px] leading-relaxed mb-5"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>
          Enter the access code from your invitation to unlock tickets.
        </p>

        <motion.div
          animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 rounded-2xl p-1.5"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}`,
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
            disabled={!code.trim() || checking}
            className="flex-shrink-0 px-4 py-2 rounded-xl disabled:cursor-not-allowed"
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
            Private event · Access required
          </span>
        </div>
      </div>
    </div>
  );
}