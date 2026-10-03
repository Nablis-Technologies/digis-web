import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/app/components/ThemeContext';
import { X, Plus, Check, ArrowLeft, Wallet, Landmark, AlertTriangle, Loader2 } from 'lucide-react';
import { payoutService, payoutKeys, statusLabel } from '@/lib/payout';
import { mapApiError } from '@/lib/errors';
import { toastSuccess } from '@/lib/feedback';
import type { PayoutMethod, AddPayoutMethodInput } from '@/types';
import { Pulse, useShowSkeleton } from '@/components/loading';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge } from '@/lib/ui/glass';

/** Shared styling for AppInput's built-in error output. */
const FIELD_ERROR_CLASS = 'flex items-center gap-1.5 mt-1.5 text-[11px] text-red-400';

export function PayoutMethodsSheet({ onClose, onMethodAdded, onMethodSelected }: { onClose: () => void; onMethodAdded?: (method: PayoutMethod) => void; onMethodSelected?: (method: PayoutMethod) => void }) {
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);

  const { data: methods = [], isPending, isError, refetch } = useQuery({ queryKey: payoutKeys.all, queryFn: payoutService.fetchMethods });
  const showLoading = useShowSkeleton(isPending);

  const addMutation = useMutation({
    mutationFn: (input: AddPayoutMethodInput) => payoutService.addMethod(input),
    onSuccess: (method) => {
      void qc.invalidateQueries({ queryKey: payoutKeys.all });
      setAdding(false);
      // The form closes on success, so confirm it transiently.
      toastSuccess('Payout method saved.');
      onMethodAdded?.(method);
    },
  });

  // Picking a verified destination makes it the default server-side (used by a
  // cash-out that omits the destination). There is no removal endpoint.
  const defaultMutation = useMutation({
    mutationFn: (id: string) => payoutService.setDefault(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: payoutKeys.all }); },
  });

  const selectMethod = (method: PayoutMethod) => {
    onMethodSelected?.(method);
    if (method.status === 'verified' && !method.isDefault && !defaultMutation.isPending) {
      defaultMutation.mutate(method.id);
    }
  };

  const text = isDark ? '#fff' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  const sheet = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end lg:items-center justify-center"
      // stopPropagation: this sheet is portaled but still bubbles React events to
      // its parent (the sell sheet). Without this, a backdrop click would close both.
      onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="absolute inset-0"
        style={{ background: isDark ? 'rgba(8,9,11,0.88)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="relative w-full lg:max-w-[440px] lg:mx-4 rounded-t-3xl lg:rounded-3xl max-h-[85vh] lg:max-h-[80vh] overflow-y-auto overflow-x-hidden"
        style={{ background: isDark ? '#101115' : '#fff',
          boxShadow: 'none' }}
        onClick={e => e.stopPropagation()}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 contents">

        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} />
        </div>

        <div className="px-6 pb-10 pt-3 lg:pt-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {adding && (
                <AppButton onClick={() => setAdding(false)} className="cursor-pointer -ml-1">
                  <ArrowLeft className="w-5 h-5" style={{ color: muted }} strokeWidth={1.5} />
                </AppButton>
              )}
              <h3 className="text-[20px] font-light"
                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text }}>
                {adding ? 'Add payout method' : 'Payout methods'}
              </h3>
            </div>
            <AppButton onClick={onClose} className="cursor-pointer">
              <X className="w-5 h-5" style={{ color: muted }} strokeWidth={1.5} />
            </AppButton>
          </div>
          <p className="text-[12px] mb-6" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
            {adding ? 'Where should we send your resale proceeds?' : 'Where you get paid when your tickets sell'}
          </p>

          <AnimatePresence mode="wait">
            {adding ? (
              <AddPayoutForm key="form" onSubmit={i => addMutation.mutate(i)} submitting={addMutation.isPending}
                continueAfterSave={Boolean(onMethodAdded)}
                error={addMutation.error ? mapApiError(addMutation.error, 'Could not save this payout method. Please try again.') : null}
                isDark={isDark} text={text} muted={muted} cardBg={cardBg} cardBorder={cardBorder} />
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {showLoading ? (
                  <div className="flex flex-col gap-2.5 mb-4">
                    <PayoutRowSkeleton isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} />
                    <PayoutRowSkeleton isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} />
                  </div>
                ) : isError ? (
                  <div className="relative rounded-2xl overflow-hidden p-4 mb-4 text-center"
                    style={{ background: cardBg }}>
                    <GlassReflection isDark={isDark} />
                    <div className="relative z-10">
                    <p className="text-[13px] mb-3" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                      Couldn't load payout methods.
                    </p>
                    <AppButton onClick={() => void refetch()} className="cursor-pointer"
                      style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: isDark ? '#d6f905' : '#0a0a0a' }}>
                      Retry
                    </AppButton>
                    </div>
                  </div>
                ) : methods.length === 0 ? (
                  <div className="relative rounded-2xl overflow-hidden p-6 mb-4 text-center"
                    style={{ background: cardBg }}>
                    <GlassReflection isDark={isDark} />
                    <div className="relative z-10">
                    <p className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                      No payout methods yet. Add one to start receiving payments.
                    </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 mb-4">
                    {methods.map(m => (
                      <PayoutRow key={m.id} method={m} isDark={isDark} text={text} muted={muted}
                        cardBg={cardBg} cardBorder={cardBorder}
                        saving={defaultMutation.isPending && defaultMutation.variables === m.id}
                        onSelect={() => selectMethod(m)} />
                    ))}
                  </div>
                )}

                <AppButton whileTap={{ scale: 0.98 }} onClick={() => { addMutation.reset(); setAdding(true); }}
                  className="w-full h-[52px] rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer"
                  style={{ background: cardBg, border: `1px dashed ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}` }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                    <Plus className="w-3.5 h-3.5" style={{ color: text }} strokeWidth={2.2} />
                  </span>
                  <span className="text-[13px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: text }}>
                    {methods.length ? 'Add another payout method' : 'Add payout method'}
                  </span>
                </AppButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : sheet;
}

