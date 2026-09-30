import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderModule, type OrderQuote } from '@/lib/order';
import { ticketsService } from '@/lib/tickets';
import { clearCheckoutResumeKeys } from '@/lib/payment-return';
import { openHostedCheckout as openHostedCheckoutTab } from '@/lib/checkout-popup';
import { registrationModule, type ConsentDocument } from '@/lib/registration';
import { admissionModule, type AdmissionResult } from '@/lib/admission';
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

export function useCheckoutFlow({ basePrice, eventId, eventSlug, ticketType, ticketProductId, ticketTypeId, accessCode, invitationToken, customQuestions, products = [], includedProductIds = [], answerEditWindowHours, seatMap, requiredSeatCount = 1, dateSelection, eventDates = [], onClose }: {
  basePrice: number; eventId?: string; /** Backend slug — consent_requirements is slug-addressed. */ eventSlug?: string; ticketType: string; /** Real backend product id — what order_quotes consumes. Falls back to the synthetic id for mock tiers. */ ticketProductId?: string; /** Real Ticketing::TicketType id — consent + registration address it. */ ticketTypeId?: string; /** Audience proof for gated ticket types (access-code / invitation). */ accessCode?: string; invitationToken?: string; customQuestions?: CustomQuestion[]; products?: EventProduct[]; includedProductIds?: string[]; answerEditWindowHours?: number | null; seatMap?: SeatMapConfig; /** Tier-specific assigned-seat count; couples require two seats. */ requiredSeatCount?: number; /** Ticket-type date_selection mode (choose_one tiers need a selected date). */ dateSelection?: 'fixed' | 'choose_one'; /** Backend event dates (id + startsAt) for the choose_one date step. */ eventDates?: { id: string; startsAt: string; name?: string }[]; onClose: () => void;
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
  // choose_one ticket types require a selected event date at registration
  // (the backend rejects without one: invalid_registration). A single-date
  // event auto-selects it; multi-date events get a Date step before Review.
  const needsDate = dateSelection === 'choose_one' && eventDates.length > 0;
  const multiDate = needsDate && eventDates.length > 1;
  const [selectedEventDateId, setSelectedEventDateId] = useState<string | undefined>(
    () => (needsDate ? eventDates[0]?.id : undefined),
  );
  const [step, setStep] = useState<CheckoutStep>(hasSeats ? 'seat' : (needsDate ? 'date' : 'review'));
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
  // Applicable published form version for this ticket type (#19 resolved) —
  // answers must carry its id for stale-version detection. Absent when the
  // ticket type publishes no form (single-line/answer-free tickets still work).
  const [formVersionId, setFormVersionId] = useState<string>();
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
    stuckOrderKey
      ? window.localStorage.getItem(stuckOrderKey) ??
        sessionStorage.getItem(stuckOrderKey) ??
        undefined
      : undefined,
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

  // Load the published registration form version (public schema, #19). The
  // applicable version id goes on every answer at submit; no form = no version.
  useEffect(() => {
    if (!isLiveTicket || !eventSlug || !ticketTypeId) return;
    let alive = true;
    registrationModule.fetchRegistrationSchema(eventSlug, ticketTypeId)
      .then((schema) => {
        if (!alive || !schema) return;
        const first = schema.forms[0];
        if (first) setFormVersionId(first.id);
      })
      .catch(() => { /* schema is advisory — answers submit without a version when unavailable */ });
    return () => { alive = false; };
  }, [isLiveTicket, eventSlug, ticketTypeId]);

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
            window.localStorage.removeItem(stuckOrderKey);
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

  /**
   * Chapa V2 does NOT redirect the buyer back to the app (verified: the receipt
   * page stays put, and the API `return_url` is ignored). So open the hosted
   * checkout in a NEW tab and keep THIS tab alive to confirm — the webhook
   * fulfills server-side and the refresh + wallet poll then resolve it. Falls
   * back to a same-tab navigation when the popup is blocked. The
   * `digis:awaiting-confirm` flag tells the router to start the confirmation
   * poll on this (still-open) tab.
   */
  const openedCheckoutsRef = useRef<Set<string>>(new Set());
  const openHostedCheckout = (orderId: string, checkoutUrl: string) => {
    // Both the hook-level and per-call onSuccess handlers can fire for one
    // attempt; open exactly once per order.
    if (openedCheckoutsRef.current.has(orderId)) return;
    openedCheckoutsRef.current.add(orderId);
    openHostedCheckoutTab(orderId, checkoutUrl);
  };

  const completeCheckoutMutation = useMutation({
    mutationKey: ['checkout', 'complete'],
    // Admission selection → registration(s) + quote + ONE order. The backend
    // owns pricing, registration, and idempotency (its replay store replaces
    // the old register → quote → create-order pipeline). payNow branches on the
    // returned `next_action`.
    mutationFn: async ({ guestPhone }: { payMethod: PaymentMethod; guestPhone?: string }): Promise<AdmissionResult> => {
      return admissionModule.create(
        eventSlug!,
        buildSelectionInput(guestPhone),
        checkoutKeyRef.current ?? randomUuid(),
      );
    },
  });

  const finalizeSuccess = (order: { id: string }) => {
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
    // "Start fresh" is also possible when the conflict is our own registration
    // (no stored order id): replaceConflictCheckout releases it so the next
    // submit is genuinely new. Without this, a fresh session whose checkout was
    // started elsewhere had no way forward at all.
    const ownRegistration = !!registrationIdRef.current;
    setConflict({ kind, canContinue: !!resumeUrl || restartable, canReplace: restartable || ownRegistration });
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
    // #22 resolved: when the conflict is OUR OWN pending registration (not a
    // finished order), release it first so the next submit starts genuinely
    // fresh — otherwise "start fresh" would conflict again on the same slot.
    const ownRegistrationId = registrationIdRef.current;
    if (!stuck && ownRegistrationId) {
      try {
        await registrationModule.release(ownRegistrationId);
      } catch { /* release is best-effort — a stale/dead registration release is idempotent */ }
      registrationIdRef.current = undefined;
      // Drop the stable checkout key so the retry computes a fresh digest
      // instead of replaying the released registration's identity.
      checkoutKeyRef.current = null;
      if (checkoutKeyName) {
        try { sessionStorage.removeItem(checkoutKeyName); } catch { /* ignore */ }
      }
      closeConflictSheet();
      return;
    }
    if (!stuck) {
      closeConflictSheet();
      return;
    }
    try {
      sessionStorage.removeItem(paymentUrlKey(stuck));
      window.localStorage.removeItem(paymentUrlKey(stuck));
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
  const validGuestPhone = !isAuthenticated && contactDetails.phone.replace(/\s/g, '').length >= 10
    ? contactDetails.phone : undefined;
  const quoteInput = useMemo(() => {
    const ticketLine = { eventProductId: ticketProductId ?? `ticket:${ticketType}`, quantity, unitPriceMinor: basePrice, registrationId };
    const addOnLines = addOns
      .filter((a) => a.quantity > 0)
      .map((a) => ({ eventProductId: a.productId, quantity: a.quantity, unitPriceMinor: a.unitPrice }));
    return {
      eventId, items: [ticketLine, ...addOnLines], chargeCurrency: "ETB", promotionCode: promoCode ?? undefined,
      ...(validGuestPhone ? { guestPhone: validGuestPhone } : {}),
    };
  }, [eventId, ticketType, quantity, addOns, promoCode, basePrice, registrationId, ticketProductId, validGuestPhone]);

  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState<string>();
  // A guest with no valid phone yet cannot hit either quote endpoint: the
  // authenticated one 401s (authentication_required) and the guest one needs
  // a real phone. Show the local estimate until the Details step is complete.
  const guestNeedsPhone = !isAuthenticated && !validGuestPhone;
  useEffect(() => {
    if (guestNeedsPhone) {
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError(undefined);
      return;
    }
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
  }, [quoteInput, guestNeedsPhone]);

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
    ...(multiDate ? [{ id: 'date' as CheckoutStep, label: 'Date' }] : []),
    { id: 'review', label: 'Review' },
    ...(hasExtras ? [{ id: 'extras' as CheckoutStep, label: 'Extras' }] : []),
    ...(needsDetails ? [{ id: 'details' as CheckoutStep, label: 'Details' }] : []),
    ...(hasQuestions ? [{ id: 'questions' as CheckoutStep, label: 'Questions' }] : []),
    { id: 'payment', label: 'Payment' },
  ], [hasSeats, multiDate, hasExtras, hasQuestions, needsDetails]);
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
   * Build the admission selection from the cart. The backend turns this into
   * the registration(s) + quote + ONE order (replacing the old
   * register → quote → create-order pipeline). Only consents the buyer actually
   * accepted are sent; the backend re-validates required ones.
   */
  const buildSelectionInput = (guestPhone?: string) => {
    const accepted = consents.filter((c) => acceptedConsents[c.versionId]);
    const ticketItem = {
      eventProductId: ticketProductId ?? `ticket:${ticketType}`,
      quantity,
      ...(selectedEventDateId ? { selectedEventDateId } : {}),
      ...(accessCode ? { accessCode } : {}),
      ...(invitationToken ? { invitationToken } : {}),
      answers: questions.map((q) => ({
        ...(formVersionId ? { formVersionId } : {}),
        questionKey: q.id,
        value: answers[q.id],
      })),
      consents: accepted,
    };
    const addOnItems = addOns
      .filter((a) => a.quantity > 0)
      .map((a) => ({ eventProductId: a.productId, quantity: a.quantity, answers: [], consents: [] }));
    return {
      items: [ticketItem, ...addOnItems],
      chargeCurrency: 'ETB' as const,
      ...(promoCode ? { promotionCode: promoCode } : {}),
      ...(!isAuthenticated && guestPhone
        ? {
            phone: guestPhone,
            phoneConfirmation: true,
            ...(contactDetails.name ? { fullName: contactDetails.name } : {}),
            ...(contactDetails.email ? { email: contactDetails.email } : {}),
          }
        : {}),
    };
  };

  const goNext = async () => {
    if (step === 'seat') setStep(multiDate ? 'date' : 'review');
    else if (step === 'date') { if (selectedEventDateId) setStep('review'); }
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
      raw = window.localStorage.getItem(paymentUrlKey(stuckOrderId)) ?? sessionStorage.getItem(paymentUrlKey(stuckOrderId));
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
    const guestPhone = !isAuthenticated && validGuestPhone ? validGuestPhone : undefined;
    setPaying(true);
    setStep('processing');
    try {
      // One call: registration(s) + quote + order, then branch on next_action.
      const result = await completeCheckoutMutation.mutateAsync({ payMethod, guestPhone });
      const { nextAction, order, guestOrderToken } = result;

      // Free / fully-discounted admission — the backend confirms + issues.
      if (nextAction.type === 'confirmed' || nextAction.type === 'issuing') {
        finalizeSuccess(order ?? { id: nextAction.orderId ?? '' });
        return;
      }
      if (nextAction.type === 'awaiting_approval') {
        enterPending('Your request was received. The organizer will review it and you’ll be notified once it’s approved.');
        return;
      }
      if (nextAction.type === 'waitlist_available') {
        setStep('payment');
        setPaymentError('One or more of those tickets just sold out — try joining the waitlist instead.');
        return;
      }
      if (nextAction.type === 'checkout_required' && nextAction.orderId && order) {
        const guest = guestPhone ? { orderAccessToken: guestOrderToken, phone: guestPhone } : undefined;
        const { payment } = await orderModule.startPayment({
          orderId: nextAction.orderId,
          provider: 'chapa',
          paymentMethod: payMethod,
          eventId,
          ...(guest ? { guest } : {}),
        });
        if (!payment || payment.status === 'succeeded') { finalizeSuccess(order); return; }
        if (payment.status === 'processing' && payment.checkout_url) {
          try {
            const payload = JSON.stringify({ url: payment.checkout_url, at: Date.now() });
            sessionStorage.setItem(paymentUrlKey(order.id), payload);
            window.localStorage.setItem(paymentUrlKey(order.id), payload);
          } catch { /* storage full/blocked — resume link just won't exist */ }
          openHostedCheckout(order.id, payment.checkout_url);
          return;
        }
        setStep('payment');
        setPaymentError('Payment could not be started. Please try again.');
        return;
      }
      enterPending('Your registration was received and is being confirmed. Check Tickets shortly.');
    } catch (e) {
      setStep('payment');
      if (e instanceof ApiError && (e.code === 'payment_already_accepted' || e.code === 'payment_succeeded_pending_acceptance')) {
        // Money already moved — a confirmation wait, not a failure.
        enterPending('Your payment is being confirmed. Check Tickets shortly — your tickets will appear there.');
        return;
      }
      if (e instanceof ApiError && (e.code === 'active_checkout_exists' || e.code === 'idempotency_conflict')) {
        // A previous checkout for this buyer+event is still open — offer the
        // choice sheet (resume / view Tickets), never a bare inline dead-end.
        openConflictSheet('finished');
        return;
      }
      setPaymentError(e instanceof ApiError ? messageForCode(e.code, e.message) : 'Something went wrong. Please try again.');
    } finally {
      setPaying(false);
    }
  };
  const goBack = () => { if (step === 'pending') { setStep('payment'); return; } if (step === 'date') { if (hasSeats) setStep('seat'); else onClose(); } if (step === 'review') { if (multiDate) setStep('date'); else if (hasSeats) setStep('seat'); else onClose(); } else if (step === 'extras') setStep('review'); else if (step === 'details') setStep(hasExtras ? 'extras' : 'review'); else if (step === 'questions') setStep(needsDetails ? 'details' : (hasExtras ? 'extras' : 'review')); else if (step === 'payment') setStep(hasQuestions ? 'questions' : (needsDetails ? 'details' : (hasExtras ? 'extras' : (multiDate ? 'date' : 'review')))); else onClose(); };
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
    if (step === 'date') return Boolean(selectedEventDateId);
    // CBE is disabled (backend gap) — it can never be the active method, but
    // guard anyway so a stale selection can't submit.
    if (step === 'payment' && payMethod === 'cbe') return false;
    return step !== 'payment' || payMethod !== 'card' || (cardNumber.replace(/\s/g, '').length >= 13 && cardExpiry.length === 5 && cardCvc.length >= 3);
  }, [step, selectedSeats.length, hasFixedSeatRequirement, seatLimit, payMethod, cardNumber, cardExpiry, cardCvc, selectedEventDateId]);

  return { step, setStep, quantity, setQuantity, hasSeats, seatSections, selectedSeats, toggleSeat, maxSeats: hasFixedSeatRequirement ? seatLimit : MAX_SEATS, requiredSeats: hasFixedSeatRequirement ? seatLimit : undefined, promoApplied, setPromoApplied, promoCodeInput, setPromoCodeInput, promoExpanded, setPromoExpanded, promoError, setPromoError, promoLoading, validatePromo, removePromo, contactDetails, setContactDetails, errors, setErrors, questions, answers, setAnswers, questionErrors, setQuestionErrors, payMethod, setPayMethod, cardNumber, setCardNumber, cardExpiry, setCardExpiry, cardCvc, setCardCvc, promoCode, discountAmount, subtotal, discountTotal, serviceFee, total, steps, visibleStep, goNext, goBack, canContinue, products, includedProductIds, selectedAddOns, setSelectedAddOns, quoteLoading, quoteError, isLiveTicket, needsDetails, consents, consentsLoading, consentsError, reloadConsents: loadConsents, acceptedConsents, toggleConsent, consentError, registrationError, paymentError, paying, pendingNotice, conflict, closeConflictSheet, continueConflictCheckout, replaceConflictCheckout, isRegistering: registeringRef.current, needsDate, multiDate, eventDates, selectedEventDateId, setSelectedEventDateId };
}
