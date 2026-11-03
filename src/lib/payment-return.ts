/** Reconcile the exact hosted payment attempt through the server refresh API.
 * A wallet ticket alone cannot prove payment. Missing attempt IDs and transient
 * verification failures remain unconfirmed until the watchdog expires.
 */
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ticketKeys, mapWalletTicket } from '@/lib/tickets';
import { orderModule, findGuestReturnCreds } from '@/lib/order';
import type { PaymentRefreshResult } from '@/lib/order';
import { guestWallet } from '@/lib/guest-wallet';
import { toApiError } from '@/lib/errors';
import { toastWarning } from '@/lib/feedback';
import type { UserTicket } from '@/types';

/**
 * Clear per-checkout resume state after a payment reaches a terminal outcome.
 * Keys are per event+ticketType (or per order) and must not leak into the
 * NEXT purchase of the same tier — a stale checkout key would replay the same
 * admission-selection digest instead of starting the buyer's new order. The
 * `digis:stuck-order:*` / `digis:payment-url:*` prefixes are legacy (the
 * restart/resume machinery was retired) and are swept only to clear old tabs.
 */
export function clearCheckoutResumeKeys(): void {
  try {
    const prefixes = ['digis:checkout-key:', 'digis:stuck-order:', 'digis:payment-url:', 'digis:payment-key:', 'digis:payment-event:', 'digis:payment-id:', 'digis:awaiting-confirm', 'digis:guest:', 'digis:gift-order:', 'digis:gift-draft-lines:'];
    const clearStore = (store: Storage) => {
      const doomed: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k && prefixes.some((p) => k.startsWith(p))) doomed.push(k);
      }
      doomed.forEach((k) => store.removeItem(k));
    };
    clearStore(sessionStorage);
    clearStore(window.localStorage);
  } catch { /* storage unavailable — nothing to clear */ }
}

/** Status of the post-redirect confirmation poll. */
export type PaymentReturnState =
  | { kind: 'idle' }
  | { kind: 'confirming' }
  | { kind: 'confirmed'; ticket: UserTicket }
  | { kind: 'gift-confirmed'; orderId: string }
  | { kind: 'terminal' }
  | { kind: 'timeout' }
  | { kind: 'error'; message: string };

export interface PaymentReturnController {
  state: PaymentReturnState;
  /** True once the sheet is dismissed — the poll keeps running in the
   *  background so the wallet cache updates when the backend issues the
   *  ticket, but the sheet is hidden. */
  dismissed: boolean;
  start: () => void;
  /** Hide the sheet but keep confirming/polling (ticket may still be issuing
   *  server-side — webhook → outbox → issue). */
  dismiss: () => void;
  stop: () => void;
}

/** Gift-only orders intentionally create no ticket in the payer wallet. Require
 * server-confirmed payment + fulfillment, scoped to this exact hosted attempt. */
function verifiedPaymentOrder(result: PaymentRefreshResult, paymentId: string, eventId?: string): boolean {
  return result.payment?.id === paymentId && !!result.order?.id && result.payment.order_id === result.order.id &&
    result.payment.status === 'succeeded' && ['paid', 'fulfilled'].includes(result.order.status) &&
    (!eventId || result.order.event_id === eventId);
}

function completedGiftOrder(result: PaymentRefreshResult, paymentId: string, eventId?: string): string | undefined {
  if (!verifiedPaymentOrder(result, paymentId, eventId) || result.order.status !== 'fulfilled') return;
  try {
    return sessionStorage.getItem(`digis:gift-order:${result.order.id}`) === 'true' ? result.order.id : undefined;
  } catch { return; }
}

/**
 * Guest variant of usePaymentReturnConfirmation. Calls
 * POST /guest/payments/:id/refresh (not the wallet poll) using the
 * quote_token + phone that were persisted alongside payment-id at redirect
 * time. No wallet poll is available for guests — the refresh endpoint is
 * the sole confirmation signal.
 */
