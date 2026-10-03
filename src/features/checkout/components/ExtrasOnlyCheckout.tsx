import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { ExtrasStep } from '@/features/checkout/components/ExtrasStep';
import { CheckoutSheetFrame } from '@/features/checkout/components/CheckoutSheetFrame';
import { orderModule, guestReturnKey } from '@/lib/order';
import { ApiError, messageForCode, mapFieldErrors } from '@/lib/errors';
import { randomUuid } from '@/lib/api';
import { Money } from '@/lib/money';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput } from '@/components/primitives/AppInput';
import { FieldError } from '@/components/primitives/FieldError';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { primaryButtonSurface } from '@/lib/ui/disabledStyles';
import { glassField } from '@/lib/ui/glass';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { EventProduct, SelectedEventProduct } from '@/types';

/** Shared styling for AppInput's built-in error output. */
const FIELD_ERROR_CLASS = 'flex items-center gap-1.5 mt-1.5 text-[11px] text-red-400';

interface ExtrasOnlyCheckoutProps {
  event: { name: string; date: string; time: string; venue: string; image?: string };
  /** Backend event id â€” the extras-only order is created against it. */
  eventId: string;
  /** The event's purchasable extras (parking, merch, food, ...). */
  products: EventProduct[];
  /** Extras the buyer already owns on this event (pre-selected, locked). */
  existing?: SelectedEventProduct[];
  onClose: () => void;
  /** Called after payment is initiated (Chapa redirect or typed error). */
  onComplete: () => void;
}

/**
 * Extras-only checkout: buy more event extras (parking, merch, food) against an
 * already-purchased ticket without re-entering the full ticket flow. Creates a
 * fresh backend order for JUST the extras (quote â†’ order â†’ payment), the same
 * chain the main checkout uses. No registration/consents/seats â€” those belong
 * to ticket lines, and extras-only orders are accepted without them.
 */
