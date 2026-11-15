import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, Plus, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { sellerReportsService, sellerReportsKeys } from '@/lib/seller-reports';
import { sellerPayoutsService, sellerPayoutKeys, sellerPayoutStatusMeta } from '@/lib/seller-payouts';
import { payoutService, payoutKeys } from '@/lib/payout';
import { Money } from '@/lib/money';
import { isoToDisplayDate } from '@/lib/mappers';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { Pulse, useShowSkeleton } from '@/components/loading';
import { PayoutMethodsSheet } from '@/features/resale/components/PayoutMethodsSheet';
import { WithdrawPayoutSheet } from '../components/WithdrawPayoutSheet';

/**
 * Payouts — the seller's cash-out surface. Balance + history come from
 * `GET /marketplace/seller/{balance,history}`; withdrawals from
 * `GET/POST /marketplace/seller/payouts`. A fresh payout is `pending`
 * (dispatch is asynchronous), so the UI never implies "paid out".
 */
export function PayoutsView({ onBack }: { onBack: () => void }) {
  const { isDark } = useTheme();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [methodsOpen, setMethodsOpen] = useState(false);

  const balanceQuery = useQuery({ queryKey: sellerReportsKeys.balance, queryFn: sellerReportsService.fetchBalance });
  const methodsQuery = useQuery({ queryKey: payoutKeys.all, queryFn: payoutService.fetchMethods });
  const payoutsQuery = useInfiniteQuery({
    queryKey: sellerPayoutKeys.list(),
    queryFn: ({ pageParam }) => sellerPayoutsService.fetchPayouts({ page: pageParam, perPage: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const p = last.pagination;
      return p && p.current_page < p.total_pages ? p.current_page + 1 : undefined;
    },
  });

  const balances = balanceQuery.data ?? [];
  const methods = methodsQuery.data ?? [];
  const payouts = payoutsQuery.data?.pages.flatMap((page) => page.payouts) ?? [];

  const payable = balances.filter((b) => b.availableMinor > 0);
  const hasVerifiedDestination = methods.some((m) => m.status === 'verified');
  const showBalanceLoading = useShowSkeleton(balanceQuery.isPending);

  const heading = isDark ? '#fff' : '#0a0a0a';
  const subtle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const muted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  const text = isDark ? '#fff' : '#1a1a1a';
  const accent = isDark ? '#d6f905' : '#6d28d9';
  const cardBg = isDark ? 'rgba(255,255,255,0.035)' : '#fff';
  const rowBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  const primaryButton = (label: string, onClick: () => void, disabled = false) => (
    <AppButton whileTap={disabled ? undefined : { scale: 0.98 }} onClick={onClick} disabled={disabled}
      className="w-full h-[52px] rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
      style={{
        background: disabled
          ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
          : (isDark ? 'linear-gradient(135deg, rgba(214,249,5,0.2), rgba(217,255,0,0.1))' : 'linear-gradient(135deg, rgba(214,249,5,0.9), rgba(109,40,217,0.85))'),
        opacity: disabled ? 0.6 : 1,
      }}>
      <span className="text-[14px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: disabled ? muted : (isDark ? '#f4ff66' : '#fff') }}>
        {label}
      </span>
    </AppButton>
  );

  return (
    <div className="min-h-screen pb-28 lg:pb-12 px-5 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pt-6 lg:pt-10 mb-7">
        <AppButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} onClick={onBack}
          className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
          style={{ background: cardBg }}>
          <GlassReflection isDark={isDark} />
          <span className="relative z-10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} style={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }} />
          </span>
        </AppButton>
        <h1 className="text-[28px] lg:text-[34px] font-light tracking-[-0.5px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: heading }}>
          Payouts
        </h1>
      </div>

      {/* Balance + cash out */}
      <div className="relative p-4 rounded-2xl overflow-hidden" style={{ background: cardBg }}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10">
          {showBalanceLoading ? (
            <div className="space-y-2">
              <Pulse className="h-3 w-28 rounded-md" />
              <Pulse className="h-6 w-40 rounded-md" />
            </div>
          ) : balanceQuery.isError ? (
            <div className="text-center">
              <p className="text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                Couldn’t load your balance.
              </p>
              <AppButton onClick={() => void balanceQuery.refetch()} className="cursor-pointer"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: accent }}>
                Retry
              </AppButton>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.08)' }}>
                  <TrendingUp className="w-5 h-5" style={{ color: isDark ? '#34d399' : '#059669' }} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                    Available to pay out
                  </p>
                  <p className="text-[18px] mt-0.5" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: text }}>
                    {payable.length > 0
                      ? payable.map((b) => Money.fromMinor(b.availableMinor, b.currency).format()).join(' · ')
                      : balances.length > 0
                        ? Money.fromMinor(0, balances[0].currency).format()
                        : '—'}
                  </p>
                  {balances.some((b) => b.reservedMinor > 0) && (
                    <p className="text-[11px] mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                      {balances.filter((b) => b.reservedMinor > 0)
                        .map((b) => `${Money.fromMinor(b.reservedMinor, b.currency).format()} on hold`)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                {payable.length === 0 ? (
                  primaryButton('No balance to cash out', () => {}, true)
                ) : !hasVerifiedDestination ? (
                  <>
                    {primaryButton('Add payout method', () => setMethodsOpen(true))}
                    <p className="text-[11px] mt-2 text-center" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                      Add a verified destination to cash out.
                    </p>
                  </>
                ) : (
                  primaryButton('Cash out', () => setWithdrawOpen(true))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payout history */}
      <div className="mt-7 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" style={{ color: subtle }} strokeWidth={1.75} />
        <h2 className="text-[15px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: heading }}>
          Payout history
        </h2>
      </div>

      {payoutsQuery.isPending ? (
        <div className="flex flex-col gap-2.5">
          <Pulse className="h-[64px] rounded-2xl" />
          <Pulse className="h-[64px] rounded-2xl" />
        </div>
      ) : payoutsQuery.isError ? (
        <div className="relative p-4 rounded-2xl text-center overflow-hidden" style={{ background: rowBg }}>
          <GlassReflection isDark={isDark} />
          <div className="relative z-10">
            <p className="text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
              Couldn’t load your payouts.
            </p>
            <AppButton onClick={() => void payoutsQuery.refetch()} className="cursor-pointer"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: accent }}>
              Retry
            </AppButton>
          </div>
        </div>
      ) : payouts.length === 0 ? (
        <div className="relative p-6 rounded-2xl text-center overflow-hidden" style={{ background: rowBg }}>
          <GlassReflection isDark={isDark} />
          <p className="relative z-10 text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
            No payouts yet. Your cash-outs will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {payouts.map((payout) => {
              const meta = sellerPayoutStatusMeta(payout.status);
              return (
                <motion.div key={payout.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="relative p-3.5 rounded-2xl overflow-hidden flex items-center justify-between gap-3"
                  style={{ background: rowBg }}>
                  <GlassReflection isDark={isDark} />
                  <div className="relative z-10 min-w-0">
                    <p className="text-[14px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: text }}>
                      {Money.fromMinor(payout.amountMinor, payout.currency).format()}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                      Requested {isoToDisplayDate(payout.requestedAt)}
                    </p>
                  </div>
                  <div className="relative z-10 flex items-center gap-1.5 flex-shrink-0">
                    <PayoutStatusIcon status={payout.status} isDark={isDark} />
                    <span className="text-[10px] tracking-[0.4px] uppercase px-2 py-0.5 rounded-md"
                      style={{ fontFamily: "'Inter', sans-serif", ...payoutStatusChip(meta.label, isDark, meta.failed) }}>
                      {meta.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {payoutsQuery.hasNextPage && (
            <AppButton onClick={() => void payoutsQuery.fetchNextPage()} disabled={payoutsQuery.isFetchingNextPage}
              className="w-full h-[46px] rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              style={{ background: rowBg, boxShadow: `inset 0 0 0 1px ${border}` }}>
              <Plus className="w-3.5 h-3.5" style={{ color: text }} strokeWidth={2} />
              <span className="text-[12.5px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: text }}>
                {payoutsQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </span>
            </AppButton>
          )}
        </div>
      )}

      {withdrawOpen && (
        <WithdrawPayoutSheet
          balances={balances}
          destinations={methods}
          onClose={() => setWithdrawOpen(false)}
          onSubmitted={() => void payoutsQuery.refetch()}
        />
      )}
      {methodsOpen && <PayoutMethodsSheet onClose={() => setMethodsOpen(false)} onMethodAdded={() => void methodsQuery.refetch()} />}
    </div>
  );
}

function payoutStatusChip(label: string, isDark: boolean, failed: boolean) {
  const key = label.toLowerCase();
  if (key === 'paid out') {
    return { color: isDark ? '#34d399' : '#059669', background: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.08)' };
  }
  if (failed) {
    return { color: isDark ? '#ff6b70' : '#c0392b', background: isDark ? 'rgba(255,107,112,0.12)' : 'rgba(192,57,43,0.08)' };
  }
  if (key === 'cancelled') {
    return { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' };
  }
  return { color: isDark ? '#d6f905' : '#6d28d9', background: isDark ? 'rgba(214,249,5,0.1)' : 'rgba(109,40,217,0.06)' };
}

function PayoutStatusIcon({ status, isDark }: { status: string; isDark: boolean }) {
  const key = status.toLowerCase();
  const size = 'w-4 h-4';
  if (key === 'succeeded') return <CheckCircle2 className={size} style={{ color: isDark ? '#34d399' : '#059669' }} strokeWidth={1.75} />;
  if (key === 'failed') return <XCircle className={size} style={{ color: isDark ? '#ff6b70' : '#c0392b' }} strokeWidth={1.75} />;
  if (key === 'cancelled') return <XCircle className={size} style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} strokeWidth={1.75} />;
  if (key === 'processing') return <AlertTriangle className={size} style={{ color: isDark ? '#d6f905' : '#6d28d9' }} strokeWidth={1.75} />;
  return <Clock className={size} style={{ color: isDark ? '#d6f905' : '#6d28d9' }} strokeWidth={1.75} />;
}