export function useGuestPaymentReturnConfirmation(
  eventId: string | undefined,
  paymentId?: string,
  { pollMs = 3_000, timeoutMs = 300_000 }: { pollMs?: number; timeoutMs?: number } = {},
): PaymentReturnController {
  const [state, setState] = useState<PaymentReturnState>({ kind: 'idle' });
  const [dismissed, setDismissed] = useState(false);
  const seen = useRef<ReadonlySet<string>>(new Set());
  const queryClient = useQueryClient();
  // Guest refresh failures count against a 10/minute IP+phone throttle on the
  // backend. On a 429 we pause polling for the 1-minute window instead of
  // hammering it (which would lock the phone out and never recover).
  const throttleBackoffUntil = useRef(0);

  // Reconcile via POST /guest/payments/:payment_id/refresh. This is the
  // sole confirmation signal for guests (no wallet poll).
  useEffect(() => {
    if (state.kind !== 'confirming' || !paymentId) return;
    let alive = true;
    const reconcile = async () => {
      if (Date.now() < throttleBackoffUntil.current) return;
      // Creds are keyed per ORDER; find the set that belongs to THIS payment
      // (via the digis:payment-id:<orderId> mapping written at redirect time).
      // Grabbing an arbitrary set sends the wrong quote_token/phone to the
      // backend → invalid_guest_quote, and each retry burns the guest throttle.
      const guestCreds = findGuestReturnCreds(paymentId);
      if (!guestCreds) {
        // No stored creds to reconcile with (storage cleared/expired) — this
        // won't self-heal, so stop spinning and tell the buyer honestly.
        if (alive) setState({ kind: 'terminal' });
        return;
      }
      try {
        const result = await orderModule.guestRefreshPayment(paymentId, guestCreds);
        if (!alive) return;
        const giftOrderId = completedGiftOrder(result, paymentId, eventId);
        if (giftOrderId) {
          clearCheckoutResumeKeys();
          setState({ kind: 'gift-confirmed', orderId: giftOrderId });
          return;
        }
        if (result.state === 'ready' && verifiedPaymentOrder(result, paymentId, eventId)) {
          const scoped = (result.tickets ?? [])
            .filter((w) => w.event.id === result.order.event_id)
            .map(mapWalletTicket).filter(ticket => ticket.status === 'active' && !!ticket.qrCode);
          const fresh = scoped.filter((t) => !seen.current.has(t.id)).sort(
            (a, b) => Date.parse(b.purchased || '') - Date.parse(a.purchased || ''),
          )[0] ?? scoped[0];
          if (fresh) {
            // Persist the issued tickets into the encrypted device guest wallet
            // BEFORE the checkout resume keys are cleared — this is the only
            // moment the full wire (with per-credential QR) is available to an
            // unauthenticated buyer. AWAITED so the write is durable before the
            // confirmed screen lets the buyer navigate to /tickets.
            const wired = (result.tickets ?? []).filter(
              (w) => !eventId || w.event.id === eventId,
            );
            try {
              await guestWallet.saveTickets(wired, { phone: guestCreds.phone });
            } catch (saveError) {
              // The payment is confirmed, but the device copy failed — tell the
              // buyer instead of silently losing the ticket on their next visit.
              console.error('[guest-wallet] save failed — device tickets will not persist', saveError);
              toastWarning('Payment confirmed, but we could not save this ticket to your device. Sign in or use the SMS link so you can open it again.');
            }
            queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets });
            clearCheckoutResumeKeys();
            setState({ kind: 'confirmed', ticket: fresh });
          }
        } else if (result.state === 'terminal') {
          clearCheckoutResumeKeys();
          setState({ kind: 'terminal' });
        }
      } catch (error) {
        if (!alive) return;
        const api = toApiError(error);
        // These will never self-heal — stop polling so the buyer isn't left
        // spinning to the 5-minute timeout, and stop feeding the throttle.
        if (
          api.status === 403 ||
          api.status === 404 ||
          api.code === 'invalid_guest_quote' ||
          api.code === 'payment_order_not_owned' ||
          api.code === 'payment_not_found'
        ) {
          setState({ kind: 'terminal' });
          return;
        }
        // Backend throttle (429): pause for its 1-minute window, then resume —
        // a transient lockout shouldn't kill a payment that may still settle.
        if (api.code === 'rate_limited' || api.status === 429) {
          throttleBackoffUntil.current = Date.now() + 60_000;
          return;
        }
        // Transient — retry on the next interval.
      }
    };
    void reconcile();
    const id = window.setInterval(() => { void reconcile(); }, pollMs);
    return () => { alive = false; window.clearInterval(id); };
  }, [state.kind, paymentId, eventId, queryClient, pollMs]);

  // Timeout watchdog.
  useEffect(() => {
    if (state.kind !== 'confirming') return;
    const id = window.setTimeout(() => {
      setState((cur) => (cur.kind === 'confirming' ? { kind: 'timeout' } : cur));
    }, timeoutMs);
    return () => window.clearTimeout(id);
  }, [state.kind, timeoutMs]);

  const start = () => {
    setDismissed(false);
    throttleBackoffUntil.current = 0;
    setState((s) => {
      if (s.kind !== 'idle') return s;
      return { kind: 'confirming' };
    });
  };
  const dismiss = () => setDismissed(true);
  const stop = () => setState({ kind: 'idle' });
  return { state, dismissed, start, dismiss, stop };
}