function PayoutRow({ method, isDark, text, muted, cardBg, cardBorder, saving, onSelect }: {
  method: PayoutMethod; isDark: boolean; text: string; muted: string; cardBg: string; cardBorder: string;
  saving: boolean; onSelect: () => void;
}) {
  const verified = method.status === 'verified';
  const accent = isDark ? '#d6f905' : '#0a0a0a';
  return (
    <div className="relative rounded-2xl overflow-hidden p-1.5 flex items-center gap-1.5" style={{ background: cardBg }}>
      <GlassReflection isDark={isDark} />
      <AppButton onClick={onSelect}
        className="relative z-10 min-w-0 flex-1 flex items-center gap-3 p-2.5 rounded-xl text-left cursor-pointer"
        style={{ background: 'transparent' }}>
        <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
          {method.type === 'bank'
            ? <Landmark className="w-5 h-5" style={{ color: muted }} strokeWidth={1.5} />
            : <Wallet className="w-5 h-5" style={{ color: muted }} strokeWidth={1.5} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: text }}>
              {method.displayName}
            </p>
            <span className="text-[9px] tracking-[0.5px] uppercase px-1.5 py-0.5 rounded-md"
              style={{
                fontFamily: "'Inter', sans-serif",
                color: verified ? (isDark ? '#34d399' : '#059669') : muted,
                background: verified
                  ? (isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.08)')
                  : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
              }}>
              {statusLabel(method.status)}
            </span>
            {method.isDefault && (
              <span className="text-[9px] tracking-[0.5px] uppercase px-1.5 py-0.5 rounded-md"
                style={{ fontFamily: "'Inter', sans-serif", color: accent, background: isDark ? 'rgba(214,249,5,0.1)' : 'rgba(10,10,10,0.06)' }}>
                Default
              </span>
            )}
          </div>
        </div>
        {saving ? (
          <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" style={{ color: accent }} strokeWidth={2} />
        ) : method.isDefault ? (
          <Check className="w-4 h-4 flex-shrink-0" style={{ color: accent }} strokeWidth={2.4} />
        ) : verified ? (
          <span className="text-[11px] flex-shrink-0" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>Set default</span>
        ) : null}
      </AppButton>
    </div>
  );
}

function PayoutRowSkeleton({ isDark, cardBg, cardBorder }: { isDark: boolean; cardBg: string; cardBorder: string }) {
  return (
    <div className="relative rounded-2xl overflow-hidden p-1.5 flex items-center gap-1.5" style={{ background: cardBg }}>
      <GlassReflection isDark={isDark} />
      <div className="relative z-10 contents">
      <div className="min-w-0 flex-1 flex items-center gap-3 p-2.5 rounded-xl">
        <Pulse className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Pulse className="h-[14px] w-24 rounded-md" />
          <Pulse className="h-[11px] w-32 rounded-md" />
        </div>
        <Pulse className="w-5 h-5 rounded-full flex-shrink-0" />
      </div>
      </div>
    </div>
  );
}

