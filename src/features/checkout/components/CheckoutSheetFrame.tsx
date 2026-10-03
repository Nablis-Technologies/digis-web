import { motion } from 'motion/react';
import { ArrowLeft, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge } from '@/lib/ui/glass';

/**
 * The checkout sheet chrome — the rounded-[32px] bottom sheet with header
 * (back + "Checkout"/step title + close) and optional footer. Shared by the
 * normal checkout flow AND the post-Chapa return flow so "Securing your spot",
 * "Confirming your payment", and "You're going!" all live in the same modal.
 */
export function CheckoutSheetFrame({
  isDark,
  title,
  onBack,
  onClose,
  children,
  footer,
  hideSteps,
  steps,
  visibleStep,
}: {
  isDark: boolean;
  title: string;
  onBack?: () => void;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  hideSteps?: boolean;
  steps?: { id: string; label: string }[];
  visibleStep?: number;
}) {
  const bgPanel = isDark ? '#0a0a0a' : '#ffffff';
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const textDim = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,46,0.4)';
  const borderSoft = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.08)';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(4,4,4,0.7)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}>
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative w-full sm:max-w-lg max-h-[94vh] overflow-hidden flex flex-col rounded-t-[32px] sm:rounded-[32px]"
        style={{ background: bgPanel, ...glassEdge(isDark) }}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 contents">
        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${borderSoft}` }}>
          <button
            onClick={onBack}
            aria-label="Back"
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.04)', ...glassEdge(isDark) }}
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.8} style={{ color: textMuted }} />
          </button>
          <div className="flex flex-col items-center">
            <p className="text-[9px] tracking-[3px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>Checkout</p>
            <p className="text-[13px] mt-0.5" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary, fontWeight: 300 }}>
              {title}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.04)', ...glassEdge(isDark) }}
          >
            <X className="w-4 h-4" strokeWidth={1.8} style={{ color: textMuted }} />
          </button>
        </div>

        {/* Step progress */}
        {!hideSteps && steps && steps.length > 0 && (
          <div className="relative px-6 pt-4 pb-2">
            <div className="flex items-center gap-2">
              {steps.map((s, i) => {
                const active = i <= (visibleStep ?? 0);
                const current = i === (visibleStep ?? 0);
                return (
                  <div key={s.id} className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className="relative h-[3px] w-full rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.06)' }}>
                        <motion.div initial={false} animate={{ width: active ? '100%' : '0%' }} transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }} className="absolute inset-y-0 left-0 rounded-full" style={{ background: 'linear-gradient(90deg, #d9ff00, #d6f905)', boxShadow: 'none' }} />
                      </div>
                      <span className="text-[9px] tracking-[1.5px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: current ? (isDark ? '#d6f905' : '#0a0a0a') : textDim, fontWeight: current ? 500 : 400 }}>{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto scrollbar-hide px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer}
        </div>
      </motion.div>
    </motion.div>
  );
}