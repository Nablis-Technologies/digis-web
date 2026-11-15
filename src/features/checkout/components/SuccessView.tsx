import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Mail, Gift, RefreshCw } from 'lucide-react';
import { SummaryLine } from './OrderSummary';
import { Money } from '@/lib/money';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { AppButton } from '@/components/primitives/AppButton';
import { glassControl } from '@/lib/ui/glass';
import { giftService } from '@/lib/gifts';
import { toastSuccess, toastError } from '@/lib/feedback';

export function SuccessView({
  event,
  ticketType,
  total,
  isDark,
  isGift,
  giftRecipientPhone,
  giftPurchases = [],
  orderId,
}: any) {
  const [resending, setResending] = useState(false);

  const handleResend = async (giftId: string) => {
    if (!orderId || resending) return;
    setResending(true);
    try {
      await giftService.resendGift(orderId, giftId);
      toastSuccess('Claim link resent successfully via SMS!');
    } catch {
      toastError('Could not resend link. Please try again.');
    } finally {
      setResending(false);
    }
  };
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.4)';
  // Cutouts read as holes only when they match the sheet surface behind them.
  const notchColor = isDark ? '#0a0a0a' : '#ffffff';
  const hasTotal = typeof total === 'number';

  return (
    <div className="flex flex-col items-center text-center w-full">
      {/* Confetti orbs */}
      {[
        { x: -120, y: -40, d: 0, c: '#d6f905' },
        { x: 130, y: -50, d: 0.2, c: '#ec4899' },
        { x: -100, y: 60, d: 0.4, c: '#d6f905' },
        { x: 110, y: 80, d: 0.6, c: '#22d3ee' },
        { x: 0, y: -110, d: 0.3, c: '#d9ff00' },
      ].map((s, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: [0, 1, 0.5] }}
          transition={{ duration: 1.4, delay: s.d, ease: 'easeOut' }}
          className="absolute w-2.5 h-2.5 rounded-full"
          style={{ background: s.c }}
        />
      ))}

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.1 }}
        className="relative w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: isGift
            ? 'linear-gradient(135deg, #d9ff00 0%, #d6f905 100%)'
            : 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
          boxShadow: 'none',
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: 'spring', damping: 12, stiffness: 200 }}
        >
          {isGift ? (
            <Gift className="w-9 h-9 text-black" strokeWidth={2.5} />
          ) : (
            <Check className="w-9 h-9 text-white" strokeWidth={3} />
          )}
        </motion.div>
      </motion.div>

      <p className="text-[10px] tracking-[3px] uppercase mb-2"
        style={{ fontFamily: "'Inter', sans-serif", color: isGift ? '#d6f905' : '#34d399' }}>
        {isGift ? 'Gift Ticket Sent' : 'Payment Confirmed'}
      </p>
      <h3 className="text-[26px] font-light mb-2"
        style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
        {isGift ? 'Gift on its way!' : "You're going!"}
      </h3>
      <p className="text-[13px] max-w-[320px] mb-7"
        style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
        {isGift
          ? `We’ve delivered the claim link to ${giftRecipientPhone || 'your recipient'} via SMS.`
          : <>Your ticket for <span style={{ color: textPrimary }}>{event.name}</span> is ready in your collection.</>}
      </p>

      {/* Confirmation ticket — the app's standard glass surface, no glow. */}
      <motion.div
        initial={{ y: -28, opacity: 0, rotate: -3, scale: 0.92 }}
        animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
        transition={{ delay: 0.55, type: 'spring', stiffness: 220, damping: 18 }}
        className="relative w-full flex rounded-2xl overflow-hidden"
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.03)',
        }}
      >
        <GlassReflection isDark={isDark} />

        {/* Main section */}
        <div className="relative z-10 flex-1 p-4 text-left space-y-2.5 min-w-0">
          <SummaryLine label="Event" value={event.name} isDark={isDark} />
          <SummaryLine label="Tier" value={ticketType} isDark={isDark} />
          <SummaryLine label="When" value={`${event.date} · ${event.time}`} isDark={isDark} />
          {isGift && (
            <>
              <SummaryLine label="Recipient" value={giftRecipientPhone || 'Gift Recipient'} isDark={isDark} />
              <SummaryLine label="Delivery" value="SMS claim link" isDark={isDark} />
            </>
          )}
          {hasTotal && (
            <>
              <div className="h-px" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.1)' }} />
              <SummaryLine label="Paid" value={Money.fromMinor(total, "ETB").format()} isDark={isDark} />
            </>
          )}
        </div>

        {/* Vertical perforation + notches */}
        <div className="relative w-px self-stretch my-0 flex-shrink-0">
          <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ background: notchColor }} />
          <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ background: notchColor }} />
          <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-px"
            style={{
              backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.28)' : 'rgba(26,26,46,0.28)'} 0%, ${isDark ? 'rgba(255,255,255,0.28)' : 'rgba(26,26,46,0.28)'} 40%, transparent 45%)`,
              backgroundSize: '2px 6px',
              backgroundRepeat: 'repeat-y',
            }}
          />
        </div>

        {/* Stub */}
        <div className="relative z-10 w-[78px] flex-shrink-0 flex flex-col items-center justify-center gap-2 py-4 px-2">
          {/* Faux barcode */}
          <div className="flex items-end gap-[2px] h-8">
            {[3,7,4,8,2,6,3,7,5,2,8,4].map((h, i) => (
              <div key={i} className="w-[2px] rounded-sm"
                style={{ height: `${h * 3}px`, background: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.5)' }} />
            ))}
          </div>
          <span className="text-[7px] tracking-[2px] uppercase"
            style={{ fontFamily: "'Courier New', ui-monospace, monospace", color: textDim, fontWeight: 700 }}>
            {isGift ? 'Gift Pass' : 'Admit One'}
          </span>
        </div>
      </motion.div>

      {isGift && orderId && giftPurchases?.[0]?.id && (
        <div className="w-full mt-4">
          <AppButton
            whileTap={{ scale: 0.98 }}
            disabled={resending}
            onClick={() => handleResend(giftPurchases[0].id)}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-[13px] font-medium"
            style={glassControl(isDark)}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Resending Link...' : 'Resend Claim Link'}
          </AppButton>
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-5"
        style={{ color: textDim, fontFamily: "'Inter', sans-serif" }}>
        <Mail className="w-3 h-3" strokeWidth={1.8} />
        <span className="text-[10px] tracking-[1px] uppercase">Receipt sent to your email</span>
      </div>
    </div>
  );
}