function AddPayoutForm({ onSubmit, submitting, continueAfterSave = false, error = null, isDark, text, muted, cardBg, cardBorder }: {
  onSubmit: (input: AddPayoutMethodInput) => void; submitting: boolean; continueAfterSave?: boolean;
  error?: string | null;
  isDark: boolean; text: string; muted: string; cardBg: string; cardBorder: string;
}) {
  // Destinations come from the provider (via the backend), never hardcoded:
  // whichever rails it supports for this market are the ones we offer.
  const { data: banks = [], isPending, isError, refetch } = useQuery({
    queryKey: payoutKeys.banks,
    queryFn: payoutService.fetchBanks,
  });
  const showBanksLoading = useShowSkeleton(isPending);
  const [bankSlug, setBankSlug] = useState('');
  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [touched, setTouched] = useState<{ holderName?: boolean; accountNumber?: boolean }>({});

  const selected = banks.find((bank) => bank.bankSlug === bankSlug) ?? null;
  const isPhone = selected?.type === 'mobile_money';
  const valid = Boolean(selected) && holderName.trim().length > 1 && accountNumber.trim().length >= 4;
  // Explain the disabled button per field once the user leaves the field.
  const holderError = touched.holderName && holderName.trim().length <= 1
    ? "Enter the account holder's name."
    : undefined;
  const accountError = touched.accountNumber && accountNumber.trim().length < 4
    ? (isPhone ? 'Enter a valid phone number.' : 'Enter a valid account number.')
    : undefined;

  const inputStyle = {
    fontFamily: "'Inter', sans-serif", color: text,
    background: cardBg, border: `1px solid ${cardBorder}`,
  } as const;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <p className="text-[10px] tracking-[1.5px] uppercase mb-2" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
        Destination
      </p>

      {showBanksLoading ? (
        <div className="flex flex-col gap-2 mb-5">
          <Pulse className="h-[52px] rounded-xl" />
          <Pulse className="h-[52px] rounded-xl" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl p-4 mb-5 text-center" style={{ background: cardBg }}>
          <p className="text-[13px] mb-3" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
            Couldn't load payout destinations.
          </p>
          <AppButton onClick={() => void refetch()} className="cursor-pointer"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: isDark ? '#d6f905' : '#0a0a0a' }}>
            Retry
          </AppButton>
        </div>
      ) : banks.length === 0 ? (
        <div className="rounded-2xl p-4 mb-5 text-center" style={{ background: cardBg }}>
          <p className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
            No payout destinations are available right now.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-5">
          {banks.map((bank) => {
            const active = bankSlug === bank.bankSlug;
            return (
              <AppButton key={bank.bankSlug} whileTap={{ scale: 0.98 }} onClick={() => setBankSlug(bank.bankSlug)}
                className="rounded-xl p-3 flex items-center gap-3 cursor-pointer text-left"
                style={{
                  background: active ? (isDark ? 'rgba(214,249,5,0.08)' : 'rgba(10,10,10,0.05)') : cardBg,
                  border: `1px solid ${active ? (isDark ? 'rgba(214,249,5,0.5)' : 'rgba(10,10,10,0.4)') : cardBorder}`,
                }}>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                  {bank.type === 'bank'
                    ? <Landmark className="w-4 h-4" style={{ color: muted }} strokeWidth={1.5} />
                    : <Wallet className="w-4 h-4" style={{ color: muted }} strokeWidth={1.5} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: text }}>
                    {bank.bankName}
                  </p>
                  <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                    {bank.type === 'mobile_money' ? 'Mobile money' : bank.type === 'bank' ? 'Bank transfer' : 'Wallet'}
                  </p>
                </div>
                {active && <Check className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} strokeWidth={2.4} />}
              </AppButton>
            );
          })}
        </div>
      )}

      <div className="mb-4">
        <label className="text-[10px] tracking-[1.5px] uppercase mb-2 block" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
          Account holder name
        </label>
        <AppInput value={holderName} onChange={e => setHolderName(e.target.value)} placeholder="Name"
          onBlur={() => setTouched(t => ({ ...t, holderName: true }))} error={holderError} errorClassName={FIELD_ERROR_CLASS}
          className="w-full h-[52px] rounded-2xl px-4 text-[14px] outline-none" style={inputStyle} />
      </div>

      <div className="mb-6">
        <label className="text-[10px] tracking-[1.5px] uppercase mb-2 block" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
          {isPhone ? 'Phone number' : 'Account number'}
        </label>
        <AppInput value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
          inputMode={isPhone ? 'tel' : 'numeric'}
          onBlur={() => setTouched(t => ({ ...t, accountNumber: true }))} error={accountError} errorClassName={FIELD_ERROR_CLASS}
          placeholder={isPhone ? '09xx xxx xxx' : 'Account number'}
          className="w-full h-[52px] rounded-2xl px-4 text-[14px] outline-none" style={inputStyle} />
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

      <AppButton whileHover={valid ? { scale: 1.02 } : undefined} whileTap={valid ? { scale: 0.97 } : undefined}
        onClick={() => { if (valid && selected && !submitting) onSubmit({ bankSlug: selected.bankSlug, type: selected.type, holderName, accountNumber }); }}
        disabled={!valid || submitting}
        className="w-full h-[56px] rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        style={{
          background: valid
            ? (isDark ? 'linear-gradient(135deg, rgba(214,249,5,0.2), rgba(217,255,0,0.1))' : 'linear-gradient(135deg, rgba(214,249,5,0.9), rgba(10,10,10,0.85))')
            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
          opacity: valid ? 1 : 0.5,
          ...glassEdge(isDark),
        }}>
        <Check className="w-4 h-4" style={{ color: valid ? (isDark ? '#f4ff66' : '#fff') : muted }} strokeWidth={2} />
        <span className="text-[14px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: valid ? (isDark ? '#f4ff66' : '#fff') : muted }}>
          {continueAfterSave ? 'Save & continue' : 'Save payout method'}
        </span>
      </AppButton>
    </motion.div>
  );
}