/** Confirm authenticated purchases from server-verified attempt evidence. */
export function usePaymentReturnConfirmation(
  eventId: string | undefined,
  knownTicketIds: ReadonlySet<string> | UserTicket[],
  isAuthenticated: boolean,
  // Buyer-owned attempt id persisted at redirect time. When present, the
  // return screen reconciles via POST /payments/:id/refresh FIRST (backend
  // verifies the attempt and returns a `state`): ready → confirm instantly,
  // terminal → surface the failure, pending → keep reconciling.
  paymentId?: string,
  // 5-minute ceiling: verification runs through two per-minute outbox drains
  // (accept, then fulfill → issue), so a 2-minute timeout fires on healthy
  // payments that simply queued behind the drain.
  { pollMs = 3_000, timeoutMs = 300_000, userId }: { pollMs?: number; timeoutMs?: number; userId?: string } = {},
): PaymentReturnController {
  const [state, setState] = useState<PaymentReturnState>({ kind: 'idle' });
  const [dismissed, setDismissed] = useState(false);
  const queryClient = useQueryClient();
  // Prefer an unseen ticket within the exact verified order response.
  // This baseline never supplies payment proof itself.
  const knownKey = knownTicketIds instanceof Set
    ? `set:${knownTicketIds.size}`
    : `arr:${(knownTicketIds as UserTicket[]).map((t) => t.id).join(',')}`;
  const seen = useRef<ReadonlySet<string>>(new Set());
  const baseline = (): ReadonlySet<string> => knownTicketIds instanceof Set
    ? knownTicketIds
    : new Set((knownTicketIds as UserTicket[]).map((t) => t.id));

  // Keep the baseline in sync ONLY while idle (before a return starts). Once
  // confirming, freeze it so a wallet refresh cannot absorb the newly issued ticket.
  useEffect(() => {
    if (state.kind !== 'idle') return;
    seen.current = baseline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knownKey, state.kind]);

  // Only the server reconciliation for this exact attempt can confirm payment.
  useEffect(() => {
    if (state.kind !== 'confirming' || !paymentId || !isAuthenticated) return;
    let alive = true;
    const reconcile = async () => {
      try {
        const result = await orderModule.refreshPayment(paymentId);
        if (!alive) return;
        const giftOrderId = completedGiftOrder(result, paymentId, eventId);
        if (giftOrderId) {
          clearCheckoutResumeKeys();
          setState({ kind: 'gift-confirmed', orderId: giftOrderId });
          return;
        }
        if (result.state === 'ready' && verifiedPaymentOrder(result, paymentId, eventId)) {
          const scoped = (result.tickets ?? [])
            .filter((w) => w.event.id === result.order.event_id)
            .map(mapWalletTicket).filter(ticket => ticket.status === 'active' && !!ticket.qrCode);
          const fresh = scoped.filter((t) => !seen.current.has(t.id)).sort(
            (a, b) => Date.parse(b.purchased || '') - Date.parse(a.purchased || ''),
          )[0] ?? scoped[0];
          if (fresh) {
            queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets });
            clearCheckoutResumeKeys();
            setState({ kind: 'confirmed', ticket: fresh });
          }
          // No scoped ticket yet — keep reconciling/polling.
        } else if (result.state === 'terminal') {
          clearCheckoutResumeKeys();
          setState({ kind: 'terminal' });
        }
        // pending → next interval re-checks.
      } catch { /* Keep reconciling; a wallet alone cannot prove this payment. */ }
    };
    void reconcile();
    const id = window.setInterval(() => { void reconcile(); }, pollMs);
    return () => { alive = false; window.clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind, paymentId, eventId, isAuthenticated, queryClient, pollMs]);

  // Timeout watchdog.
  useEffect(() => {
    if (state.kind !== 'confirming') return;
    const id = window.setTimeout(() => {
      setState((cur) => (cur.kind === 'confirming' ? { kind: 'timeout' } : cur));
    }, timeoutMs);
    return () => window.clearTimeout(id);
  }, [state.kind, timeoutMs]);

  const start = () => {
    setDismissed(false);
    setState((s) => {
      if (s.kind !== 'idle') return s;
      seen.current = baseline();
      return { kind: 'confirming' };
    });
  };
  const dismiss = () => setDismissed(true);
  const stop = () => setState({ kind: 'idle' });
  return { state, dismissed, start, dismiss, stop };
}
