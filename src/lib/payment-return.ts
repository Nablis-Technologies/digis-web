/**
 * Hooks for the Chapa return-URL flow.
 *
 * `CHAPA_RETURN_URL` on the backend is the customer-facing destination the
 * browser lands on after paying. It is not a payment confirmation endpoint;
 * the server verifies the outcome independently (webhook + return-URL verify).
 * From the buyer's perspective: show "Confirming your payment…" until either
 * a wallet ticket appears, the attempt is known-failed, or the timeout elapses.
 *
 * Because the backend has no buyer-scoped `GET /orders/:id` today, we poll
 * the authenticated wallet (the only buyer-visible completion signal). The
 * submitter (Chapa webhook → `orders.payment.fulfilled` →
 * `Ticketing::Packages::Issue`) puts a ticket in the wallet, so ticket
 * appearance is the truthful confirmation.
 *
 * For unauthenticated buyers (guest checkout, BACKEND_GAPS #14), the
 * POST /guest/payments/:id/refresh endpoint is called instead, using the
 * quote_token + phone persisted alongside the payment attempt id at redirect
 * time. A wallet poll is not available for guests — the refresh endpoint is
 * the sole confirmation signal.
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsService, ticketKeys, mapWalletTicket } from '@/lib/tickets';
import { orderModule, findGuestReturnCreds } from '@/lib/order';
import { guestWallet } from '@/lib/guest-wallet';
import { toApiError } from '@/lib/errors';
import { toastWarning } from '@/lib/feedback';
import type { UserTicket } from '@/types';

/**
 * Clear per-checkout resume state after a payment reaches a terminal outcome.
 * Keys are per event+ticketType (or per order) and must not leak into the
 * NEXT purchase of the same tier — a stale checkout key replays the same
 * registration digest (→ active_registration_conflict) and a stale stuck-order
 * id diverts order creation through restart for a dead order.
 */
