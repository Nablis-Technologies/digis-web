import { motion } from 'motion/react';
import { useState } from 'react';
import { X, Lock, Check } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { ExtrasStep } from '@/features/checkout/components/ExtrasStep';
import type { EventProduct, SelectedEventProduct, UserTicket } from '@/types';
import { primaryButtonSurface } from '@/lib/ui/disabledStyles';
import { AppButton } from '@/components/primitives/AppButton';
import { Money } from '@/lib/money';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge } from '@/lib/ui/glass';

export function AddExtrasDialog({ ticket, products, isSaving = false, done = false, onClose, onConfirm, isLoading = false, error = false, onRetry }: {
  ticket: UserTicket;
  products: EventProduct[];
  isSaving?: boolean;
  done?: boolean;
  onClose: () => void;
  onConfirm: (items: SelectedEventProduct[]) => void;
  isLoading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const { isDark } = useTheme();
  const [selected, setSelected] = useState<SelectedEventProduct[]>([]);
  const total = selected.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const count = selected.reduce((sum, item) => sum + item.quantity, 0);

  const bgPanel = isDark ? '#0a0a0a' : '#ffffff';
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textDim = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,46,0.4)';
  const borderSoft = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.08)';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center"
      style={{
        background: isDark ? 'rgba(4,4,4,0.7)' : 'rgba(232,230,242,0.82)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
      }}
      onClick={() => { if (!isSaving) onClose(); }}>
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-t-[32px] sm:rounded-[32px]"
        style={{ background: bgPanel }}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 contents">
        <div className="relative px-6 pt-5 pb-4 flex items-center justify-between" style={{ boxShadow: `inset 0 -1px 0 ${borderSoft}` }}>
          <div>
            <p className="text-[9px] tracking-[3px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>Add extras</p>
            <p className="text-[13px] mt-0.5 truncate max-w-[240px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary, fontWeight: 300 }}>{ticket.eventName}</p>
          </div>
          <AppButton whileTap={{ scale: 0.9 }} onClick={() => { if (!isSaving) onClose(); }} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.04)', ...glassEdge(isDark) }}>
            <X className="w-4 h-4" strokeWidth={1.8} style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)' }} />
          </AppButton>
        </div>

        <div className="relative flex-1 overflow-y-auto scrollbar-hide px-6 py-5">
          {isLoading ? (
            <p className="text-[13px] py-8 text-center" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>Loading extras…</p>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-[13px] mb-3" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
                Couldn’t load extras for this event.
              </p>
              <AppButton onClick={onRetry} className="cursor-pointer"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 600, color: isDark ? '#d6f905' : '#6d28d9' }}>
                Try again
              </AppButton>
            </div>
          ) : products.length ? (
            <ExtrasStep products={products} selected={selected} onChange={setSelected} isDark={isDark} compact />
          ) : (
            <p className="text-[13px] py-8 text-center" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>No extras are available for this event.</p>
          )}
        </div>

        {products.length > 0 && (
          <div className="relative px-6 pt-4 pb-6" style={{ boxShadow: `inset 0 1px 0 ${borderSoft}` }}>
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <p className="text-[9px] tracking-[2px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>Total</p>
                <span className="text-[22px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>{Money.fromMinor(total, "ETB").format()}</span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: textDim, fontFamily: "'Inter', sans-serif" }}><Lock className="w-3 h-3" strokeWidth={1.8} /><span className="text-[10px] tracking-[1px] uppercase">Secure</span></div>
            </div>
            <AppButton
              whileHover={{ scale: count && !isSaving ? 1.01 : 1 }} whileTap={{ scale: count && !isSaving ? 0.98 : 1 }}
              onClick={() => count && !isSaving && onConfirm(selected)}
              disabled={!count || isSaving}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2.5"
              style={{ ...primaryButtonSurface(Boolean(count) && !isSaving, isDark), fontFamily: "'Inter', sans-serif", fontSize: '14px', letterSpacing: '0.5px', fontWeight: 500 }}>
              {isSaving ? (
                <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 rounded-full" style={{ borderColor: 'currentColor', borderTopColor: 'transparent', opacity: 0.8 }} />Processing…</>
              ) : done ? (
                <><Check className="w-4 h-4" strokeWidth={2.5} />Added</>
              ) : (
                count ? `Pay ${Money.fromMinor(total, "ETB").format()}` : 'Select extras to continue'
              )}
            </AppButton>
          </div>
        )}
        </div>
      </motion.div>
    </motion.div>
  );
}
