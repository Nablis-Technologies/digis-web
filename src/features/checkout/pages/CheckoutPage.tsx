import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Lock, X } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import type { CustomQuestion, EventProduct, SeatMapConfig } from '@/types';
import { ReviewStep } from '@/features/checkout/components/ReviewStep';
import { SeatMapStep } from '@/features/checkout/components/SeatMapStep';
import { ExtrasStep } from '@/features/checkout/components/ExtrasStep';
import { DetailsStep } from '@/features/checkout/components/DetailsStep';
import { QuestionsStep } from '@/features/checkout/components/QuestionsStep';
import { PaymentStep } from '@/features/checkout/components/PaymentStep';
import { ProcessingView } from '@/features/checkout/components/ProcessingView';
import { SuccessView } from '@/features/checkout/components/SuccessView';
import { useCheckoutFlow } from '@/features/checkout/hooks/useCheckoutFlow';
import { primaryButtonSurface } from '@/lib/ui/disabledStyles';
import { Money } from '@/lib/money';
import { AppButton } from '@/components/primitives/AppButton';

interface CheckoutEvent {
  name: string;
  date: string;
  time: string;
  venue: string;
  image?: string;
  category?: string;
}

interface CheckoutProps {
  event: CheckoutEvent;
  ticketType: string;
  ticketLevel: string;
  /** Backend Catalog::EventProduct id when the tier came from live products — what order_quotes consumes. */
  ticketProductId?: string;
  basePrice: number;
  eventId?: string;
  customQuestions?: CustomQuestion[];
  products?: EventProduct[];
  includedProductIds?: string[];
  /** Set by the organizer; 0 or undefined means answers cannot be edited after purchase. */
  answerEditWindowHours?: number | null;
  /** When provided, buyers pick assigned seats as the first checkout step. */
  seatMap?: SeatMapConfig;
  /** Ticket-tier seat entitlement, e.g. 2 for a couples bundle. */
  requiredSeatCount?: number;
  onClose: () => void;
  onComplete: () => void;
}

