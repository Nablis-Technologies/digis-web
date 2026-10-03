import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Building2, Calendar, Check, ChevronRight, CreditCard, Lock, Smartphone } from 'lucide-react';
import type { PaymentMethod } from '@/features/checkout/hooks/useCheckoutFlow';
import { OrderSummary } from './OrderSummary';
import { PromoCodeField } from './PromoCodeField';
import { Money } from '@/lib/money';
import { ProviderLogo } from '@/components/ProviderLogo';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput, AppTextArea } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge, glassField } from '@/lib/ui/glass';

export function PaymentStep({
  method, setMethod, cardNumber, setCardNumber, cardExpiry, setCardExpiry, cardCvc, setCardCvc, total, subtotal, discountTotal, promoCode, serviceFee, isDark,
  promoApplied, promoCodeInput, setPromoCodeInput, promoExpanded, setPromoExpanded, promoError, setPromoError, promoLoading, validatePromo, removePromo, discountAmount,
}: any) {
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';

  // BACKEND_GAPS.md: the backend's PAYMENT_METHODS are telebirr/card/bank —
  // "cbe" is rejected (invalid_payment_method). CBE stays visible but disabled
  // until the backend adds it; nothing here maps cbe → bank (ADR-0002).
  const methods: { id: PaymentMethod; label: string; tag: string; icon: any; accent: string; disabled?: boolean; note?: string }[] = [
    { id: 'telebirr', label: 'Telebirr', tag: 'Mobile money', icon: <ProviderLogo kind="telebirr" size={40} />, accent: '#1aa64b' },
    { id: 'cbe', label: 'CBE Birr', tag: 'Bank transfer', icon: <ProviderLogo kind="cbe" size={40} />, accent: '#7b2d8e', disabled: true, note: 'Coming soon' },
    { id: 'card', label: 'Credit / Debit Card', tag: 'Visa, Mastercard', icon: <CreditCard className="w-5 h-5" />, accent: '#d6f905' },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="text-[20px] font-light mb-1"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
          How would you like to pay?
        </h3>
        <p className="text-[12px]"
          style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
          Choose your preferred method below.
        </p>
      </div>

      <div className="space-y-2.5">
        {methods.map(m => (
          <PaymentOption
            key={m.id} option={m}
            selected={method === m.id}
            onClick={() => { if (!m.disabled) setMethod(m.id); }}
            isDark={isDark}
          />
        ))}
      </div>

      <PromoCodeField promoApplied={promoApplied} promoCodeInput={promoCodeInput} setPromoCodeInput={setPromoCodeInput} promoExpanded={promoExpanded} setPromoExpanded={setPromoExpanded} promoError={promoError} setPromoError={setPromoError} promoLoading={promoLoading} validatePromo={validatePromo} removePromo={removePromo} discountAmount={discountAmount} isDark={isDark} />

      <OrderSummary subtotal={subtotal} discountTotal={discountTotal} promoCode={promoCode} serviceFee={serviceFee} total={total} isDark={isDark} compact />

      <AnimatePresence mode="wait">
        {method === 'card' ? (
          <motion.div
            key="card-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-2">
              <Field
                icon={<CreditCard className="w-4 h-4" />} label="Card number" placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(v: string) => setCardNumber(formatCardNumber(v))}
                isDark={isDark}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  icon={<Calendar className="w-4 h-4" />} label="Expiry" placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(v: string) => setCardExpiry(formatExpiry(v))}
                  isDark={isDark}
                />
                <Field
                  icon={<Lock className="w-4 h-4" />} label="CVC" placeholder="123"
                  value={cardCvc}
                  onChange={(v: string) => setCardCvc(v.replace(/\D/g, '').slice(0, 4))}
                  isDark={isDark}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="redirect-info"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative overflow-hidden rounded-xl p-4 flex items-center gap-3"
            style={{
              background: isDark ? 'rgba(217,255,0,0.06)' : 'rgba(214,249,5,0.05)',
            }}
          >
            <GlassReflection isDark={isDark} />
            <ChevronRight className="relative z-10 w-4 h-4" strokeWidth={1.5}
              style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} />
            <p className="relative z-10 text-[11px] leading-relaxed"
              style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
              You'll be redirected to {method === 'telebirr' ? 'Telebirr' : 'CBE Birr'} to authorize{' '}
              <span style={{ color: textPrimary, fontWeight: 500 }}>{Money.fromMinor(total, "ETB").format()}</span>.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentOption({ option, selected, onClick, isDark }: any) {
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textDim = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,46,0.45)';
  const disabled = !!option.disabled;

  return (
    <AppButton
      whileHover={disabled ? undefined : { scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.99 }}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className="w-full p-4 rounded-2xl flex items-center gap-3.5 cursor-pointer relative overflow-hidden disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background: selected
          ? (isDark ? 'rgba(217,255,0,0.1)' : 'rgba(214,249,5,0.06)')
          : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(26,26,46,0.03)'),
        ...(selected ? glassEdge(isDark) : {}),
        transition: 'all 0.2s',
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: `${option.accent}20`,
          color: option.accent,
          ...glassEdge(isDark),
        }}>
        {option.icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-[14px] font-light flex items-center gap-2"
          style={{ fontFamily: "'Inter', sans-serif", color: textPrimary, fontWeight: 500 }}>
          {option.label}
          {option.note && (
            <span className="text-[9px] tracking-[1px] uppercase px-1.5 py-0.5 rounded-full"
              style={{ fontFamily: "'Inter', sans-serif", color: textDim, ...glassEdge(isDark) }}>
              {option.note}
            </span>
          )}
        </p>
        <p className="text-[11px]"
          style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
          {option.tag}
        </p>
      </div>
      <motion.div
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          boxShadow: selected ? 'none' : `0 0 0 1.5px ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(26,26,46,0.2)'}`,
          background: selected ? '#d6f905' : 'transparent',
        }}
        animate={{ scale: selected ? [1, 1.15, 1] : 1 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AppButton>
  );
}

function Field({ icon, label, type = 'text', placeholder, value, onChange, error, isDark }: any) {
  const [focused, setFocused] = useState(false);
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.45)';
  const hasError = !!error;

  return (
    <div>
      {label && (
        <label className="text-[10px] tracking-[1.5px] uppercase mb-2 ml-1 block"
          style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
          {label}
        </label>
      )}
      <div className="relative rounded-xl overflow-hidden" style={glassField(isDark)}>
        <GlassReflection isDark={isDark} edgeState={hasError ? 'error' : focused ? 'focus' : undefined} />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
          style={{ color: focused ? (isDark ? '#d6f905' : '#0a0a0a') : textDim, transition: 'color 0.2s' }}>
          {icon}
        </div>
        <AppInput
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="relative z-10 w-full pl-11 pr-4 py-3.5 outline-none transition-all"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px',
            color: textPrimary,
          }}
        />
      </div>
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="flex items-center gap-1.5 mt-1.5 ml-1"
          >
            <AlertCircle className="w-3 h-3 text-red-400" strokeWidth={2} />
            <p className="text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: '#f87171' }}>
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatCardNumber(v: string) {
  return v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}
