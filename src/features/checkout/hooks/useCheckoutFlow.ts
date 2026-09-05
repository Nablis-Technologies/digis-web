import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderModule, type CheckoutOrder, type OrderQuote } from '@/lib/order';
import { ticketsService } from '@/lib/tickets';
import { clearCheckoutResumeKeys } from '@/lib/payment-return';
import { registrationModule, type ConsentDocument } from '@/lib/registration';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ApiError, messageForCode } from '@/lib/errors';
import { randomUuid } from '@/lib/api';
import type { AppliedPromo, CheckoutStep, ContactDetails, CustomQuestion, EventProduct, PaymentMethod, SeatMapConfig, SelectedEventProduct, SelectedSeat } from '@/types';


export type { AppliedPromo, CheckoutStep, ContactDetails, PaymentMethod };

const MAX_SEATS = 8;

/** Sections available for the chosen tier: those matching its name, else all. */
function sectionsForTier(seatMap: SeatMapConfig | undefined, ticketType: string) {
  if (!seatMap) return [];
  const scoped = seatMap.sections.filter((s) => s.tierName === ticketType);
  return scoped.length ? scoped : seatMap.sections.filter((s) => !s.tierName);
}

export function useCheckoutFlow({ basePrice, eventId, eventSlug, ticketType, ticketProductId, ticketTypeId, accessCode, invitationToken, customQuestions, products = [], includedProductIds = [], answerEditWindowHours, seatMap, requiredSeatCount = 1, onClose }: {
  basePrice: number; eventId?: string; /** Backend slug — consent_requirements is slug-addressed. */ eventSlug?: string; ticketType: string; /** Real backend product id — what order_quotes consumes. Falls back to the synthetic id for mock tiers. */ ticketProductId?: string; /** Real Ticketing::TicketType id — consent + registration address it. */ ticketTypeId?: string; /** Audience proof for gated ticket types (access-code / invitation). */ accessCode?: string; invitationToken?: string; customQuestions?: CustomQuestion[]; products?: EventProduct[]; includedProductIds?: string[]; answerEditWindowHours?: number | null; seatMap?: SeatMapConfig; /** Tier-specific assigned-seat count; couples require two seats. */ requiredSeatCount?: number; onClose: () => void;
}) {
  const { user, isAuthenticated } = useAuth();
  // Sections available for the chosen tier: those matching its name, else all.
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedEventProduct[]>(() =>
    products
      .filter((p) => includedProductIds.includes(p.id))
      .map((p) => ({ productId: p.id, type: p.type, name: p.name, unitPrice: 0, quantity: 1 })));
  const addOns = selectedAddOns;
  const seatSections = useMemo(() => sectionsForTier(seatMap, ticketType), [seatMap, ticketType]);
  const hasSeats = seatSections.length > 0;
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const seatLimit = Math.max(1, requiredSeatCount);
  const hasFixedSeatRequirement = seatLimit > 1;
  const [step, setStep] = useState<CheckoutStep>(hasSeats ? 'seat' : 'review');
  const [manualQuantity, setManualQuantity] = useState(1);
  const quantity = hasSeats ? selectedSeats.length : manualQuantity;
  const setQuantity = setManualQuantity;
  const [paying, setPaying] = useState(false);
  const [promoApplied, setPromoApplied] = useState<AppliedPromo | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  // Logged-in buyers skip the details step — identity already lives on the
  // session user (registration uses user.phone; the backend never reads these
  // fields). Prefilled so receipts/contact display still has values.
  const [contactDetails, setContactDetails] = useState<ContactDetails>(() => ({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    contactMethod: user?.email ? 'email' : 'phone',
  }));
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

  /* ─── Phase 3 registration + consent state ─── */

  // Live ticket (real product + ticket type id on a real event) — everything
  // else stays on the mock pipeline.
  const isLiveTicket = !!(eventId && eventSlug && ticketProductId && ticketTypeId);
  const [consents, setConsents] = useState<ConsentDocument[]>([]);
  const [consentsLoading, setConsentsLoading] = useState(isLiveTicket);
  const [consentsError, setConsentsError] = useState<string>();
  const [acceptedConsents, setAcceptedConsents] = useState<Record<string, boolean>>({});
  const [consentError, setConsentError] = useState<string>();
  const [registrationId, setRegistrationId] = useState<string>();
  // Synchronous mirror of registrationId — a fresh quote built right after
  // registering must see the id without waiting for a React re-render.
  const registrationIdRef = useRef<string | undefined>(undefined);
  const [registrationError, setRegistrationError] = useState<string>();
  const [paymentError, setPaymentError] = useState<string>();
  // Guard against double-registration when the user bounces payment ↔ details.
  const registeringRef = useRef(false);
  // Single-flight Pay: two taps must not open two checkouts.
  const payingRef = useRef(false);
  // A dead pending checkout bound to this registration (order creation 409s
  // with idempotency_conflict because one order item may ever reference a
  // registration). Tracked so the retry goes through orders/:id/restart, which
  // closes the dead checkout and re-binds the registration to a fresh order.
  // Persisted per tab: there is no backend "my orders" endpoint to discover it.
  const stuckOrderKey = eventId && ticketTypeId ? `digis:stuck-order:${eventId}:${ticketTypeId}` : null;
  const stuckOrderIdRef = useRef<string | undefined>(
    stuckOrderKey ? sessionStorage.getItem(stuckOrderKey) ?? undefined : undefined,
  );
  // Stable per-checkout keys so a retried Pay click replays the SAME
  // registration instead of conflicting: the backend keys idempotency on the
  // Idempotency-Key header AND fingerprints answers/consents (which embed our
  // request_uuid) into the request digest. Fresh random UUIDs per retry change
  // the digest → active_registration_conflict. Persisted per tab alongside the
  // stuck order so remounts stay stable too.
  const checkoutKeyName = eventId && ticketTypeId ? `digis:checkout-key:${eventId}:${ticketTypeId}` : null;
  const checkoutKeyRef = useRef<string | null>(null);
  if (checkoutKeyRef.current === null) {
    let key: string | null = checkoutKeyName ? sessionStorage.getItem(checkoutKeyName) : null;
    if (!key) {
      key = randomUuid();
      if (checkoutKeyName) {
        try {
          sessionStorage.setItem(checkoutKeyName, key);
        } catch { /* storage unavailable — key stays in-memory only */ }
      }
    }
    checkoutKeyRef.current = key;
  }
  const paymentUrlKey = (orderId: string) => `digis:payment-url:${orderId}`;

  // Event terms (consent docs) are per-ticket-type on the backend — fetched on
  // checkout open so they're normally ready by the review step. The consent
  // section's Retry re-runs the same fetch; a placeholder row shows while it's
  // loading so terms never silently pop into the review page.
  const loadConsents = useCallback(() => {
    if (!isLiveTicket || !eventSlug || !ticketTypeId) return;
    setConsentsLoading(true);
    setConsentsError(undefined);
    registrationModule.fetchConsentRequirements(eventSlug, ticketTypeId)
      .then((docs) => setConsents(docs))
      .catch(() => setConsentsError('Could not load the event terms. Please try again.'))
      .finally(() => setConsentsLoading(false));
  }, [isLiveTicket, eventSlug, ticketTypeId]);

  useEffect(() => { loadConsents(); }, [loadConsents]);

  const toggleConsent = (versionId: string) => {
    setAcceptedConsents((prev) => ({ ...prev, [versionId]: !prev[versionId] }));
    setConsentError(undefined);
  };

  /**
   * Restart a stuck checkout. When the stuck order is already terminal
   * (fulfilled after a completed purchase, expired, cancelled) the backend
   * refuses — that stored pointer belongs to a FINISHED purchase, so drop
   * all resume state and fail with a start-fresh message instead of looping
   * on the dead order (or worse, redirecting to its old Chapa page).
   */
  const restartStuckCheckout = async (stuckOrderId: string, quoteToken: string) => {
    try {
      return await orderModule.restartOrder({ oldOrderId: stuckOrderId, quoteToken });
    } catch (restartError) {
      if (restartError instanceof ApiError && restartError.code === 'checkout_restart_unavailable') {
        stuckOrderIdRef.current = undefined;
        if (stuckOrderKey) {
          try {
            sessionStorage.removeItem(stuckOrderKey);
          } catch { /* ignore */ }
        }
        clearCheckoutResumeKeys();
        throw new ApiError(
          'That earlier checkout is already finished. Please start a new order.',
          409,
          'checkout_restart_unavailable',
        );
      }
      throw restartError;
    }
  };

  const completeCheckoutMutation = useMutation({
    mutationKey: ['checkout', 'complete'],
    // Returns the order + payment attempt (`payment` is null for free orders,
    // which the backend fulfills without payment). A Chapa attempt comes back
    // status "processing" with a checkout_url the buyer must be redirected to.
    mutationFn: async ({ quoteToken, eventId: evId, payMethod: method }: { quoteToken?: string; eventId?: string; payMethod: PaymentMethod }) => {
      // Mirror the backend order pipeline: create order from the quote token,
      // then start a payment attempt. The backend charges total_minor
      // server-side. A prior dead checkout bound to this registration makes
      // order creation 409 (idempotency_conflict, via
      // idx_one_order_item_per_registration) — recover through restart, which
      // closes the dead order and creates the replacement with the same
      // registration.
      const order = await orderModule.createOrder({ eventId: evId, quoteToken: quoteToken ?? '' }).catch(async (createError) => {
        const stuck = stuckOrderIdRef.current;
        if (!stuck) throw createError;
        // 409 (same registration bound to the dead checkout) → restart it.
        if (createError instanceof ApiError && createError.status === 409) {
          return restartStuckCheckout(stuck, quoteToken ?? '');
        }
        // 422 active_checkout_exists (a retry after the order was already
        // created — e.g. failed payment init, back-navigation, double Pay):
        // restart the stuck checkout instead of dead-ending for 10 minutes.
        if (createError instanceof ApiError && createError.code === 'active_checkout_exists') {
          return restartStuckCheckout(stuck, quoteToken ?? '');
        }
        throw createError;
      });
      stuckOrderIdRef.current = order.id;
      if (stuckOrderKey) sessionStorage.setItem(stuckOrderKey, order.id);
      // Free orders (RSVP / fully discounted) carry no payable amount — the
      // backend fulfills them server-side, and StartPaymentAttempt rejects
      // total_minor <= 0 with payment_amount_invalid. Skip the attempt.
      if (order.total_minor === 0) return { order, payment: null };
      const { payment } = await orderModule.startPayment({ orderId: order.id, provider: 'chapa', paymentMethod: method, eventId: evId });
      return { order, payment };
    },
    onSuccess: ({ order, payment }) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'user'] });
      // Chapa hosted checkout: hand the buyer to Chapa's page. The backend
      // verifies the outcome server-side (webhook + return-URL verify); when
      // Chapa redirects back the session/refresh flow re-enters the app.
      // Persist the URL so a later retry resumes instead of conflicting.
      if (payment && payment.status === 'processing' && payment.checkout_url) {
        try {
          sessionStorage.setItem(
            paymentUrlKey(order.id),
            JSON.stringify({ url: payment.checkout_url, at: Date.now() }),
          );
        } catch { /* storage unavailable — resume link just won't exist */ }
        window.location.href = payment.checkout_url;
        return;
      }
      finalizeSuccess(order);
    },
  });

  const finalizeSuccess = (order: CheckoutOrder) => {
    // Terminal outcome — drop per-checkout resume keys so the NEXT purchase
    // of the same tier starts fresh instead of replaying this registration.
    clearCheckoutResumeKeys();
    // Live orders: the backend issues tickets server-side after payment
    // (Ticketing::Packages::Issue) and the wallet reads them from
    // GET /tickets. Mock-issue ONLY for mock carts — faking wallet rows for a
    // live order would mask the real async issuance (ADR-0003).
    if (!isLiveTicket) {
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
    }
    setStep('success');
  };

  /** Terminal non-order state from registration (approval / free-confirm flows). */
  const [pendingNotice, setPendingNotice] = useState<string>();
  const enterPending = (notice: string) => {
    setPendingNotice(notice);
    setStep('pending');
  };

  /**
   * Choice sheet state: the buyer ran into a checkout they already started
   * (active registration from an earlier checkout, or a finished stuck
   * order). This is never rendered as a bare error — the sheet offers
   * Continue (resume/restart the old checkout) and View Tickets.
   * `canContinue` is true when a fresh resume link or a restartable stuck
   * order exists; otherwise only View Tickets is offered.
   */
  const [conflict, setConflict] = useState<{
    kind: 'registration' | 'finished';
    canContinue: boolean;
    canReplace: boolean;
  } | null>(null);
  const openConflictSheet = (kind: 'registration' | 'finished') => {
    // Continue is only offered when it can actually proceed: a fresh resume
    // link (redirect), or a stuck order plus this purchase's registration
    // (restart with a fresh quote). Otherwise the sheet offers View Tickets
    // only — a Continue button that loops back into the same conflict would
    // be a fake option.
    const stuck = stuckOrderIdRef.current;
    const resumeUrl = stuck ? readResumeUrl(stuck) : null;
    const restartable = !!stuck && !!registrationIdRef.current;
    setConflict({ kind, canContinue: !!resumeUrl || restartable, canReplace: restartable });
    setStep('payment');
  };
  const closeConflictSheet = () => setConflict(null);

  /**
   * Sheet action: continue the earlier checkout. Prefers the stored hosted
   * payment link; otherwise restarts the stuck order with this purchase's
   * registration (payNow already routes both ways).
   */
  const continueConflictCheckout = async () => {
    closeConflictSheet();
    const stuck = stuckOrderIdRef.current;
    const resumeUrl = stuck ? readResumeUrl(stuck) : null;
    if (resumeUrl) {
      window.location.href = resumeUrl;
      return;
    }
    if (stuck && registrationIdRef.current && !payingRef.current && !completeCheckoutMutation.isPending) {
      payingRef.current = true;
      try {
        await payNow();
      } finally {
        payingRef.current = false;
      }
    }
  };

  /**
   * Sheet action: discard the interrupted checkout and replace it — restart
   * closes the old order and binds the same registration to a fresh one
   * built from the buyer's current selections. Never offered (or attempted)
   * when the old payment already completed: restart refuses terminal orders
   * and the buyer is sent to Tickets instead.
   */
  const replaceConflictCheckout = async () => {
    const stuck = stuckOrderIdRef.current;
    if (!stuck) {
      closeConflictSheet();
      return;
    }
    try {
      sessionStorage.removeItem(paymentUrlKey(stuck));
    } catch { /* ignore */ }
    closeConflictSheet();
    if (registrationIdRef.current && !payingRef.current && !completeCheckoutMutation.isPending) {
      payingRef.current = true;
      try {
        await payNow();
      } finally {
        payingRef.current = false;
      }
    }
  };

  const promoCode = promoApplied?.code;

  // Backend-authoritative money: the quote (orderModule.quote) computes subtotal,
  // discount, buyer fee, and total — the frontend only displays what it returns.
  // The quote only becomes REAL once registration exists (ticket lines require a
  // registration_id); until then live tiers show the local mock estimate.
  // Server-side promo failures surface on the promo field (not the total line).
  const quoteInput = useMemo(() => {
    const ticketLine = { eventProductId: ticketProductId ?? `ticket:${ticketType}`, quantity, unitPriceMinor: basePrice, registrationId };
    const addOnLines = addOns
      .filter((a) => a.quantity > 0)
      .map((a) => ({ eventProductId: a.productId, quantity: a.quantity, unitPriceMinor: a.unitPrice }));
    return { eventId, items: [ticketLine, ...addOnLines], chargeCurrency: "ETB", promotionCode: promoCode ?? undefined };
  }, [eventId, ticketType, quantity, addOns, promoCode, basePrice, registrationId, ticketProductId]);

  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState<string>();
  useEffect(() => {
    let alive = true;
    setQuoteLoading(true);
    setQuoteError(undefined);
    orderModule.quote(quoteInput).then((q) => {
      if (!alive) return;
      setQuote(q);
      // A stored promo code the server doesn't know is surfaced on the promo
      // field; the totals shown are the server's (without the discount).
      if (promoCode) setPromoError('');
      setQuoteLoading(false);
    }).catch((e) => {
      if (!alive) return;
      setQuote(null);
      setQuoteLoading(false);
      // A live TICKET quote without a registration is rejected by design
      // (registration_required) — not an error. Until registration at Pay,
      // the tier price is the display estimate; the authoritative quote
      // happens right after registration. Any other failure is real.
      const isPreregistrationTicketQuote =
        isLiveTicket && !registrationId && e instanceof ApiError && e.code === 'registration_required';
      if (isPreregistrationTicketQuote) {
        setQuoteError(undefined);
      } else if (
        isLiveTicket && promoCode && e instanceof ApiError &&
        (e.code === 'invalid_promotion_code' || e.code === 'promotion_unavailable')
      ) {
        // Bad promo code: keep the totals area clean, explain on the field.
        setQuoteError(undefined);
        setPromoError(messageForCode(e.code, e.message));
      } else {
        setQuoteError(e instanceof ApiError ? messageForCode(e.code, e.message) : 'Could not load pricing. Check your connection and try again.');
      }
    });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteInput]);

  // Display-only money (cents). Live-ticket pre-registration: estimate from
  // the tier price (the backend cannot price a ticket before registration).
  // After registration (or for extras-only carts) the server quote wins.
  const estimateMinor = basePrice * quantity + addOns.reduce((s, a) => s + a.unitPrice * a.quantity, 0);
  const subtotal = quote?.subtotal_minor ?? estimateMinor;
  const discountTotal = quote?.discount_minor ?? 0;
  const discountAmount = Math.round((discountTotal / Math.max(1, quantity)) / 100) * 100;
  const serviceFee = quote?.buyer_fee_total ?? 0;
  const total = quote?.total_minor ?? estimateMinor;
  const quoteToken = quote?.quote_token;

  const hasExtras = products.length > 0;
  // A signed-in user has nothing to type on the details step — identity comes
  // from the session (registration sends user.phone; the backend ignores the
  // contact fields). Guests still get the form.
  const needsDetails = !isAuthenticated;
  const steps = useMemo<{ id: CheckoutStep; label: string }[]>(() => [
    ...(hasSeats ? [{ id: 'seat' as CheckoutStep, label: 'Seats' }] : []),
    { id: 'review', label: 'Review' },
    ...(hasExtras ? [{ id: 'extras' as CheckoutStep, label: 'Extras' }] : []),
    ...(needsDetails ? [{ id: 'details' as CheckoutStep, label: 'Details' }] : []),
    ...(hasQuestions ? [{ id: 'questions' as CheckoutStep, label: 'Questions' }] : []),
    { id: 'payment', label: 'Payment' },
  ], [hasSeats, hasExtras, hasQuestions, needsDetails]);
  const stepIndex = steps.findIndex(s => s.id === step);
  const visibleStep = stepIndex >= 0 ? stepIndex : 0;

  const validatePromo = async () => {
    // Promo validation is server-side at quote time (order_quotes validates
    // promotion_code). "Apply" just stores the code — the quote request below
    // carries it and the quote error surfaces invalid codes on the field.
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    removePromoErrorOnly();
    setPromoApplied({ code, discount: 0, type: 'fixed', label: code });
    setPromoExpanded(false);
  };
  const removePromo = () => { setPromoApplied(null); setPromoCodeInput(''); setPromoError(''); };
  const removePromoErrorOnly = () => { setPromoError(''); };

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
  /** Required consents accepted? Only enforced for live tickets with consents. */
  const validateConsents = () => {
    const missing = consents.filter((c) => c.required && !acceptedConsents[c.versionId]);
    if (missing.length > 0) {
      setConsentError(`Please accept ${missing[0].title} to continue.`);
      return false;
    }
    setConsentError(undefined);
    return true;
  };

  /**
   * Submit the registration (Phase 3). Returns the registration outcome's
   * next_action. Only "requires_order" proceeds to quote/order — manual
   * ticket types come back "awaiting_approval" (organizer decides via the
   * backend decision endpoints; no buyer action exists) and free automatic
   * types "requires_confirmation" (ConfirmFree has no buyer route; the
   * confirm path is organizer/complimentary-side).
   */
  const submitRegistration = async (): Promise<string | null> => {
    if (!isLiveTicket || registrationId) return 'requires_order';
    if (!isAuthenticated || !user?.phone) {
      setRegistrationError('Log in with your phone number to finish this purchase.');
      return null;
    }
    // Required consents must be loaded AND accepted — the backend rejects a
    // registration whose required buyer consents carry no acceptance.
    if (consentsError) { setRegistrationError(consentsError); return null; }
    if (consentsLoading) { setRegistrationError('Loading event terms...'); return null; }
    const missing = consents.filter((c) => c.required && !acceptedConsents[c.versionId]);
    if (missing.length > 0) {
      setRegistrationError(`Please accept ${missing[0].title} to continue.`);
      return null;
    }
    if (registeringRef.current) return null;
    registeringRef.current = true;
    setRegistrationError(undefined);
    try {
      const requiredConsents = consents.filter((c) => c.required && acceptedConsents[c.versionId]);
      const outcome = await registrationModule.register({
        ticketTypeId: ticketTypeId!,
        phone: user.phone,
        packageQuantity: quantity,
        answers: questions.map((q) => ({ questionKey: q.id, value: answers[q.id] })),
        consents: requiredConsents,
        ...(accessCode ? { accessCode } : {}),
        ...(invitationToken ? { invitationToken } : {}),
        // Stable keys: a retried Pay replays the same registration instead of
        // 422 active_registration_conflict (see registrationModule docs).
        idempotencyKey: checkoutKeyRef.current ?? randomUuid(),
        requestUuid: checkoutKeyRef.current ?? randomUuid(),
      });
      // Capture synchronously — goNext's fresh quote reads the local, not the
      // async state update that would only land on the next render.
      registrationIdRef.current = outcome.registrationId;
      setRegistrationId(outcome.registrationId);
      return outcome.nextAction;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'active_registration_conflict') {
        // Registration from an EARLIER checkout (not this tab's retry —
        // retries replay the same digest and succeed). Never a dead-end:
        // open the choice sheet (continue that checkout / view Tickets).
        openConflictSheet('registration');
        return null;
      }
      const msg = e instanceof ApiError
        ? messageForCode(e.code, e.message)
        : 'Registration failed. Please try again.';
      setRegistrationError(msg);
      return null;
    } finally {
      registeringRef.current = false;
    }
  };

  const goNext = async () => {
    if (step === 'seat') setStep('review');
    else if (step === 'review') { if (validateConsents()) setStep(hasExtras ? 'extras' : (needsDetails ? 'details' : (hasQuestions ? 'questions' : 'payment'))); }
    else if (step === 'extras') setStep(needsDetails ? 'details' : (hasQuestions ? 'questions' : 'payment'));
    else if (step === 'details') { if (validateDetails()) setStep(hasQuestions ? 'questions' : 'payment'); }
    else if (step === 'questions') { if (validateQuestions()) setStep('payment'); }
    else if (step === 'payment') {
      // Pay is single-flight: a second tap while the first is registering /
      // quoting / redirecting must not open a duplicate checkout.
      if (payingRef.current || completeCheckoutMutation.isPending) return;
      payingRef.current = true;
      try {
        return await payNow();
      } finally {
        payingRef.current = false;
      }
    }
  };

  /**
   * Stored resume links die with the checkout hold: the backend hold lasts 10
   * minutes, so a resume older than 15 minutes belongs to a finished (or
   * long-dead) purchase. Following it would teleport the buyer to another
   * checkout's Chapa page — e.g. an "already paid" receipt — instead of
   * starting their new order.
   */
  const readResumeUrl = (stuckOrderId: string): string | null => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(paymentUrlKey(stuckOrderId));
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { url?: string; at?: number };
      if (parsed && typeof parsed.url === 'string') {
        if (typeof parsed.at === 'number' && Date.now() - parsed.at > 15 * 60 * 1000) return null;
        return parsed.url;
      }
    } catch {
      // Legacy plain-URL value (pre-timestamp): honor it — it can only be a
      // few days old at most and the payment page itself states its outcome.
      return raw;
    }
    return null;
  };

  const payNow = async () => {
      // Resume path: a previous Pay already started a hosted payment for the
      // stuck order (we redirected or the tab reloaded). Restarting would 409
      // checkout_restart_payment_in_progress — send the buyer back to the
      // payment page instead of creating a duplicate order.
      const stuck = stuckOrderIdRef.current;
      if (stuck && !registrationId && !registrationIdRef.current) {
        const resumeUrl = readResumeUrl(stuck);
        if (resumeUrl) {
          window.location.href = resumeUrl;
          return;
        }
        // Stale pointer to a finished checkout: drop it so this Pay starts a
        // genuinely new order instead of restarting a dead one.
        stuckOrderIdRef.current = undefined;
        if (stuckOrderKey) {
          try {
            sessionStorage.removeItem(stuckOrderKey);
          } catch { /* ignore */ }
        }
      }
      // Registration happens at Pay (the submit moment) — consents and answers
      // are final by now, and the idempotent submit is safe to retry.
      const nextAction = await submitRegistration();
      if (!nextAction) return;
      // Non-order outcomes stop here: the organizer must approve first
      // (awaiting_approval), or the registration needs an organizer-side
      // confirm (requires_confirmation). Neither has a buyer next step.
      if (nextAction !== 'requires_order') {
        enterPending(
          nextAction === 'awaiting_approval'
            ? 'Your request was received. The organizer will review it and you’ll be notified once it’s approved.'
            : 'Your registration was received and is being confirmed. Check Tickets shortly.',
        );
        return;
      }
      setPaying(true);
      try {
        // Build the quote input INLINE with the just-created registration id —
        // `quoteInput` here is a stale closure that still lacks it, and the
        // backend rejects ticket orders without the registration bound.
        const freshRegistrationId = registrationIdRef.current;
        const buildFreshQuoteInput = () => ({
          eventId,
          items: [
            { eventProductId: ticketProductId ?? `ticket:${ticketType}`, quantity, unitPriceMinor: basePrice, registrationId: freshRegistrationId },
            ...addOns.filter((a) => a.quantity > 0).map((a) => ({ eventProductId: a.productId, quantity: a.quantity, unitPriceMinor: a.unitPrice })),
          ],
          chargeCurrency: 'ETB' as const,
          promotionCode: promoCode ?? undefined,
        });
        let freshQuote: OrderQuote;
        try {
          freshQuote = await orderModule.quote(buildFreshQuoteInput());
        } catch (quoteError) {
          // A slow buyer can outlive the 10-minute quote hold: re-quote once
          // (the registration is still valid) instead of failing outright.
          if (!(quoteError instanceof ApiError && quoteError.code === 'quote_expired')) throw quoteError;
          freshQuote = await orderModule.quote(buildFreshQuoteInput());
        }
        setStep('processing');
        completeCheckoutMutation.mutate(
          { quoteToken: freshQuote.quote_token, eventId, payMethod },
          {
            onError: (e) => {
              setStep('payment');
              if (e instanceof ApiError && e.code === 'checkout_restart_payment_in_progress') {
                // The stuck order has a live payment attempt — restarting is
                // forbidden. Resume the hosted payment if we kept its URL,
                // else tell the buyer to finish it before retrying.
                const resumeUrl = stuckOrderIdRef.current
                  ? readResumeUrl(stuckOrderIdRef.current)
                  : null;
                if (resumeUrl) {
                  window.location.href = resumeUrl;
                  return;
                }
              }
              if (
                e instanceof ApiError &&
                (e.code === 'payment_already_accepted' || e.code === 'payment_succeeded_pending_acceptance')
              ) {
                // Money already moved — this is a confirmation wait, not a
                // failure. The wallet picks the tickets up once fulfilled.
                enterPending('Your payment is being confirmed. Check Tickets shortly — your tickets will appear there.');
                return;
              }
              if (e instanceof ApiError && e.code === 'checkout_restart_unavailable') {
                // The stuck order already finished (paid/expired/cancelled):
                // keys are cleared, so offer the finished sheet (View Tickets)
                // instead of an inline dead-end.
                openConflictSheet('finished');
                return;
              }
              setPaymentError(e instanceof ApiError ? messageForCode(e.code, e.message) : 'Payment could not be started. Please try again.');
            },
            // onSuccess: with live Chapa the attempt returns "processing" +
            // checkout_url and the hook redirects the browser; the success
            // screen then renders on return. A synchronous success (free/
            // stubbed provider) lands here.
            onSuccess: ({ order, payment }) => {
              if (payment.status === 'processing' && payment.checkout_url) {
                try {
                  sessionStorage.setItem(
                    paymentUrlKey(order.id),
                    JSON.stringify({ url: payment.checkout_url, at: Date.now() }),
                  );
                } catch { /* storage full/blocked — resume link just won't exist */ }
                return;
              }
              finalizeSuccess(order);
            },
          },
        );
      } catch (e) {
        setStep('payment');
        setPaymentError(e instanceof ApiError ? messageForCode(e.code, e.message) : 'Something went wrong. Please try again.');
      } finally {
        setPaying(false);
      }
  };
  const goBack = () => { if (step === 'pending') { setStep('payment'); return; } if (step === 'review') { if (hasSeats) setStep('seat'); else onClose(); } else if (step === 'extras') setStep('review'); else if (step === 'details') setStep(hasExtras ? 'extras' : 'review'); else if (step === 'questions') setStep(needsDetails ? 'details' : (hasExtras ? 'extras' : 'review')); else if (step === 'payment') setStep(hasQuestions ? 'questions' : (needsDetails ? 'details' : (hasExtras ? 'extras' : 'review'))); else onClose(); };
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
    // CBE is disabled (backend gap) — it can never be the active method, but
    // guard anyway so a stale selection can't submit.
    if (step === 'payment' && payMethod === 'cbe') return false;
    return step !== 'payment' || payMethod !== 'card' || (cardNumber.replace(/\s/g, '').length >= 13 && cardExpiry.length === 5 && cardCvc.length >= 3);
  }, [step, selectedSeats.length, hasFixedSeatRequirement, seatLimit, payMethod, cardNumber, cardExpiry, cardCvc]);

  return { step, setStep, quantity, setQuantity, hasSeats, seatSections, selectedSeats, toggleSeat, maxSeats: hasFixedSeatRequirement ? seatLimit : MAX_SEATS, requiredSeats: hasFixedSeatRequirement ? seatLimit : undefined, promoApplied, setPromoApplied, promoCodeInput, setPromoCodeInput, promoExpanded, setPromoExpanded, promoError, setPromoError, promoLoading, validatePromo, removePromo, contactDetails, setContactDetails, errors, setErrors, questions, answers, setAnswers, questionErrors, setQuestionErrors, payMethod, setPayMethod, cardNumber, setCardNumber, cardExpiry, setCardExpiry, cardCvc, setCardCvc, promoCode, discountAmount, subtotal, discountTotal, serviceFee, total, steps, visibleStep, goNext, goBack, canContinue, products, includedProductIds, selectedAddOns, setSelectedAddOns, quoteLoading, quoteError, isLiveTicket, needsDetails, consents, consentsLoading, consentsError, reloadConsents: loadConsents, acceptedConsents, toggleConsent, consentError, registrationError, paymentError, paying, pendingNotice, conflict, closeConflictSheet, continueConflictCheckout, replaceConflictCheckout, isRegistering: registeringRef.current };
}
