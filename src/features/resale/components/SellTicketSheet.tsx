import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/app/components/ThemeContext';
import { Calendar, MapPin, Clock, Tag, TrendingUp, TrendingDown, Shield, ArrowRight, X, ArrowLeft, AlertTriangle, Check, ChevronDown, ChevronRight, DollarSign, ArrowUpDown, Search, Filter, Sparkles, Crown, Minus, Plus, Ticket, Wallet } from 'lucide-react';
import type { ResaleListing, UserTicket } from '@/types';
import { payoutService, payoutKeys } from '@/services/payout.service';
import { PayoutMethodsSheet, maskAccount, ProviderLogo, PAYOUT_PROVIDERS } from './PayoutMethodsSheet';
import { AppButton } from '@/components/primitives/AppButton';

export function SellTicketSheet({ ticket, onClose, onConfirm, submitting = false }: { ticket: UserTicket; onClose: () => void; onConfirm: (price: number) => void; submitting?: boolean }) {
  const { isDark } = useTheme();
  const [step, setStep] = useState<'price' | 'confirm'>('price');
  const [price, setPrice] = useState(2000);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const platformFee = Math.round(price * 0.08);
  const youReceive = price - platformFee;

  const { data: payoutMethods = [] } = useQuery({ queryKey: payoutKeys.all, queryFn: payoutService.fetchMethods });
  const defaultPayout = payoutMethods.find(m => m.isDefault) ?? payoutMethods[0];
  const hasPayout = !!defaultPayout;

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
        className="relative w-full lg:max-w-[440px] lg:mx-4 rounded-t-3xl lg:rounded-3xl max-h-[90vh] lg:max-h-[85vh] overflow-y-auto"
        style={{
          background: isDark ? '#101115' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
        onClick={e => e.stopPropagation()}>

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
                    className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    }}>
                    <Minus className="w-5 h-5" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }} strokeWidth={1.5} />
                  </AppButton>
                  <div className="text-center">
                    <p className="text-[10px] tracking-[1.5px] uppercase mb-1"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}>
                      Asking Price
                    </p>
                    <p className="text-[32px] font-light"
                      style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                      ETB {price.toLocaleString()}
                    </p>
                  </div>
                  <AppButton whileTap={{ scale: 0.9 }}
                    onClick={() => setPrice(p => p + 100)}
                    className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    }}>
                    <Plus className="w-5 h-5" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }} strokeWidth={1.5} />
                  </AppButton>
                </div>

                {/* Fee breakdown */}
                <div className="rounded-2xl p-4 mb-6"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                      Platform fee (8%)
                    </span>
                    <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
                      - ETB {platformFee.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-px w-full my-2.5" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#34d399' : '#059669' }}>
                      You receive
                    </span>
                    <span className="text-[18px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#34d399' : '#059669' }}>
                      ETB {youReceive.toLocaleString()}
                    </span>
                  </div>
                </div>

                <AppButton whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setStep('confirm')}
                  className="w-full h-[56px] rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer"
                  style={{
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(214,249,5,0.2), rgba(217,255,0,0.1))'
                      : 'linear-gradient(135deg, rgba(214,249,5,0.9), rgba(109,40,217,0.85))',
                    border: `1px solid ${isDark ? 'rgba(214,249,5,0.25)' : 'rgba(214,249,5,0.3)'}`,
                  }}>
                  <span className="text-[14px] font-medium tracking-[0.3px]"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#f4ff66' : '#fff' }}>
                    Continue
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

                <div className="rounded-2xl p-4 mb-4"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                  }}>
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

                {/* Payout destination */}
                <AppButton onClick={() => setPayoutOpen(true)}
                  className="w-full rounded-2xl p-4 mb-4 flex items-center gap-3 text-left cursor-pointer"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${hasPayout ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : (isDark ? 'rgba(214,249,5,0.25)' : 'rgba(109,40,217,0.25)')}`,
                  }}>
                  {hasPayout ? (
                    <ProviderLogo kind={defaultPayout.kind} />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                      <Wallet className="w-5 h-5" style={{ color: isDark ? '#d6f905' : '#6d28d9' }} strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] tracking-[1px] uppercase mb-0.5" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}>
                      Payout to
                    </p>
                    {hasPayout ? (
                      <p className="text-[13px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                        {PAYOUT_PROVIDERS[defaultPayout.kind].full} · {maskAccount(defaultPayout.accountNumber)}
                      </p>
                    ) : (
                      <p className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#d6f905' : '#6d28d9' }}>
                        Add a payout method
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} strokeWidth={1.5} />
                </AppButton>

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

                <div className="flex gap-3">
                  <AppButton whileTap={{ scale: 0.97 }}
                    onClick={() => setStep('price')}
                    className="flex-1 h-[56px] rounded-2xl flex items-center justify-center cursor-pointer"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    }}>
                    <span className="text-[14px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
                      Back
                    </span>
                  </AppButton>
                  <AppButton whileHover={hasPayout ? { scale: 1.02 } : undefined} whileTap={hasPayout ? { scale: 0.97 } : undefined}
                    onClick={() => { if (!submitting && hasPayout) onConfirm(price); else if (!hasPayout) setPayoutOpen(true); }}
                    disabled={submitting}
                    className="flex-1 h-[56px] rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    style={{
                      background: isDark
                        ? 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.08))'
                        : 'linear-gradient(135deg, rgba(5,150,105,0.9), rgba(4,120,87,0.85))',
                      border: `1px solid ${isDark ? 'rgba(52,211,153,0.2)' : 'rgba(5,150,105,0.3)'}`,
                      opacity: hasPayout ? 1 : 0.55,
                    }}>
                    <Check className="w-4 h-4" style={{ color: isDark ? '#34d399' : '#fff' }} strokeWidth={2} />
                    <span className="text-[14px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#34d399' : '#fff' }}>
                      {hasPayout ? 'List Ticket' : 'Add payout'}
                    </span>
                  </AppButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
