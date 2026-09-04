import { useMemo, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promoService } from '@/lib/promo';
import { ticketsService } from '@/lib/tickets';
import { orderModule, type OrderQuote } from '@/lib/order';
import type { AppliedPromo, CheckoutStep, ContactDetails, CustomQuestion, EventProduct, PaymentMethod, SeatMapConfig, SelectedEventProduct, SelectedSeat } from '@/types';


export type { AppliedPromo, CheckoutStep, ContactDetails, PaymentMethod };

const MAX_SEATS = 8;

/** Sections available for the chosen tier: those matching its name, else all. */
function sectionsForTier(seatMap: SeatMapConfig | undefined, ticketType: string) {
  if (!seatMap) return [];
  const scoped = seatMap.sections.filter((s) => s.tierName === ticketType);
  return scoped.length ? scoped : seatMap.sections.filter((s) => !s.tierName);
}

export function useCheckoutFlow({ basePrice, eventId, ticketType, customQuestions, products = [], includedProductIds = [], answerEditWindowHours, seatMap, requiredSeatCount = 1, onClose }: {
  basePrice: number; eventId?: string; ticketType: string; customQuestions?: CustomQuestion[]; products?: EventProduct[]; includedProductIds?: string[]; answerEditWindowHours?: number | null; seatMap?: SeatMapConfig; /** Tier-specific assigned-seat count; couples tiers require two seats. */ requiredSeatCount?: number; onClose: () => void;
}) {
  // Extras bundled into the chosen tier are pre-selected and free (already in ticket price).
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedEventProduct[]>(() =>
    products
      .filter((p) => includedProductIds.includes(p.id))
      .map((p) => ({ productId: p.id, type: p.type, name: p.name, unitPrice: 0, quantity: 1 })));
  const addOns = selectedAddOns;
  // Seat-map events pick assigned seats first; quantity is then derived from them.
  const seatSections = useMemo(() => sectionsForTier(seatMap, ticketType), [seatMap, ticketType]);
  const hasSeats = seatSections.length > 0;
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const seatLimit = Math.max(1, requiredSeatCount);
  const hasFixedSeatRequirement = seatLimit > 1;
  const [step, setStep] = useState<CheckoutStep>(hasSeats ? 'seat' : 'review');
  const [manualQuantity, setManualQuantity] = useState(1);
  // When seats drive the order, quantity always equals the number chosen.
  const quantity = hasSeats ? selectedSeats.length : manualQuantity;
  const setQuantity = setManualQuantity;
  const [promoApplied, setPromoApplied] = useState<AppliedPromo | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [contactDetails, setContactDetails] = useState<ContactDetails>({ name: '', email: '', phone: '', contactMethod: 'email' });
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const questions = customQuestions ?? [];
  const hasQuestions = questions.length > 0;
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    const seed: Record<string, unknown> = {};
    questions.forEach((q) => { seed[q.id] = q.type === 'checkbox' ? [] : ''; });
    return seed;
  });
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});
  const [payMethod, setPayMethod] = useState<PaymentMethod>('telebirr');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const queryClient = useQueryClient();
  const completeCheckoutMutation = useMutation({
    mutationKey: ['checkout', 'complete'],
    mutationFn: async ({ quoteToken, eventId, payMethod }: { quoteToken?: string; eventId?: string; payMethod: PaymentMethod }) => {
      // Mirror the backend order pipeline: create order from the quote token, then
      // start a payment attempt. The backend charges total_minor server-side.
      const order = await orderModule.createOrder({ eventId, quoteToken: quoteToken ?? '' });
      await orderModule.startPayment({ orderId: order.id, provider: 'chapa', paymentMethod: payMethod });
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'user'] });
    },
  });

  const promoCode = promoApplied?.code;

  // Backend-authoritative money: the quote (orderModule.quote) computes subtotal,
  // discount, buyer fee, and total — the frontend only displays what it returns.
  // Mock body is swappable for POST /events/:event_id/order_quotes in Phase 3.
  const quoteInput = useMemo(() => {
    const ticketLine = { eventProductId: `ticket:${ticketType}`, quantity, unitPriceMinor: basePrice };
    const addOnLines = addOns
      .filter((a) => a.quantity > 0)
      .map((a) => ({ eventProductId: a.productId, quantity: a.quantity, unitPriceMinor: a.unitPrice }));
    return { eventId, items: [ticketLine, ...addOnLines], chargeCurrency: "ETB", promotionCode: promoCode ?? undefined };
  }, [eventId, ticketType, quantity, addOns, promoCode, basePrice]);

  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setQuoteLoading(true);
    orderModule.quote(quoteInput).then((q) => {
      if (!alive) return;
      setQuote(q);
      setQuoteLoading(false);
    });
    return () => { alive = false; };
  }, [quoteInput]);

  // Display-only money (cents) from the server quote. 0 while loading.
  const subtotal = quote?.subtotal_minor ?? 0;
  const discountTotal = quote?.discount_minor ?? 0;
  const discountAmount = Math.round((discountTotal / Math.max(1, quantity)) / 100) * 100;
  const serviceFee = quote?.buyer_fee_total ?? 0;
  const total = quote?.total_minor ?? 0;
  const quoteToken = quote?.quote_token;

  const hasExtras = products.length > 0;
  const steps = useMemo<{ id: CheckoutStep; label: string }[]>(() => [
    ...(hasSeats ? [{ id: 'seat' as CheckoutStep, label: 'Seats' }] : []),
    { id: 'review', label: 'Review' },
    ...(hasExtras ? [{ id: 'extras' as CheckoutStep, label: 'Extras' }] : []),
    { id: 'details', label: 'Details' },
    ...(hasQuestions ? [{ id: 'questions' as CheckoutStep, label: 'Questions' }] : []),
    { id: 'payment', label: 'Payment' },
  ], [hasSeats, hasExtras, hasQuestions]);
  const stepIndex = steps.findIndex(s => s.id === step);
  const visibleStep = stepIndex >= 0 ? stepIndex : 0;

  const validatePromo = async () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    setPromoError(''); setPromoLoading(true);
    try {
      const res = await promoService.validate(eventId || '', code, ticketType);
      if (res.valid && res.promo) { setPromoApplied({ code: res.promo.code, discount: res.promo.discount, type: res.promo.type, label: res.promo.label }); setPromoExpanded(false); }
      else setPromoError(res.error || 'Invalid promo code. Please try again.');
    } catch (err) { console.log('Promo validation error:', err); setPromoError('Failed to validate promo code. Please try again.'); }
    finally { setPromoLoading(false); }
  };
  const removePromo = () => { setPromoApplied(null); setPromoCodeInput(''); setPromoError(''); };

  const validateDetails = () => {
    const e: typeof errors = {};
    if (!contactDetails.name.trim() || contactDetails.name.trim().length < 2) e.name = 'Please enter your full name';
    if (contactDetails.contactMethod === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactDetails.email)) e.email = 'Enter a valid email';
    } else if (!/^(\+251|0)?9\d{8}$/.test(contactDetails.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid Ethiopian phone';
    setErrors(e); return Object.keys(e).length === 0;
  };
  const validateQuestions = () => {
    const qe: Record<string, string> = {};
    questions.forEach((q) => { if (!q.required) return; const v = answers[q.id]; if (q.type === 'checkbox') { if (!Array.isArray(v) || v.length === 0) qe[q.id] = 'Please select at least one option'; } else if (typeof v !== 'string' || v.trim() === '') qe[q.id] = 'This field is required'; });
    setQuestionErrors(qe); return Object.keys(qe).length === 0;
  };
  const goNext = () => { if (step === 'seat') setStep('review'); else if (step === 'review') setStep(hasExtras ? 'extras' : 'details'); else if (step === 'extras') setStep('details'); else if (step === 'details') { if (validateDetails()) setStep(hasQuestions ? 'questions' : 'payment'); } else if (step === 'questions') { if (validateQuestions()) setStep('payment'); } else if (step === 'payment') { setStep('processing'); completeCheckoutMutation.mutate(
        { quoteToken, eventId, payMethod },
        {
          onSuccess: (order) => {
            // MOCK-ONLY wallet effect (ADR-0003): the backend issues tickets after
            // payment via Ticketing::Packages::Issue; the frontend reads them from a
            // future GET /tickets. Until then, mirror the issued tickets locally so
            // My Tickets renders. Deleted at Phase 3.
            ticketsService.issueTicketsForOrder({
              id: order.id,
              eventId,
              ticketType,
              quantity,
              seats: hasSeats ? selectedSeats : undefined,
              addOns,
              answers,
              customQuestions: questions,
              answerEditWindowHours,
              completedAt: new Date().toISOString(),
            });
            setStep('success');
          },
        },
      ); } };
  const goBack = () => { if (step === 'review') { if (hasSeats) setStep('seat'); else onClose(); } else if (step === 'extras') setStep('review'); else if (step === 'details') setStep(hasExtras ? 'extras' : 'review'); else if (step === 'questions') setStep('details'); else if (step === 'payment') setStep(hasQuestions ? 'questions' : 'details'); else onClose(); };
  const toggleSeat = (seat: SelectedSeat) => {
    setSelectedSeats((prev) => {
      const exists = prev.some((s) => s.id === seat.id);
      if (exists) return prev.filter((s) => s.id !== seat.id);
      if (prev.length >= (hasFixedSeatRequirement ? seatLimit : MAX_SEATS)) return prev;
      return [...prev, seat];
    });
  };
  const canContinue = useMemo(() => {
    if (step === 'seat') return hasFixedSeatRequirement ? selectedSeats.length === seatLimit : selectedSeats.length > 0;
    return step !== 'payment' || payMethod !== 'card' || (cardNumber.replace(/\s/g, '').length >= 13 && cardExpiry.length === 5 && cardCvc.length >= 3);
  }, [step, selectedSeats.length, hasFixedSeatRequirement, seatLimit, payMethod, cardNumber, cardExpiry, cardCvc]);

  return { step, setStep, quantity, setQuantity, hasSeats, seatSections, selectedSeats, toggleSeat, maxSeats: hasFixedSeatRequirement ? seatLimit : MAX_SEATS, requiredSeats: hasFixedSeatRequirement ? seatLimit : undefined, promoApplied, setPromoApplied, promoCodeInput, setPromoCodeInput, promoExpanded, setPromoExpanded, promoError, setPromoError, promoLoading, validatePromo, removePromo, contactDetails, setContactDetails, errors, setErrors, questions, answers, setAnswers, questionErrors, setQuestionErrors, payMethod, setPayMethod, cardNumber, setCardNumber, cardExpiry, setCardExpiry, cardCvc, setCardCvc, promoCode, discountAmount, subtotal, discountTotal, serviceFee, total, steps, visibleStep, goNext, goBack, canContinue, products, includedProductIds, selectedAddOns, setSelectedAddOns, quoteLoading };
}
