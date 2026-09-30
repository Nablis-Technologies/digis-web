import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/app/components/ThemeContext';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

/**
 * Bottom sheet shown when the backend refuses to supersede an open checkout
 * for this buyer+event (`active_checkout_exists` / `idempotency_conflict`).
 * The 409 carries no order id and there is no buyer-scoped order lookup, so
 * the only honest action is View Tickets — a continue/start-fresh path needs
 * a backend release route (BACKEND_GAPS #40).
 */
export function ConflictSheet({
  open,
  onViewTickets,
  onClose,
}: {
  open: boolean;
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
              A checkout for this event was started but not finished. If you completed a payment, your
              ticket is in Tickets — otherwise please wait a moment and try again.
            </p>

            <AppButton
              whileTap={{ scale: 0.98 }}
              onClick={onViewTickets}
              className="w-full py-4 rounded-2xl cursor-pointer relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #d9ff00 0%, #d6f905 100%)',
                color: '#000',
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              View Tickets
            </AppButton>
            </div>
          </motion.div>
        </motion.div>
        )}
    </AnimatePresence>
  );
}
