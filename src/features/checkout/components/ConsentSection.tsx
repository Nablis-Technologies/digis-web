import { motion } from 'motion/react';
import type { MouseEvent } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { disabledSurface } from '@/lib/ui/disabledStyles';
import { AppButton } from '@/components/primitives/AppButton';
import { Pulse } from '@/components/loading';
import type { ConsentDocument } from '@/lib/registration';

/**
 * Buyer consent block — rendered on the PAYMENT step, directly above the Pay
 * button (clickwrap best practice: unchecked box = active assent, coupled with
 * the purchase action). Minimal: one row per consent, no heading, no pre-tick.
 * Terms are per-ticket-type, fetched on checkout open; while loading this shows
 * a compact placeholder instead of popping in late, and a fetch failure shows
 * an inline retry.
 */
export function ConsentSection({
  consents, accepted, onToggle, error, isDark, loading = false, loadError, onRetry,
}: {
  consents: ConsentDocument[];
  accepted: Record<string, boolean>;
  onToggle: (versionId: string) => void;
  error?: string;
  isDark: boolean;
  /** Terms still fetching — placeholder rows, not nothing. */
  loading?: boolean;
  loadError?: string;
  onRetry?: () => void;
}) {
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const errorColor = '#e5484d';

  if (loading && consents.length === 0) {
    return (
      <div className="rounded-2xl px-4 py-3"
        style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
        {loadError ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
              {loadError}
            </span>
            <AppButton onClick={onRetry} whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer flex-shrink-0"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: isDark ? '#d6f905' : '#0a0a0a', background: isDark ? 'rgba(217,255,0,0.12)' : 'rgba(214,249,5,0.5)' }}>
              <RefreshCw className="w-3 h-3" strokeWidth={2.2} />
              Retry
            </AppButton>
          </div>
        ) : (
          <div className="flex items-start gap-2.5">
            <Pulse className="w-4 h-4 rounded-[5px] mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Pulse className="h-[12px] w-1/2 rounded" />
              <Pulse className="h-[10px] w-3/4 rounded" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (consents.length === 0) return null;

  return (
    <div className="rounded-2xl px-4 py-3 flex flex-col gap-3"
      style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
      {consents.map((c) => (
        <div
          key={c.versionId}
          onClick={() => onToggle(c.versionId)}
          className="flex items-start gap-2.5 cursor-pointer select-none"
        >
          <AppButton
            whileTap={{ scale: 0.85 }}
            onClick={(e: MouseEvent) => {
              // The row already toggles via bubbling — stop the button's own
              // click reaching it, or every tap toggles twice (net no-op).
              e.stopPropagation();
              onToggle(c.versionId);
            }}
            role="checkbox"
            aria-checked={!!accepted[c.versionId]}
            aria-label={`Accept ${c.title}`}
            className="w-4 h-4 rounded-[5px] flex items-center justify-center flex-shrink-0 mt-0.5"
            style={accepted[c.versionId]
              ? { background: 'linear-gradient(135deg, #d9ff00 0%, #d6f905 100%)', color: '#000' }
              : disabledSurface(isDark)}
          >
            {accepted[c.versionId] && <Check className="w-3 h-3" strokeWidth={3} />}
          </AppButton>
          <span className="flex-1 min-w-0">
            <span className="block text-[12.5px] font-light leading-tight"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
              I agree to the {c.title}
              {c.required && <span style={{ color: errorColor }}> *</span>}
            </span>
            <span className="block text-[10.5px] leading-snug mt-0.5"
              style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
              {c.body}
            </span>
          </span>
        </div>
      ))}
      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px]"
          style={{ fontFamily: "'Inter', sans-serif", color: errorColor }}>
          {error}
        </motion.p>
      )}
    </div>
  );
}