export function ExtrasOnlyCheckout({ event, eventId, products, existing = [], onClose, onComplete }: ExtrasOnlyCheckoutProps) {
  const { isDark } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const [selected, setSelected] = useState<SelectedEventProduct[]>(existing);
  const [step, setStep] = useState<'extras' | 'details' | 'paying' | 'error'>('extras');
  const [error, setError] = useState<string>();
  const [guestPhone, setGuestPhone] = useState(user?.phone ?? '+251');
  const [guestName, setGuestName] = useState(user?.name ?? '');
  const [guestEmail, setGuestEmail] = useState(user?.email ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const payingRef = useRef(false);

  const clearField = (field: string) => setFieldErrors((prev) => {
    if (!prev[field]) return prev;
    const next = { ...prev };
    delete next[field];
    return next;
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const total = selected.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const count = selected.reduce((sum, item) => sum + item.quantity, 0);

  const startPayment = async () => {
    if (count <= 0 || payingRef.current) return;
    // Guests need to confirm their phone before checkout can start (BACKEND_GAPS
    // #14 â€” the guest quote/order/payment endpoints are phone-bound).
    if (!isAuthenticated) {
      setStep('details');
      return;
    }
    await runPayment();
  };

  const submitPhone = async () => {
    const next: Record<string, string> = {};
    if (guestPhone.replace(/\s/g, '').length < 9) next.phone = 'Enter your phone number to continue.';
    if (guestEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) next.email = 'Enter a valid email address, or leave it blank.';
    if (Object.keys(next).length) { setFieldErrors(next); return; }
    setFieldErrors({});
    setError(undefined);
    await runPayment();
  };

  const runPayment = async () => {
    if (count <= 0 || payingRef.current) return;
    payingRef.current = true;
    setStep('paying');
    setError(undefined);
    try {
      const guest = !isAuthenticated ? { phone: guestPhone.trim() } : undefined;
      const quote = await orderModule.quote({
        eventId,
        items: selected.filter((a) => a.quantity > 0).map((a) => ({ eventProductId: a.productId, quantity: a.quantity })),
        chargeCurrency: 'ETB',
        ...(guest ? { guestPhone: guest.phone } : {}),
      });
      const order = await orderModule.createOrder({ eventId, quoteToken: quote.quote_token, ...(guest ? { guestPhone: guest.phone } : {}) });
      const { payment } = await orderModule.startPayment({
        orderId: order.id,
        provider: 'chapa',
        paymentMethod: 'telebirr',
        eventId,
        ...(guest ? { guest: { quoteToken: quote.quote_token, phone: guest.phone } } : {}),
      });
      if (payment.status === 'processing' && payment.checkout_url) {
        window.location.href = payment.checkout_url;
        return;
      }
      onComplete();
    } catch (e) {
      // Backend field errors send the guest back to the field that failed;
      // anything else is a payment-level error.
      const { fields, general } = mapFieldErrors(e instanceof ApiError ? e.fieldErrors : undefined);
      const mapped: Record<string, string> = {};
      if (fields.phone) mapped.phone = fields.phone;
      if (fields.name) mapped.name = fields.name;
      if (fields.email) mapped.email = fields.email;
      if (Object.keys(mapped).length) {
        setFieldErrors(mapped);
        setStep('details');
        setError(undefined);
      } else {
        setStep('error');
        setError(general.join(' ') || (e instanceof ApiError ? messageForCode(e.code, e.message) : 'Payment could not be started. Please try again.'));
      }
    } finally {
      payingRef.current = false;
    }
  };

  const bgPanel = isDark ? '#0a0a0a' : '#ffffff';
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textDim = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,46,0.4)';
  const borderSoft = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.08)';

  return (
    <CheckoutSheetFrame
      isDark={isDark}
      title="Add extras"
      onBack={step === 'details' ? () => { setStep('extras'); setError(undefined); } : undefined}
      onClose={onClose}
      hideSteps
      footer={
        <div className="relative px-6 pt-4 pb-6" style={{ boxShadow: `inset 0 1px 0 ${borderSoft}` }}>
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <p className="text-[9px] tracking-[2px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>Total</p>
              <span className="text-[22px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>{Money.fromMinor(total, "ETB").format()}</span>
            </div>
          </div>
          <AppButton
            whileHover={{ scale: count && step !== 'paying' ? 1.01 : 1 }} whileTap={{ scale: count && step !== 'paying' ? 0.98 : 1 }}
            onClick={step === 'details' ? submitPhone : startPayment}
            disabled={!count || step === 'paying'}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2.5"
            style={{ ...primaryButtonSurface(Boolean(count) && step !== 'paying', isDark), fontFamily: "'Inter', sans-serif", fontSize: '14px', letterSpacing: '0.5px', fontWeight: 500 }}>
            {step === 'paying' ? (
              <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 rounded-full" style={{ borderColor: 'currentColor', borderTopColor: 'transparent', opacity: 0.8 }} />Starting paymentâ€¦</>
            ) : step === 'details' ? (
              <><span>Continue</span><ArrowRight className="w-4 h-4" strokeWidth={2.5} /></>
            ) : (
              <><span>{count ? `Pay ${Money.fromMinor(total, "ETB").format()}` : 'Select extras to continue'}</span>{count > 0 && <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}</>
            )}
          </AppButton>
          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-[11px] mt-2 text-center" style={{ fontFamily: "'Inter', sans-serif", color: '#ef4444' }}>
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      }
>
        {step === 'details' ? (
          <div className="relative px-6 py-5 overflow-y-auto scrollbar-hide" style={{ background: bgPanel }}>
            <p className="text-[10px] tracking-[1.6px] uppercase mb-4" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
              Contact details
            </p>
            <div className="relative mb-3 rounded-xl overflow-hidden" style={glassField(isDark)}>
              <GlassReflection isDark={isDark} edgeState={fieldErrors.phone ? 'error' : undefined} />
              <AppInput
                type="tel"
                placeholder="Phone number"
                value={guestPhone}
                onChange={(e) => { setGuestPhone(e.target.value); clearField('phone'); }}
                error={fieldErrors.phone} errorClassName={FIELD_ERROR_CLASS}
                className="relative z-10 w-full px-4 py-3 text-[14px] outline-none"
                style={{ color: textPrimary, fontFamily: "'Inter', sans-serif" }}
              />
            </div>
            <div className="relative mb-3 rounded-xl overflow-hidden" style={glassField(isDark)}>
              <GlassReflection isDark={isDark} edgeState={fieldErrors.name ? 'error' : undefined} />
              <AppInput
                type="text"
                placeholder="Name (optional)"
                value={guestName}
                onChange={(e) => { setGuestName(e.target.value); clearField('name'); }}
                error={fieldErrors.name} errorClassName={FIELD_ERROR_CLASS}
                className="relative z-10 w-full px-4 py-3 text-[14px] outline-none"
                style={{ color: textPrimary, fontFamily: "'Inter', sans-serif" }}
              />
            </div>
            <div className="relative mb-3 rounded-xl overflow-hidden" style={glassField(isDark)}>
              <GlassReflection isDark={isDark} edgeState={fieldErrors.email ? 'error' : undefined} />
              <AppInput
                type="email"
                placeholder="Email (optional)"
                value={guestEmail}
                onChange={(e) => { setGuestEmail(e.target.value); clearField('email'); }}
                error={fieldErrors.email} errorClassName={FIELD_ERROR_CLASS}
                className="relative z-10 w-full px-4 py-3 text-[14px] outline-none"
                style={{ color: textPrimary, fontFamily: "'Inter', sans-serif" }}
              />
            </div>
          </div>
        ) : (
          <div className="relative px-6 py-5 overflow-y-auto scrollbar-hide" style={{ background: bgPanel }}>
            <p className="text-[10px] tracking-[1.6px] uppercase mb-3" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
              {event.name}
            </p>
            {products.length ? (
              <ExtrasStep products={products} selected={selected} onChange={setSelected} isDark={isDark} compact />
            ) : (
              <p className="text-[13px] py-8 text-center" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>No extras are available for this event.</p>
            )}
            {step === 'error' && error && (
              <FieldError error={error} className="mt-3 flex items-center gap-1.5 justify-center text-[12px]" />
            )}
          </div>
        )}
    </CheckoutSheetFrame>
  );
}
