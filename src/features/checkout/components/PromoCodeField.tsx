import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Tag, X } from 'lucide-react';
import type { AppliedPromo } from '@/features/checkout/hooks/useCheckoutFlow';
import { disabledSurface } from '@/lib/ui/disabledStyles';
import { glassEdge } from '@/lib/ui/glass';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput, AppTextArea } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { Money } from '@/lib/money';

interface PromoCodeFieldProps { promoApplied: AppliedPromo | null; promoCodeInput: string; setPromoCodeInput: (value: string) => void; promoExpanded: boolean; setPromoExpanded: (value: boolean) => void; promoError: string; setPromoError: (value: string) => void; promoLoading: boolean; validatePromo: () => void; removePromo: () => void; discountAmount: number; isDark: boolean; }

export function PromoCodeField({ promoApplied, promoCodeInput, setPromoCodeInput, promoExpanded, setPromoExpanded, promoError, setPromoError, promoLoading, validatePromo, removePromo, discountAmount, isDark }: PromoCodeFieldProps) {
  return (
        <>{promoApplied ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden flex items-center justify-between p-3 rounded-xl"
            style={{
              background: isDark ? 'rgba(52,211,153,0.06)' : 'rgba(34,197,94,0.06)',
            }}>
            <GlassReflection isDark={isDark} />
            <div className="relative z-10 flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(52,211,153,0.12)', ...glassEdge(isDark) }}>
                <Tag className="w-3.5 h-3.5" style={{ color: '#34d399' }} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium truncate"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#34d399' : '#16a34a' }}>
                  {promoApplied.label}
                </p>
                <p className="text-[10px] truncate" style={{ color: isDark ? 'rgba(52,211,153,0.55)' : 'rgba(22,163,74,0.6)', fontFamily: "'Inter', sans-serif" }}>
                  {promoApplied.code} · −{Money.fromMinor(discountAmount, "ETB").format()} per ticket
                </p>
              </div>
            </div>
            <AppButton whileTap={{ scale: 0.9 }} onClick={removePromo}
              className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0 ml-2"
              style={{ background: 'rgba(52,211,153,0.1)' }}>
              <X className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(52,211,153,0.7)' : 'rgba(22,163,74,0.7)' }} strokeWidth={1.5} />
            </AppButton>
          </motion.div>
        ) : (
          <>
            <AppButton
              whileTap={{ scale: 0.98 }}
              onClick={() => setPromoExpanded(!promoExpanded)}
              className="flex items-center gap-2 cursor-pointer">
              <Tag className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(214,249,5,0.6)' : 'rgba(0,0,0,0.7)' }} strokeWidth={1.5} />
              <span className="text-[12px] tracking-[0.3px]"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(214,249,5,0.7)' : 'rgba(0,0,0,0.7)' }}>
                Have a promo code?
              </span>
            </AppButton>
            <AnimatePresence>
              {promoExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden">
                  <div className="flex gap-2 mt-3">
                    <AppInput
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => { setPromoCodeInput(e.target.value.toUpperCase()); setPromoError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && validatePromo()}
                      placeholder="Enter code"
                      className="flex-1 px-4 py-2.5 rounded-xl text-[13px] tracking-[1px] uppercase outline-none placeholder:normal-case placeholder:tracking-normal"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                        color: isDark ? '#fff' : '#1a1a1a',
                      }}
                    />
                    <AppButton
                      whileTap={{ scale: 0.97 }}
                      onClick={validatePromo}
                      disabled={promoLoading || !promoCodeInput.trim()}
                      className="px-4 py-2.5 rounded-xl text-[12px] font-medium tracking-[0.5px] disabled:cursor-not-allowed flex items-center justify-center"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        ...(promoLoading || !promoCodeInput.trim()
                          ? disabledSurface(isDark)
                          : {
                              background: isDark ? 'rgba(214,249,5,0.15)' : 'rgba(214,249,5,0.12)',
                              ...glassEdge(isDark),
                              color: isDark ? '#d6f905' : '#0a0a0a',
                            }),
                        minWidth: 64,
                      }}>
                      {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                    </AppButton>
                  </div>
                  <AnimatePresence>
                    {promoError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-[11px] mt-2 ml-1"
                        style={{ fontFamily: "'Inter', sans-serif", color: '#f87171' }}>
                        {promoError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}</>

  );
}
