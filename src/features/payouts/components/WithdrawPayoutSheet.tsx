import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/app/components/ThemeContext';
import { X, Check, AlertTriangle, Wallet, Landmark } from 'lucide-react';
import { sellerPayoutsService, sellerPayoutKeys } from '@/lib/seller-payouts';
import { sellerReportsKeys } from '@/lib/seller-reports';
import { mapApiError } from '@/lib/errors';
import { toastSuccess } from '@/lib/feedback';
import { randomUuid } from '@/lib/api';
import { Money } from '@/lib/money';
import type { PayoutMethod, SellerBalance } from '@/types';
import type { SellerPayout } from '@/types/seller-payouts';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassControl, glassEdge, glassField } from '@/lib/ui/glass';

const FIELD_ERROR_CLASS = 'flex items-center gap-1.5 mt-1.5 text-[11px] text-red-400';

/**
 * Cash out — request a seller payout (POST /marketplace/seller/payouts). The
 * backend reserves the balance and dispatches asynchronously, so success means
 * "requested" (`pending`), never "paid out". The submitted amount is explicit
 * (default = full available balance); the destination is an explicit verified
 * account so a non-default destination still works.
 */
export function WithdrawPayoutSheet({ balances, destinations, onClose, onSubmitted }: {
  balances: SellerBalance[];
  destinations: PayoutMethod[];
  onClose: () => void;
  onSubmitted: (payout: SellerPayout) => void;
}) {
  const { isDark } = useTheme();
  const qc = useQueryClient();
  // One key for one user intent, so a failed submit can be retried and returns
  // the same payout instead of creating a second one.
  const idempotencyKey = useRef(randomUuid()).current;

  const payable = balances.filter((b) => b.availableMinor > 0);
  const verified = destinations.filter((d) => d.status === 'verified');

  const [currency, setCurrency] = useState(payable[0]?.currency ?? 'ETB');
  const selectedBalance = payable.find((b) => b.currency === currency) ?? payable[0];
  const availableMinor = selectedBalance?.availableMinor ?? 0;

  const fullAmount = Money.fromMinor(availableMinor, currency).toMajor().toString();
  const [amount, setAmount] = useState(fullAmount);
  const [destinationId, setDestinationId] = useState(
    verified.find((d) => d.isDefault)?.id ?? verified[0]?.id ?? '',
  );
  const [touched, setTouched] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);

  const parsed = Number(amount);
  const amountMinor = Number.isFinite(parsed) ? Money.fromMajor(parsed, currency).amountMinor : 0;
  const overBalance = amountMinor > availableMinor;
  const valid = amountMinor > 0 && !overBalance && Boolean(destinationId);
  const amountError = touched && amountMinor <= 0
    ? 'Enter an amount to cash out.'
    : touched && overBalance
      ? 'That’s more than your available balance.'
      : undefined;

  const mutation = useMutation({
    mutationFn: () => sellerPayoutsService.requestPayout({
      currency,
      amountMinor,
      sellerPayoutAccountId: destinationId,
      idempotencyKey,
    }),
    onSuccess: (payout) => {
      void qc.invalidateQueries({ queryKey: sellerPayoutKeys.all });
      void qc.invalidateQueries({ queryKey: sellerReportsKeys.balance });
      void qc.invalidateQueries({ queryKey: sellerReportsKeys.history });
      toastSuccess('Cash out requested — it’s pending.');
      onSubmitted(payout);
      onClose();
    },
  });

  const submit = () => {
    setTouched(true);
    if (valid && !mutation.isPending) mutation.mutate();
  };

  const pickCurrency = (next: string, nextAvailableMinor: number) => {
    setCurrency(next);
    setAmount(Money.fromMinor(nextAvailableMinor, next).toMajor().toString());
  };

  const text = isDark ? '#fff' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const accent = isDark ? '#d6f905' : '#6d28d9';


  const sheet = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end lg:items-center justify-center"
      onClick={onClose}>
      <div className="absolute inset-0"
        style={{ background: isDark ? 'rgba(8,9,11,0.88)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="relative w-full lg:max-w-[440px] lg:mx-4 rounded-t-3xl lg:rounded-3xl max-h-[85vh] lg:max-h-[80vh] overflow-y-auto overflow-x-hidden"
        style={{ background: isDark ? '#101115' : '#fff' }}
        onClick={(e) => e.stopPropagation()}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 contents">
          <div className="flex justify-center pt-3 pb-2 lg:hidden">
            <div className="w-10 h-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} />
          </div>

          <div className="px-6 pb-10 pt-3 lg:pt-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[20px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text }}>
                Cash out
              </h3>
              <AppButton onClick={onClose} className="cursor-pointer">
                <X className="w-5 h-5" style={{ color: muted }} strokeWidth={1.5} />
              </AppButton>
            </div>
            <p className="text-[12px] mb-6" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
              Send your available balance to a payout destination.
            </p>

            {payable.length === 0 ? (
              <div className="relative rounded-2xl overflow-hidden p-6 mb-4 text-center" style={{ background: cardBg }}>
                <GlassReflection isDark={isDark} />
                <p className="relative z-10 text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                  You have no available balance to cash out.
                </p>
              </div>
            ) : (
              <>
                {payable.length > 1 && (
                  <div className="mb-5">
                    <p className="text-[10px] tracking-[1.5px] uppercase mb-2" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                      Currency
                    </p>
                    <div className="flex gap-2">
                      {payable.map((b) => {
                        const active = b.currency === currency;
                        return (
                          <AppButton key={b.currency} whileTap={{ scale: 0.97 }}
                            onClick={() => pickCurrency(b.currency, b.availableMinor)}
                            className="flex-1 h-[44px] rounded-xl cursor-pointer text-[13px] font-medium"
                            style={{
                              fontFamily: "'Inter', sans-serif", color: active ? accent : text,
                              background: active ? (isDark ? 'rgba(214,249,5,0.08)' : 'rgba(109,40,217,0.05)') : cardBg,
                              ...(active ? glassField(isDark, { focused: true }) : glassField(isDark)),
                            }}>
                            {b.currency}
                          </AppButton>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] tracking-[1.5px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                      Amount
                    </label>
                    <AppButton onClick={() => { setAmount(fullAmount); setTouched(true); }} className="cursor-pointer text-[11px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: accent }}>
                      Withdraw all
                    </AppButton>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden" style={glassField(isDark, { error: !!amountError, focused: amountFocused })}>
                    <GlassReflection isDark={isDark} />
                    <AppInput value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
                      onFocus={() => setAmountFocused(true)}
                      onBlur={() => { setAmountFocused(false); setTouched(true); }} error={amountError} errorClassName={FIELD_ERROR_CLASS}
                      className="relative z-10 w-full h-[52px] px-4 text-[15px] outline-none"
                      style={{ fontFamily: "'Inter', sans-serif", color: text, paddingRight: 64 }} />
                    <span className="absolute z-10 right-4 top-1/2 -translate-y-1/2 text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                      {currency}
                    </span>
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                    {Money.fromMinor(availableMinor, currency).format()} available
                  </p>
                </div>

                <div className="mb-6">
                  <p className="text-[10px] tracking-[1.5px] uppercase mb-2" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                    Destination
                  </p>
                  {verified.length === 0 ? (
                    <div className="rounded-2xl p-4 text-center" style={{ background: cardBg }}>
                      <p className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                        Add a verified payout method before you cash out.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {verified.map((d) => {
                        const active = d.id === destinationId;
                        return (
                          <AppButton key={d.id} whileTap={{ scale: 0.98 }} onClick={() => setDestinationId(d.id)}
                            className="rounded-xl p-3 flex items-center gap-3 cursor-pointer text-left"
                            style={{
                              background: active ? (isDark ? 'rgba(214,249,5,0.08)' : 'rgba(109,40,217,0.05)') : cardBg,
                              ...(active ? glassField(isDark, { focused: true }) : glassField(isDark)),
                            }}>
                            <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                              {d.type === 'bank'
                                ? <Landmark className="w-4 h-4" style={{ color: muted }} strokeWidth={1.5} />
                                : <Wallet className="w-4 h-4" style={{ color: muted }} strokeWidth={1.5} />}
                            </span>
                            <span className="min-w-0 flex-1 text-[14px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: text }}>
                              {d.displayName}
                            </span>
                            {active && <Check className="w-4 h-4 flex-shrink-0" style={{ color: accent }} strokeWidth={2.4} />}
                          </AppButton>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {mutation.error && (
              <div className="flex items-start gap-2 mb-4 rounded-xl px-3.5 py-3"
                style={{ ...glassControl(isDark, 'danger') }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#e5484d' }} strokeWidth={2} />
                <p className="text-[12px] leading-snug" style={{ fontFamily: "'Inter', sans-serif", color: '#e5484d' }}>
                  {mapApiError(mutation.error, 'Could not start this cash out. Please try again.')}
                </p>
              </div>
            )}

            <AppButton whileTap={valid ? { scale: 0.98 } : undefined} onClick={submit}
              disabled={!valid || mutation.isPending}
              className="w-full h-[56px] rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              style={{
                background: valid
                  ? (isDark ? 'linear-gradient(135deg, rgba(214,249,5,0.2), rgba(217,255,0,0.1))' : 'linear-gradient(135deg, rgba(214,249,5,0.9), rgba(109,40,217,0.85))')
                  : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                opacity: valid ? 1 : 0.5,
                ...glassEdge(isDark),
              }}>
              <Check className="w-4 h-4" style={{ color: valid ? (isDark ? '#f4ff66' : '#fff') : muted }} strokeWidth={2} />
              <span className="text-[14px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: valid ? (isDark ? '#f4ff66' : '#fff') : muted }}>
                {mutation.isPending ? 'Requesting…' : 'Confirm cash out'}
              </span>
            </AppButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : sheet;
}