export function Checkout({ event, ticketType, ticketLevel, ticketProductId, basePrice, eventId, customQuestions, products, includedProductIds, answerEditWindowHours, seatMap, requiredSeatCount, onClose, onComplete }: CheckoutProps) {
  const { isDark } = useTheme();
  const flow = useCheckoutFlow({ basePrice, eventId, ticketType, ticketProductId, customQuestions, products, includedProductIds, answerEditWindowHours, seatMap, requiredSeatCount, onClose });
  const {
    step, quantity, setQuantity, hasSeats, seatSections, selectedSeats, toggleSeat, maxSeats, requiredSeats,
    promoApplied, promoCodeInput, setPromoCodeInput,
    promoExpanded, setPromoExpanded, promoError, setPromoError, promoLoading,
    validatePromo, removePromo, contactDetails, setContactDetails, errors, setErrors,
    questions, answers, setAnswers, questionErrors, setQuestionErrors, payMethod,
    setPayMethod, cardNumber, setCardNumber, cardExpiry, setCardExpiry, cardCvc,
    setCardCvc, promoCode, discountAmount, subtotal, discountTotal, serviceFee,
    total, steps, visibleStep, goNext, goBack, canContinue,
    products: flowProducts, includedProductIds: flowIncluded, selectedAddOns, setSelectedAddOns,
  } = flow;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const bgPanel = isDark ? '#0a0a0a' : '#ffffff';
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const textDim = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,46,0.4)';
  const borderSoft = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.08)';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(4,4,4,0.7)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}>
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative w-full sm:max-w-lg max-h-[94vh] overflow-hidden flex flex-col rounded-t-[32px] sm:rounded-[32px]"
        style={{ background: bgPanel, border: `1px solid ${isDark ? 'rgba(217,255,0,0.18)' : 'rgba(214,249,5,0.12)'}`, boxShadow: '0 -20px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02) inset' }}>
        <div className="relative px-6 pt-5 pb-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${borderSoft}` }}>
          <AppButton whileTap={{ scale: 0.9 }} onClick={goBack} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.04)', border: `1px solid ${borderSoft}` }}>
            <ArrowLeft className="w-4 h-4" strokeWidth={1.8} style={{ color: textMuted }} />
          </AppButton>
          <div className="flex flex-col items-center">
            <p className="text-[9px] tracking-[3px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>Checkout</p>
            <p className="text-[13px] mt-0.5" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary, fontWeight: 300 }}>
              {step === 'success' ? 'Confirmed' : step === 'processing' ? 'Securing your spot' : steps.find(s => s.id === step)?.label}
            </p>
          </div>
          <AppButton whileTap={{ scale: 0.9 }} onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.04)', border: `1px solid ${borderSoft}` }}>
            <X className="w-4 h-4" strokeWidth={1.8} style={{ color: textMuted }} />
          </AppButton>
        </div>

        {step !== 'processing' && step !== 'success' && (
          <div className="relative px-6 pt-4 pb-2">
            <div className="flex items-center gap-2">
              {steps.map((s, i) => {
                const active = i <= visibleStep;
                const current = i === visibleStep;
                return (
                  <div key={s.id} className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className="relative h-[3px] w-full rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.06)' }}>
                        <motion.div initial={false} animate={{ width: active ? '100%' : '0%' }} transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }} className="absolute inset-y-0 left-0 rounded-full" style={{ background: 'linear-gradient(90deg, #d9ff00, #d6f905)', boxShadow: 'none' }} />
                      </div>
                      <span className="text-[9px] tracking-[1.5px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: current ? (isDark ? '#d6f905' : '#0a0a0a') : textDim, fontWeight: current ? 500 : 400 }}>{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative flex-1 overflow-y-auto scrollbar-hide px-6 py-5">
          <AnimatePresence mode="wait">
            {step === 'seat' && <StepFrame key="seat"><SeatMapStep sections={seatSections} stageLabel={seatMap?.stageLabel} basePrice={basePrice} selectedSeats={selectedSeats} toggleSeat={toggleSeat} maxSeats={maxSeats} requiredSeats={requiredSeats} isDark={isDark} /></StepFrame>}
            {step === 'review' && <StepFrame key="review"><ReviewStep event={event} ticketType={ticketType} ticketLevel={ticketLevel} quantity={quantity} setQuantity={setQuantity} basePrice={basePrice} isDark={isDark} hasSeats={hasSeats} selectedSeats={selectedSeats} /></StepFrame>}
            {step === 'extras' && <StepFrame key="extras"><ExtrasStep products={flowProducts} selected={selectedAddOns} onChange={setSelectedAddOns} includedProductIds={flowIncluded} isDark={isDark} /></StepFrame>}
            {step === 'details' && <StepFrame key="details"><DetailsStep name={contactDetails.name} setName={(name: string) => setContactDetails((prev) => ({ ...prev, name }))} email={contactDetails.email} setEmail={(email: string) => setContactDetails((prev) => ({ ...prev, email }))} phone={contactDetails.phone} setPhone={(phone: string) => setContactDetails((prev) => ({ ...prev, phone }))} contactMethod={contactDetails.contactMethod} setContactMethod={(contactMethod: 'email' | 'phone') => setContactDetails((prev) => ({ ...prev, contactMethod }))} errors={errors} setErrors={setErrors} isDark={isDark} /></StepFrame>}
            {step === 'questions' && <StepFrame key="questions"><QuestionsStep questions={questions} answers={answers} setAnswers={setAnswers} questionErrors={questionErrors} setQuestionErrors={setQuestionErrors} isDark={isDark} /></StepFrame>}
            {step === 'payment' && <StepFrame key="payment"><PaymentStep method={payMethod} setMethod={setPayMethod} cardNumber={cardNumber} setCardNumber={setCardNumber} cardExpiry={cardExpiry} setCardExpiry={setCardExpiry} cardCvc={cardCvc} setCardCvc={setCardCvc} subtotal={subtotal} discountTotal={discountTotal} promoCode={promoCode} serviceFee={serviceFee} total={total} isDark={isDark} promoApplied={promoApplied} promoCodeInput={promoCodeInput} setPromoCodeInput={setPromoCodeInput} promoExpanded={promoExpanded} setPromoExpanded={setPromoExpanded} promoError={promoError} setPromoError={setPromoError} promoLoading={promoLoading} validatePromo={validatePromo} removePromo={removePromo} discountAmount={discountAmount} /></StepFrame>}
            {step === 'processing' && <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20"><ProcessingView isDark={isDark} method={payMethod} /></motion.div>}
            {step === 'success' && <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 22, stiffness: 250 }} className="flex flex-col items-center justify-center py-12"><SuccessView event={event} ticketType={ticketType} total={total} isDark={isDark} /></motion.div>}
          </AnimatePresence>
        </div>

        {step !== 'processing' && step !== 'success' && (
          <div className="relative px-6 pt-4 pb-6" style={{ borderTop: `1px solid ${borderSoft}` }}>
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <p className="text-[9px] tracking-[2px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>Total</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[22px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>{Money.fromMinor(total, "ETB").format()}</span>
                  {discountTotal > 0 && <span className="text-[12px] line-through" style={{ color: textDim }}>{Money.fromMinor(subtotal + serviceFee, "ETB").formatNumber()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: textDim, fontFamily: "'Inter', sans-serif" }}><Lock className="w-3 h-3" strokeWidth={1.8} /><span className="text-[10px] tracking-[1px] uppercase">Secure</span></div>
            </div>
            <AppButton whileHover={{ scale: canContinue ? 1.01 : 1 }} whileTap={{ scale: canContinue ? 0.98 : 1 }} onClick={goNext} disabled={!canContinue} className="w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 relative overflow-hidden" style={{ ...primaryButtonSurface(canContinue, isDark), boxShadow: 'none', fontFamily: "'Inter', sans-serif", fontSize: '14px', letterSpacing: '0.5px', fontWeight: 500 }}>
              {step === 'payment' ? `Pay ${Money.fromMinor(total, "ETB").format()}` : 'Continue'}<ArrowRight className="w-4 h-4" strokeWidth={2} />
            </AppButton>
          </div>
        )}

        {step === 'success' && (
          <div className="relative px-6 pt-4 pb-6" style={{ borderTop: `1px solid ${borderSoft}` }}>
            <AppButton whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={onComplete} className="w-full py-4 rounded-2xl cursor-pointer" style={{ background: 'linear-gradient(135deg, #d9ff00 0%, #d6f905 100%)', color: '#000', fontFamily: "'Inter', sans-serif", fontSize: '14px', letterSpacing: '0.5px', boxShadow: 'none' }}>View My Ticket</AppButton>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function StepFrame({ children }: { children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>{children}</motion.div>;
}
