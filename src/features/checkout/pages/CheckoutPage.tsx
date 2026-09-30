import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Check, Lock } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import type { CustomQuestion, EventProduct, SeatMapConfig, UserTicket } from '@/types';
import { ReviewStep } from '@/features/checkout/components/ReviewStep';
import { ConsentSection } from '@/features/checkout/components/ConsentSection';
import { SeatMapStep } from '@/features/checkout/components/SeatMapStep';
import { ExtrasStep } from '@/features/checkout/components/ExtrasStep';
import { DetailsStep } from '@/features/checkout/components/DetailsStep';
import { QuestionsStep } from '@/features/checkout/components/QuestionsStep';
import { PaymentStep } from '@/features/checkout/components/PaymentStep';
import { PhoneOtpStep } from '@/features/checkout/components/PhoneOtpStep';
import { ProcessingView } from '@/features/checkout/components/ProcessingView';
import { SuccessView } from '@/features/checkout/components/SuccessView';
import { CheckoutSheetFrame } from '@/features/checkout/components/CheckoutSheetFrame';
import { useCheckoutFlow } from '@/features/checkout/hooks/useCheckoutFlow';
import { ConflictSheet } from '@/features/checkout/components/ConflictSheet';
import { primaryButtonSurface } from '@/lib/ui/disabledStyles';
import { Money } from '@/lib/money';
import { AppButton } from '@/components/primitives/AppButton';
import { isoToDisplayDate } from '@/lib/mappers';

