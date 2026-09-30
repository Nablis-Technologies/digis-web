import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/app/components/ThemeContext';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

/**
 * Bottom sheet shown when the buyer runs into a checkout they already
 * started (active registration from an earlier checkout, or a finished
 * stuck order). Never a bare error: every state offers at least one
 * working action — continue that checkout, replace it, or view Tickets.
 */
export function ConflictSheet({
  open,
  canContinue,
  canReplace,
  onContinue,
  onReplace,
  onViewTickets,
  onClose,
}: {
  open: boolean;
  canContinue: boolean;
  canReplace: boolean;
  onContinue: () => void;
  onReplace: () => void;
  onViewTickets: () => void;
  onClose: () => void;
}) {
  const { isDark } = useTheme();
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,46,0.6)';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="checkout-conflict"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(4,4,4,0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative overflow-hidden w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] px-6 pt-6 pb-6"
            style={{
              background: isDark ? '#0a0a0a' : '#ffffff',
            }}
          >
            <GlassReflection isDark={isDark} />
            <div className="relative z-10">
            <p
              className="text-[9px] tracking-[3px] uppercase mb-2"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#d6f905' : '#0a0a0a' }}
            >
              Checkout in progress
            </p>
            <h3
              className="text-[19px] font-light mb-2"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}
            >
              You have an unfinished checkout
            </h3>
            <p
              className="text-[12.5px] leading-relaxed mb-6"
              style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}
            >
              A checkout for this event was started but not finished — you don&apos;t have a ticket for
              it yet. Continue where you left off, or discard it and start fresh.
            </p>

            <div className="flex flex-col gap-2.5">
              {canContinue && (
                <AppButton
                  whileTap={{ scale: 0.98 }}
                  onClick={onContinue}
                  className="w-full py-4 rounded-2xl cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #d9ff00 0%, #d6f905 100%)',
                    color: '#000',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  Continue checkout
                </AppButton>
              )}
              {canReplace && (
                <AppButton
                  whileTap={{ scale: 0.98 }}
                  onClick={onReplace}
                  className="w-full py-4 rounded-2xl cursor-pointer relative overflow-hidden"
                  style={{
                    background: 'transparent',
                    color: textPrimary,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  <GlassReflection isDark={isDark} />
                  <span className="relative z-10">Discard &amp; start fresh</span>
                </AppButton>
              )}
              <AppButton
                whileTap={{ scale: 0.98 }}
                onClick={onViewTickets}
                className="w-full py-4 rounded-2xl cursor-pointer relative overflow-hidden"
                style={{
                  background: 'transparent',
                  color: textMuted,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                <GlassReflection isDark={isDark} />
                <span className="relative z-10">View Tickets</span>
              </AppButton>
            </div>
            </div>
          </motion.div>
        </motion.div>
        )}
    </AnimatePresence>
  );
}