export function clearCheckoutResumeKeys(): void {
  try {
    const prefixes = ['digis:checkout-key:', 'digis:stuck-order:', 'digis:payment-url:', 'digis:payment-key:', 'digis:payment-event:', 'digis:payment-id:', 'digis:awaiting-confirm', 'digis:guest:'];
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
        const result = await orderModule.guestRefreshPayment(
          paymentId, guestCreds.quoteToken, guestCreds.phone,
        );
        if (!alive) return;
        if (result.state === 'ready') {
          const scoped = (result.tickets ?? [])
            .filter((w) => !eventId || w.event.id === eventId)
            .map(mapWalletTicket);
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

/** A new (not-yet-known) wallet ticket is the success signal. `seen` lets
 *  callers pass the ticket set they already have on screen, so the very first
 *  poll that includes a new ticket resolves the confirmation. */
export function usePaymentReturnConfirmation(
  eventId: string | undefined,
  knownTicketIds: ReadonlySet<string> | UserTicket[],
  isAuthenticated: boolean,
  // Buyer-owned attempt id persisted at redirect time. When present, the
  // return screen reconciles via POST /payments/:id/refresh FIRST (backend
  // verifies the attempt and returns a `state`): ready → confirm instantly,
  // terminal → surface the failure, pending → wallet-poll as before.
  paymentId?: string,
  // 5-minute ceiling: verification runs through two per-minute outbox drains
  // (accept, then fulfill → issue), so a 2-minute timeout fires on healthy
  // payments that simply queued behind the drain.
  { pollMs = 3_000, timeoutMs = 300_000 }: { pollMs?: number; timeoutMs?: number } = {},
): PaymentReturnController {
  const [state, setState] = useState<PaymentReturnState>({ kind: 'idle' });
  const [dismissed, setDismissed] = useState(false);
  const queryClient = useQueryClient();
  // A new (not-yet-known) wallet ticket is the success signal. `seen` is the
  // frozen pre-return baseline: tickets the buyer already had before returning.
  // The first poll that surfaces a ticket for this event NOT in `seen` resolves
  // the confirmation.
  const knownKey = knownTicketIds instanceof Set
    ? `set:${knownTicketIds.size}`
    : `arr:${(knownTicketIds as UserTicket[]).map((t) => t.id).join(',')}`;
  const seen = useRef<ReadonlySet<string>>(new Set());
  const baseline = (): ReadonlySet<string> => knownTicketIds instanceof Set
    ? knownTicketIds
    : new Set((knownTicketIds as UserTicket[]).map((t) => t.id));

  // Keep the baseline in sync ONLY while idle (before a return starts). Once
  // confirming, it must stay frozen: the poll shares the wallet's cache, so
  // re-deriving `seen` from live wallet data would absorb the freshly-issued
  // ticket before the confirmation check can see it — the confirmation would
  // never fire and the spinner would run to timeout.
  useEffect(() => {
    if (state.kind !== 'idle') return;
    seen.current = baseline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knownKey, state.kind]);

  const wallet = useQuery({
    // Same key the router's wallet uses so confirmation shares (and
    // invalidates) the cache the ticket view actually reads.
    queryKey: [...ticketKeys.userTickets, isAuthenticated] as const,
    queryFn: ticketsService.fetchUserTickets,
    enabled: isAuthenticated && state.kind === 'confirming',
    refetchInterval: (query) => {
      // Stop polling once we resolve OR after the configured timeout.
      const last = query.state.data as UserTicket[] | undefined;
      if (last && eventId && last.some((t) => t.eventId === eventId && !seen.current.has(t.id))) {
        return false;
      }
      return state.kind === 'confirming' ? pollMs : false;
    },
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  // Reconcile via POST /payments/:id/refresh while we know the attempt. This is
  // the primary completion signal (backend-verified): `ready` → confirm now,
  // `terminal` → surface the failure. `pending` → keep re-checking on the same
  // cadence as the wallet poll — a fresh refresh picks up `ready` the moment the
  // backend verifies (webhook/callback → outbox), instead of waiting for the
  // wallet to gain the ticket. A refresh failure must NOT block confirmation —
  // the wallet poll below remains the safety net.
  useEffect(() => {
    if (state.kind !== 'confirming' || !paymentId || !isAuthenticated) return;
    let alive = true;
    const reconcile = async () => {
      try {
        const result = await orderModule.refreshPayment(paymentId);
        if (!alive) return;
        if (result.state === 'ready') {
          const scoped = (result.tickets ?? [])
            .filter((w) => !eventId || w.event.id === eventId)
            .map(mapWalletTicket);
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
      } catch { /* refresh is best-effort — wallet poll still resolves */ }
    };
    void reconcile();
    const id = window.setInterval(() => { void reconcile(); }, pollMs);
    return () => { alive = false; window.clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind, paymentId, eventId, isAuthenticated, queryClient, pollMs]);

  useEffect(() => {
    if (state.kind !== 'confirming') return;
    const data = wallet.data;
    if (!data) return;
    // When event-scoped, ignore tickets for other events entirely — and if
    // the baseline is empty (wallet hadn't loaded before start()), don't
    // treat the whole wallet as fresh: wait for a ticket newer than the
    // return began. Otherwise the first poll confirms on a pre-existing
    // ticket and "View My Ticket" opens the wrong one.
    if (eventId && seen.current.size === 0) {
      const scoped = data.filter((t) => t.eventId === eventId);
      if (scoped.length === 0) return;
      // Can't distinguish fresh from pre-existing without a baseline — keep
      // polling until a subsequent poll grows the set.
      seen.current = new Set(scoped.map((t) => t.id).slice(0, Math.max(0, scoped.length - 1)));
      const freshEmpty = scoped.filter((t) => !seen.current.has(t.id));
      if (freshEmpty.length !== 1) return;
      queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets });
      clearCheckoutResumeKeys();
      setState({ kind: 'confirmed', ticket: freshEmpty[0] });
      return;
    }
    const candidates = (eventId
      ? data.filter((t) => t.eventId === eventId && !seen.current.has(t.id))
      : data.filter((t) => !seen.current.has(t.id))
    ).sort((a, b) => Date.parse(b.purchased || '') - Date.parse(a.purchased || ''));
    const fresh = candidates[0];
    if (fresh) {
      queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets });
      clearCheckoutResumeKeys();
      setState({ kind: 'confirmed', ticket: fresh });
    }
  }, [state.kind, eventId, wallet.data, queryClient]);

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