function formatDateLabel(startsAt: string): string {
  const base = isoToDisplayDate(startsAt);
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return base;
  return `${base} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

interface CheckoutEvent {
  name: string;
  date: string;
  time: string;
  venue: string;
  image?: string;
  category?: string;
}

/** Post-Chapa return confirmation rendered in THIS checkout sheet — the same
 *  modal the buyer left, so "Confirming your payment" → "You're going!" is a
 *  continuation, not a new screen. */
export interface CheckoutReturnMode {
  confirming: boolean;
  timedOut: boolean;
  /** Backend reconciled the payment as failed/cancelled/reversed (refresh `terminal`). */
  terminal?: boolean;
  /** Optional honest explanation when `terminal` — e.g. a guest return that
   *  could not be verified (stale checkout creds) but whose payment may have
   *  actually succeeded. Overrides the generic "payment failed" copy. */
  terminalMessage?: string;
  confirmedTicket: UserTicket | null;
  onViewTicket: () => void;
  onGoToTickets: () => void;
}

interface CheckoutProps {
  event: CheckoutEvent;
  /** Backend URL slug — drives consent_requirements (slug-addressed). */
  eventSlug?: string;
  ticketType: string;
  ticketLevel: string;
  /** Backend Catalog::EventProduct id when the tier came from live products — what order_quotes consumes. */
  ticketProductId?: string;
  /** Backend Ticketing::TicketType id — consent + registration address it. */
  ticketTypeId?: string;
  /** Audience proof for gated ticket types (invite-only / access-code events). */
  accessCode?: string;
  invitationToken?: string;
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
  /** Ticket-type date_selection mode — choose_one tiers require a selected date. */
  dateSelection?: 'fixed' | 'choose_one';
  /** Backend event dates (id + startsAt) for the choose_one date step. */
  eventDates?: { id: string; startsAt: string; name?: string }[];
  /** When set, this sheet renders the post-Chapa return confirmation instead
   *  of the purchase flow. */
  returnMode?: CheckoutReturnMode;
  onClose: () => void;
  onComplete: () => void;
}

/** Shared checkout sheet. During the purchase it runs the step flow; on a
 *  post-Chapa return it shows the return confirmation in the same modal. */
export function Checkout(props: CheckoutProps) {
  if (props.returnMode) return <CheckoutReturn {...props} />;
  return <CheckoutFlow {...props} />;
}

function CheckoutReturn({ returnMode, onClose }: CheckoutProps) {
  const { isDark } = useTheme();
  const m = returnMode!;
  const confirmedTicket = m.confirmedTicket;
  const title = confirmedTicket ? 'Confirmed' : m.terminal ? 'Payment failed' : m.timedOut ? 'Still confirming' : 'Confirming your payment';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const borderSoft = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.08)';

  return (
    <CheckoutSheetFrame
      isDark={isDark}
      title={title}
      onClose={onClose}
      hideSteps
      footer={
        confirmedTicket ? (
          <div className="relative px-6 pt-4 pb-6" style={{ borderTop: `1px solid ${borderSoft}` }}>
            <AppButton whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={m.onViewTicket} className="w-full py-4 rounded-2xl cursor-pointer" style={{ background: 'linear-gradient(135deg, #d9ff00 0%, #d6f905 100%)', color: '#000', fontFamily: "'Inter', sans-serif", fontSize: '14px', letterSpacing: '0.5px', boxShadow: 'none' }}>View My Ticket</AppButton>
          </div>
        ) : m.terminal ? (
          <div className="relative px-6 pt-4 pb-6" style={{ borderTop: `1px solid ${borderSoft}` }}>
            <AppButton whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={m.onGoToTickets} className="w-full py-4 rounded-2xl cursor-pointer flex items-center justify-center gap-2" style={{ background: isDark ? 'rgba(248,113,113,0.18)' : 'rgba(190,18,60,0.1)', color: isDark ? '#fca5a5' : '#b91c1c', border: `1px solid ${isDark ? 'rgba(248,113,113,0.3)' : 'rgba(190,18,60,0.25)'}`, fontFamily: "'Inter', sans-serif", fontSize: '14px', letterSpacing: '0.5px', boxShadow: 'none' }}>Go to Tickets</AppButton>
          </div>
        ) : m.timedOut ? (
          <div className="relative px-6 pt-4 pb-6" style={{ borderTop: `1px solid ${borderSoft}` }}>
            <AppButton whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={m.onGoToTickets} className="w-full py-4 rounded-2xl cursor-pointer flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #d9ff00 0%, #d6f905 100%)', color: '#000', fontFamily: "'Inter', sans-serif", fontSize: '14px', letterSpacing: '0.5px', boxShadow: 'none' }}>Go to Tickets</AppButton>
          </div>
        ) : (
          <div className="relative px-6 pt-4 pb-6" style={{ borderTop: `1px solid ${borderSoft}` }}>
            <div className="flex items-center justify-center gap-1.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,46,0.4)', fontFamily: "'Inter', sans-serif" }}>
              <Lock className="w-3 h-3" strokeWidth={1.8} />
              <span className="text-[10px] tracking-[1px] uppercase">Secure</span>
            </div>
          </div>
        )
      }
    >
      <AnimatePresence mode="wait">
        {confirmedTicket ? (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-12">
            <SuccessView
              event={{ name: confirmedTicket.eventName, date: confirmedTicket.eventDate, time: confirmedTicket.eventTime }}
              ticketType={confirmedTicket.ticketType}
              isDark={isDark}
            />
          </motion.div>
        ) : m.terminal ? (
          <motion.div key="terminal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-center py-16">
            <h3 className="text-[20px] font-light mb-2" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>Payment failed</h3>
            <p className="text-[12px] max-w-[300px]" style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
              {m.terminalMessage ?? 'This payment was not completed. Nothing was charged — you can safely try the checkout again.'}
            </p>
          </motion.div>
        ) : m.timedOut ? (
          <motion.div key="timeout" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-center py-16">
            <h3 className="text-[20px] font-light mb-2" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>Still confirming</h3>
            <p className="text-[12px] max-w-[300px]" style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
              We couldn&apos;t confirm this payment — it may still be processing, or it may have failed. Check
              Tickets: if nothing appears, you can safely try again.
            </p>
          </motion.div>
        ) : (
          <motion.div key="confirming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20">
            <ProcessingView isDark={isDark} mode="confirming" />
          </motion.div>
        )}
      </AnimatePresence>
    </CheckoutSheetFrame>
  );
}

function CheckoutFlow({ event, eventSlug, ticketType, ticketLevel, ticketProductId, ticketTypeId, accessCode, invitationToken, basePrice, eventId, customQuestions, products, includedProductIds, answerEditWindowHours, seatMap, requiredSeatCount, dateSelection, eventDates, onClose, onComplete }: CheckoutProps) {
  const { isDark } = useTheme();
  const flow = useCheckoutFlow({ basePrice, eventId, eventSlug, ticketType, ticketProductId, ticketTypeId, accessCode, invitationToken, customQuestions, products, includedProductIds, answerEditWindowHours, seatMap, requiredSeatCount, dateSelection, eventDates, onClose });
  const {
    step, setStep, quantity, setQuantity, hasSeats, seatSections, selectedSeats, toggleSeat, maxSeats, requiredSeats,
    promoApplied, promoCodeInput, setPromoCodeInput,
    promoExpanded, setPromoExpanded, promoError, setPromoError, promoLoading,
    validatePromo, removePromo, contactDetails, setContactDetails, errors, setErrors,
    questions, answers, setAnswers, questionErrors, setQuestionErrors, payMethod,
    setPayMethod, cardNumber, setCardNumber, cardExpiry, setCardExpiry, cardCvc,
    setCardCvc, promoCode, discountAmount, subtotal, discountTotal, serviceFee,
    total, steps, visibleStep, goNext, goBack, canContinue,
    products: flowProducts, includedProductIds: flowIncluded, selectedAddOns, setSelectedAddOns,
    quoteLoading, quoteError, isLiveTicket, consents, consentsLoading, consentsError,
    reloadConsents, acceptedConsents, toggleConsent,
    consentError, registrationError, paymentError, pendingNotice,
    conflict, closeConflictSheet,
    guestOtp, guestOtpError, guestOtpLoading, guestOtpVerifying, verifyGuestOtp, resendGuestOtp,
    eventDates: flowDates, selectedEventDateId, setSelectedEventDateId,
  } = flow;

  // Post-Chapa confirmation lives in the router (AppContent): the return URL
  // lands on /?status=return with the checkout modal closed, so modal-level
  // detection could never run. The router polls the wallet and shows the
  // confirmation back inside THIS sheet via returnMode.

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

  // The OTP step owns its own submit button (Verify), so it renders like the
  // processing/success states: no step indicator, no Continue/Pay footer.
  const inStepFlow = step !== 'processing' && step !== 'success' && step !== 'otp';
  const stepTitle = step === 'otp'
    ? 'Verify your phone'
    : steps.find(s => s.id === step)?.label ?? '';

  return (
    <CheckoutSheetFrame
      isDark={isDark}
      title={step === 'success' ? 'Confirmed' : step === 'processing' ? 'Securing your spot' : stepTitle}
      onBack={goBack}
      onClose={onClose}
      hideSteps={!inStepFlow}
      steps={steps}
      visibleStep={visibleStep}
      footer={
        inStepFlow ? (
          <div className="relative px-6 pt-4 pb-6" style={{ borderTop: `1px solid ${borderSoft}` }}>
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <p className="text-[9px] tracking-[2px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>Total</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[22px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
                    {quoteLoading ? '…' : quoteError ? '—' : Money.fromMinor(total, "ETB").format()}
                  </span>
                  {discountTotal > 0 && <span className="text-[12px] line-through" style={{ color: textDim }}>{Money.fromMinor(subtotal + serviceFee, "ETB").formatNumber()}</span>}
                </div>
                {(quoteError || (step === 'payment' && (registrationError || paymentError))) && (
                  <p className="text-[10px] mt-1" style={{ fontFamily: "'Inter', sans-serif", color: '#e5484d' }}>
                    {quoteError || registrationError || paymentError}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5" style={{ color: textDim, fontFamily: "'Inter', sans-serif" }}><Lock className="w-3 h-3" strokeWidth={1.8} /><span className="text-[10px] tracking-[1px] uppercase">Secure</span></div>
            </div>
            <AppButton whileHover={{ scale: canContinue && !quoteLoading ? 1.01 : 1 }} whileTap={{ scale: canContinue && !quoteLoading ? 0.98 : 1 }} onClick={goNext} disabled={!canContinue || quoteLoading || (step === 'payment' && !isLiveTicket && !!eventId)} className="w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 relative overflow-hidden" style={{ ...primaryButtonSurface(canContinue && !quoteLoading, isDark), boxShadow: 'none', fontFamily: "'Inter', sans-serif", fontSize: '14px', letterSpacing: '0.5px', fontWeight: 500 }}>
              {step === 'payment' ? `Pay ${Money.fromMinor(total, "ETB").format()}` : 'Continue'}<ArrowRight className="w-4 h-4" strokeWidth={2} />
            </AppButton>
          </div>
        ) : step === 'success' ? (
          <div className="relative px-6 pt-4 pb-6" style={{ borderTop: `1px solid ${borderSoft}` }}>
            <AppButton whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={onComplete} className="w-full py-4 rounded-2xl cursor-pointer" style={{ background: 'linear-gradient(135deg, #d9ff00 0%, #d6f905 100%)', color: '#000', fontFamily: "'Inter', sans-serif", fontSize: '14px', letterSpacing: '0.5px', boxShadow: 'none' }}>View My Ticket</AppButton>
          </div>
        ) : undefined
      }
    >
      <AnimatePresence mode="wait">
        {step === 'seat' && <StepFrame key="seat"><SeatMapStep sections={seatSections} stageLabel={seatMap?.stageLabel} basePrice={basePrice} selectedSeats={selectedSeats} toggleSeat={toggleSeat} maxSeats={maxSeats} requiredSeats={requiredSeats} isDark={isDark} /></StepFrame>}
        {step === 'date' && (
          <StepFrame key="date">
            <div className="space-y-3">
              <p className="text-[10px] tracking-[1.6px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>Pick a date</p>
              {flowDates.map((d) => {
                const active = selectedEventDateId === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedEventDateId(d.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl cursor-pointer text-left"
                    style={{
                      background: active ? (isDark ? 'rgba(217,255,0,0.12)' : 'rgba(214,249,5,0.14)') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,46,0.03)'),
                      border: `1px solid ${active ? (isDark ? 'rgba(217,255,0,0.35)' : 'rgba(214,249,5,0.5)') : borderSoft}`,
                    }}
                  >
                    <div>
                      <p className="text-[14px]" style={{ fontFamily: "'Inter', sans-serif", color: textPrimary, fontWeight: 500 }}>
                        {formatDateLabel(d.startsAt)}
                      </p>
                      {d.name ? <p className="text-[11px] mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>{d.name}</p> : null}
                    </div>
                    <div className="w-5 h-5 rounded-full grid place-items-center" style={{ border: `1px solid ${active ? '#d6f905' : borderSoft}` }}>
                      {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#d6f905' }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </StepFrame>
        )}
        {step === 'review' && (
          <StepFrame key="review">
            <div className="space-y-4">
              <ReviewStep event={event} ticketType={ticketType} ticketLevel={ticketLevel} quantity={quantity} setQuantity={setQuantity} basePrice={basePrice} isDark={isDark} hasSeats={hasSeats} selectedSeats={selectedSeats} />
              {/* Terms consent — its own box, separate from the ticket review card. */}
              {(consents.length > 0 || consentsLoading || consentsError) && (
                <ConsentSection consents={consents} accepted={acceptedConsents} onToggle={toggleConsent} error={consentError} isDark={isDark} loading={consentsLoading} loadError={consentsError} onRetry={reloadConsents} />
              )}
            </div>
          </StepFrame>
        )}
        {step === 'extras' && <StepFrame key="extras"><ExtrasStep products={flowProducts} selected={selectedAddOns} onChange={setSelectedAddOns} includedProductIds={flowIncluded} isDark={isDark} /></StepFrame>}
        {step === 'details' && <StepFrame key="details"><DetailsStep name={contactDetails.name} setName={(name: string) => setContactDetails((prev) => ({ ...prev, name }))} email={contactDetails.email} setEmail={(email: string) => setContactDetails((prev) => ({ ...prev, email }))} phone={contactDetails.phone} setPhone={(phone: string) => setContactDetails((prev) => ({ ...prev, phone }))} contactMethod={contactDetails.contactMethod} setContactMethod={(contactMethod: 'email' | 'phone') => setContactDetails((prev) => ({ ...prev, contactMethod }))} errors={errors} setErrors={setErrors} isDark={isDark} /></StepFrame>}
        {step === 'questions' && <StepFrame key="questions"><QuestionsStep questions={questions} answers={answers} setAnswers={setAnswers} questionErrors={questionErrors} setQuestionErrors={setQuestionErrors} isDark={isDark} /></StepFrame>}
        {step === 'payment' && <StepFrame key="payment"><PaymentStep method={payMethod} setMethod={setPayMethod} cardNumber={cardNumber} setCardNumber={setCardNumber} cardExpiry={cardExpiry} setCardExpiry={setCardExpiry} cardCvc={cardCvc} setCardCvc={setCardCvc} subtotal={subtotal} discountTotal={discountTotal} promoCode={promoCode} serviceFee={serviceFee} total={total} isDark={isDark} promoApplied={promoApplied} promoCodeInput={promoCodeInput} setPromoCodeInput={setPromoCodeInput} promoExpanded={promoExpanded} setPromoExpanded={setPromoExpanded} promoError={promoError} setPromoError={setPromoError} promoLoading={promoLoading} validatePromo={validatePromo} removePromo={removePromo} discountAmount={discountAmount} /></StepFrame>}
        {step === 'otp' && guestOtp && (
          <StepFrame key="otp">
            <PhoneOtpStep
              phone={guestOtp.phone}
              isDark={isDark}
              loading={guestOtpLoading || guestOtpVerifying}
              error={guestOtpError}
              onVerify={(code) => void verifyGuestOtp(code)}
              onResend={resendGuestOtp}
            />
          </StepFrame>
        )}
        {step === 'processing' && <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20"><ProcessingView isDark={isDark} method={payMethod} mode="payment" /></motion.div>}
        {step === 'pending' && (
          <motion.div key="pending" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-center py-10">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{ background: isDark ? 'rgba(217,255,0,0.1)' : 'rgba(214,249,5,0.12)', border: `1px solid ${isDark ? 'rgba(217,255,0,0.25)' : 'rgba(214,249,5,0.3)'}` }}>
              <Check className="w-7 h-7" style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} strokeWidth={2} />
            </div>
            <h3 className="text-[20px] font-light mb-2"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
              Submission received
            </h3>
            <p className="text-[12px] max-w-[300px]"
              style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
              {pendingNotice || 'Your registration was received. We’ll be in touch.'}
            </p>
          </motion.div>
        )}
        {step === 'success' && <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 22, stiffness: 250 }} className="flex flex-col items-center justify-center py-12"><SuccessView event={event} ticketType={ticketType} total={total} isDark={isDark} /></motion.div>}
      </AnimatePresence>

      <ConflictSheet
        open={conflict}
        onViewTickets={onComplete}
        onClose={closeConflictSheet}
      />
    </CheckoutSheetFrame>
  );
}

function StepFrame({ children }: { children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>{children}</motion.div>;
}