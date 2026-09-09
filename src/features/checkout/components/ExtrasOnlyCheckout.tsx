import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Lock, ArrowRight } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { ExtrasStep } from '@/features/checkout/components/ExtrasStep';
import { CheckoutSheetFrame } from '@/features/checkout/components/CheckoutSheetFrame';
import { orderModule, guestReturnKey } from '@/lib/order';
import { ApiError, messageForCode } from '@/lib/errors';
import { randomUuid } from '@/lib/api';
import { Money } from '@/lib/money';
import { AppButton } from '@/components/primitives/AppButton';
import { primaryButtonSurface } from '@/lib/ui/disabledStyles';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { EventProduct, SelectedEventProduct } from '@/types';

interface ExtrasOnlyCheckoutProps {
  event: { name: string; date: string; time: string; venue: string; image?: string };
  /** Backend event id — the extras-only order is created against it. */
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
 * fresh backend order for JUST the extras (quote → order → payment), the same
 * chain the main checkout uses. No registration/consents/seats — those belong
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
  const payingRef = useRef(false);

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
    // #14 — the guest quote/order/payment endpoints are phone-bound).
    if (!isAuthenticated) {
      setStep('details');
      return;
    }
    await runPayment();
  };

  const submitPhone = async () => {
    if (guestPhone.replace(/\s/g, '').length < 9) {
      setError('Enter your phone number to continue.');
      return;
    }
    setError(undefined);
    await runPayment();
  };

  const runPayment = async () => {
    if (count <= 0 || payingRef.current) return;
    payingRef.current = true;
    setStep('paying');
    setError(undefined);
    try {
      const guest = !isAuthenticated ? { quoteToken: '', phone: guestPhone.trim() } : undefined;
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
      setStep('error');
      setError(e instanceof ApiError ? messageForCode(e.code, e.message) : 'Payment could not be started. Please try again.');
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
        <div className="relative px-6 pt-4 pb-6" style={{ borderTop: `1px solid ${borderSoft}` }}>
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <p className="text-[9px] tracking-[2px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>Total</p>
              <span className="text-[22px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>{Money.fromMinor(total, "ETB").format()}</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: textDim, fontFamily: "'Inter', sans-serif" }}><Lock className="w-3 h-3" strokeWidth={1.8} /><span className="text-[10px] tracking-[1px] uppercase">Secure</span></div>
          </div>
          <AppButton
            whileHover={{ scale: count && step !== 'paying' ? 1.01 : 1 }} whileTap={{ scale: count && step !== 'paying' ? 0.98 : 1 }}
            onClick={step === 'details' ? submitPhone : startPayment}
            disabled={!count || step === 'paying'}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2.5"
            style={{ ...primaryButtonSurface(Boolean(count) && step !== 'paying', isDark), fontFamily: "'Inter', sans-serif", fontSize: '14px', letterSpacing: '0.5px', fontWeight: 500 }}>
            {step === 'paying' ? (
              <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 rounded-full" style={{ borderColor: 'currentColor', borderTopColor: 'transparent', opacity: 0.8 }} />Starting payment…</>
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
            <input
              type="tel"
              placeholder="Phone number"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl mb-3 text-[14px] outline-none"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f3f3f3', color: textPrimary, fontFamily: "'Inter', sans-serif" }}
            />
            <input
              type="text"
              placeholder="Full name (optional)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl mb-3 text-[14px] outline-none"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f3f3f3', color: textPrimary, fontFamily: "'Inter', sans-serif" }}
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl mb-3 text-[14px] outline-none"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f3f3f3', color: textPrimary, fontFamily: "'Inter', sans-serif" }}
            />
            {error && (
              <div className="flex items-center gap-2 justify-center text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: '#ef4444' }}>
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>{error}</span>
              </div>
            )}
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
              <div className="mt-3 flex items-center gap-2 justify-center text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: '#ef4444' }}>
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
    </CheckoutSheetFrame>
  );
}