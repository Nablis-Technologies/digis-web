import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/app/components/ThemeContext';
import { Calendar, MapPin, Clock, Tag, TrendingUp, TrendingDown, Shield, ArrowRight, X, ArrowLeft, AlertTriangle, Check, ChevronDown, ChevronRight, DollarSign, ArrowUpDown, Search, Filter, Sparkles, Crown, Minus, Plus, Ticket, Wallet } from 'lucide-react';
import type { ResaleListing, UserTicket } from '@/types';
import { payoutService, payoutKeys } from '@/lib/payout';
import { Money } from '@/lib/money';
import { PayoutMethodsSheet } from './PayoutMethodsSheet';
import { Pulse, useShowSkeleton } from '@/components/loading';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

export function SellTicketSheet({ ticket, onClose, onConfirm, submitting = false, error = null }: { ticket: UserTicket; onClose: () => void; onConfirm: (price: number) => void; submitting?: boolean; error?: string | null }) {
  const { isDark } = useTheme();
  const [step, setStep] = useState<'price' | 'confirm'>('price');
  const [price, setPrice] = useState(2000);
  const [payoutOpen, setPayoutOpen] = useState(false);

  const { data: payoutMethods = [], isPending, isError, refetch } = useQuery({ queryKey: payoutKeys.all, queryFn: payoutService.fetchMethods });
  const showLoading = useShowSkeleton(isPending);

  // Resale policy from the wallet ticket_type projection (#25 resolved).
  // Anything the backend doesn't serve is treated as closed, never assumed open.
  const policy = ticket.resalePolicy;
  const policyBlocked = policy && !policy.enabled;
  const cutoffPassed = (() => {
    if (!policy || !policy.cutoffSecondsBeforeStart) return false;
    const starts = ticket.eventStartsAt; // raw ISO when available
    if (!starts) return false;
    return Date.now() >= new Date(starts).getTime() - policy.cutoffSecondsBeforeStart * 1000;
  })();
  // Fixed cap is the only cap expressible without a face value on the wallet wire.
  // Compare in major units (the price input is major); never divide minor in a component.
  const fixedCapMajor = policy?.capType === 'fixed' && policy.fixedCapMinor != null
    ? Money.fromMinor(policy.fixedCapMinor, 'ETB').toMajor()
    : null;
  const overCap = fixedCapMajor != null && price > fixedCapMajor;
  const blockedReason = policyBlocked
    ? 'Resale is disabled for this ticket.'
    : cutoffPassed
      ? 'The resale window for this event has closed.'
      : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0"
        style={{ background: isDark ? 'rgba(8,9,11,0.88)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="relative w-full lg:max-w-[440px] lg:mx-4 rounded-t-3xl lg:rounded-3xl max-h-[90vh] lg:max-h-[85vh] overflow-y-auto overflow-x-hidden"
        style={{
          background: isDark ? '#101115' : '#fff',
        }}
        onClick={e => e.stopPropagation()}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 contents">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} />
        </div>

        <div className="px-6 pb-10 pt-2 lg:pt-6">
          <AnimatePresence mode="wait">
            {step === 'price' ? (
              <motion.div key="price" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <h3 className="text-[20px] font-light mb-1"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                  Set Your Price
                </h3>
                <p className="text-[12px] mb-6"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                  {ticket.eventName} · {ticket.ticketType}
                </p>

                {/* Price controls */}
                <div className="flex items-center justify-center gap-6 mb-6">
                  <AppButton whileTap={{ scale: 0.9 }}
                    onClick={() => setPrice(p => Math.max(100, p - 100))}
                    disabled={Boolean(blockedReason)}
                    className="relative w-12 h-12 rounded-full overflow-hidden flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    }}>
                    <GlassReflection isDark={isDark} />
                    <span className="relative z-10 flex items-center justify-center">
                    <Minus className="w-5 h-5" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }} strokeWidth={1.5} />
                    </span>
                  </AppButton>
                  <div className="text-center">
                    <p className="text-[10px] tracking-[1.5px] uppercase mb-1"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}>
                      Asking Price
                    </p>
                    <p className="text-[32px] font-light"
                      style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                      {Money.fromMajor(price, 'ETB').format()}
                    </p>
                    {overCap && fixedCapMajor != null && (
                      <p className="text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: '#e5484d' }}>
                        Max {Money.fromMinor(policy!.fixedCapMinor!, 'ETB').format()} (resale cap)
                      </p>
                    )}
                    {/* The wallet carries the policy but not the value a
                        percentage cap is computed from, so we can only state
                        the rule — the backend enforces the ceiling. */}
                    {!overCap && policy?.capType === 'percentage' && policy.percentageCapBps != null && (
                      <p className="text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                        Capped at {Math.round(policy.percentageCapBps / 100)}% of your purchase price
                      </p>
                    )}
                  </div>
                  <AppButton whileTap={{ scale: 0.9 }}
                    onClick={() => setPrice(p => (fixedCapMajor != null ? Math.min(fixedCapMajor, p + 100) : p + 100))}
                    disabled={Boolean(blockedReason) || overCap}
                    className="relative w-12 h-12 rounded-full overflow-hidden flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    }}>
                    <GlassReflection isDark={isDark} />
                    <span className="relative z-10 flex items-center justify-center">
                    <Plus className="w-5 h-5" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }} strokeWidth={1.5} />
                    </span>
                  </AppButton>
                </div>

                {blockedReason && (
                  <div className="flex items-start gap-3 mb-6 p-3 rounded-xl"
                    style={{
                      background: isDark ? 'rgba(229,72,77,0.08)' : 'rgba(229,72,77,0.06)',
                      border: `1px solid ${isDark ? 'rgba(229,72,77,0.2)' : 'rgba(229,72,77,0.18)'}`,
                    }}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: isDark ? '#ff6b70' : '#c0392b' }} strokeWidth={1.5} />
                    <p className="text-[11px] leading-[1.5]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.7)' : '#8a1f1f' }}>
                      {blockedReason}
                    </p>
                  </div>
                )}

                {/* Fee note — the rate is resolved server-side at listing time
                    (fee_terms on the created listing), so no estimate is shown. */}
                <div className="relative rounded-2xl overflow-hidden p-4 mb-6"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  }}>
                  <GlassReflection isDark={isDark} />
                  <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                      Your asking price
                    </span>
                    <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
                      ETB {price.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-px w-full my-2.5" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                  <p className="text-[11px] leading-[1.5]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }}>
                    The event's resale fee is applied when you list — you'll see the exact amount on your live listing.
                  </p>
                  </div>
                </div>

                <AppButton whileHover={!blockedReason ? { scale: 1.02 } : undefined} whileTap={!blockedReason ? { scale: 0.97 } : undefined}
                  onClick={() => setStep('confirm')}
                  disabled={Boolean(blockedReason) || overCap}
                  className="w-full h-[56px] rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(214,249,5,0.2), rgba(217,255,0,0.1))'
                      : 'linear-gradient(135deg, rgba(214,249,5,0.9), rgba(109,40,217,0.85))',
                    border: `1px solid ${isDark ? 'rgba(214,249,5,0.25)' : 'rgba(214,249,5,0.3)'}`,
                    opacity: blockedReason || overCap ? 0.5 : 1,
                  }}>
                  <span className="text-[14px] font-medium tracking-[0.3px]"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#f4ff66' : '#fff' }}>
                    {blockedReason ? 'Cannot list' : 'Continue'}
                  </span>
                  <ArrowRight className="w-4 h-4" style={{ color: isDark ? '#f4ff66' : '#fff' }} strokeWidth={1.5} />
                </AppButton>
              </motion.div>
            ) : (
              <motion.div key="confirm" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <h3 className="text-[20px] font-light mb-1"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                  Confirm Listing
                </h3>
                <p className="text-[12px] mb-6"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                  Review your listing details
                </p>

                <div className="relative rounded-2xl overflow-hidden p-4 mb-4"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  }}>
                  <GlassReflection isDark={isDark} />
                  <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    {ticket.image && <img src={ticket.image} alt="" className="w-12 h-12 rounded-xl object-cover" />}
                    <div>
                      <p className="text-[14px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                        {ticket.eventName}
                      </p>
                      <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                        {ticket.ticketType} · {ticket.eventDate}
                      </p>
                    </div>
                  </div>
                  <div className="h-px w-full my-3" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                  <div className="flex items-center justify-between">
                    <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                      Asking price
                    </span>
                    <span className="text-[16px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                      ETB {price.toLocaleString()}
                    </span>
                  </div>
                  </div>
                </div>

                {/* Payout destination */}
                {showLoading ? (
                  <div className="relative w-full rounded-2xl overflow-hidden p-4 mb-4 flex items-center gap-3"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    }}>
                    <GlassReflection isDark={isDark} />
                    <div className="relative z-10 contents">
                    <Pulse className="w-10 h-10 rounded-xl flex-shrink-0" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Pulse className="h-[10px] w-20 rounded-md" />
                      <Pulse className="h-[13px] w-32 rounded-md" />
                    </div>
                    </div>
                  </div>
                ) : isError ? (
                  <AppButton onClick={() => void refetch()}
                    className="w-full rounded-2xl p-4 mb-4 flex items-center gap-3 text-left cursor-pointer"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${isDark ? 'rgba(229,72,77,0.25)' : 'rgba(229,72,77,0.3)'}`,
                    }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] tracking-[1px] uppercase mb-0.5" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}>
                        Payout methods
                      </p>
                      <p className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#ff6b70' : '#c0392b' }}>
                        Couldn't load — tap to retry
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} strokeWidth={1.5} />
                  </AppButton>
                ) : (
                <AppButton onClick={() => setPayoutOpen(true)}
                  className="w-full rounded-2xl p-4 mb-4 flex items-center gap-3 text-left cursor-pointer"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                    <Wallet className="w-5 h-5" style={{ color: isDark ? '#d6f905' : '#6d28d9' }} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] tracking-[1px] uppercase mb-0.5" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}>
                      Payout
                    </p>
                    <p className="text-[13px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                      {payoutMethods.length ? `${payoutMethods.length} destination${payoutMethods.length > 1 ? 's' : ''} set up` : 'Manage payout methods'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} strokeWidth={1.5} />
                </AppButton>
                )}

                <div className="flex items-start gap-3 mb-6 p-3 rounded-xl"
                  style={{
                    background: isDark ? 'rgba(214,249,5,0.04)' : 'rgba(214,249,5,0.04)',
                    border: `1px solid ${isDark ? 'rgba(214,249,5,0.1)' : 'rgba(214,249,5,0.08)'}`,
                  }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: isDark ? '#d6f905' : '#d97706' }} strokeWidth={1.5} />
                  <p className="text-[11px] leading-[1.5]"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(214,249,5,0.7)' : '#d97706' }}>
                    Your ticket will be transferred to the buyer upon purchase. This action cannot be undone.
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 mb-4 rounded-xl px-3.5 py-3"
                    style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.25)' }}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#e5484d' }} strokeWidth={2} />
                    <p className="text-[12px] leading-snug" style={{ fontFamily: "'Inter', sans-serif", color: '#e5484d' }}>
                      {error}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <AppButton whileTap={{ scale: 0.97 }}
                    onClick={() => setStep('price')}
                    className="relative flex-1 h-[56px] rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    }}>
                    <GlassReflection isDark={isDark} />
                    <span className="relative z-10">
                    <span className="text-[14px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
                      Back
                    </span>
                    </span>
                  </AppButton>
                  <AppButton whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { if (showLoading || submitting) return; onConfirm(price); }}
                    disabled={submitting || showLoading}
                    className="flex-1 h-[56px] rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    style={{
                      background: isDark
                        ? 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.08))'
                        : 'linear-gradient(135deg, rgba(5,150,105,0.9), rgba(4,120,87,0.85))',
                      border: `1px solid ${isDark ? 'rgba(52,211,153,0.2)' : 'rgba(5,150,105,0.3)'}`,
                    }}>
                    <Check className="w-4 h-4" style={{ color: isDark ? '#34d399' : '#fff' }} strokeWidth={2} />
                    <span className="text-[14px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#34d399' : '#fff' }}>
                      List Ticket
                    </span>
                  </AppButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {payoutOpen && (
          <PayoutMethodsSheet
            onClose={() => setPayoutOpen(false)}
            onMethodAdded={() => setPayoutOpen(false)}
            onMethodSelected={() => setPayoutOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   FILTER PANEL
   ═══════════════════════════════════════════════════════ */
