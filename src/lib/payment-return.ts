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
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsService, ticketKeys } from '@/lib/tickets';
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
    const prefixes = ['digis:checkout-key:', 'digis:stuck-order:', 'digis:payment-url:', 'digis:payment-key:', 'digis:payment-event:'];
    const doomed: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && prefixes.some((p) => k.startsWith(p))) doomed.push(k);
    }
    doomed.forEach((k) => sessionStorage.removeItem(k));
  } catch { /* storage unavailable — nothing to clear */ }
}

/** Status of the post-redirect confirmation poll. */
export type PaymentReturnState =
  | { kind: 'idle' }
  | { kind: 'confirming' }
  | { kind: 'confirmed'; ticket: UserTicket }
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

/** A new (not-yet-known) wallet ticket is the success signal. `seen` lets
 *  callers pass the ticket set they already have on screen, so the very first
 *  poll that includes a new ticket resolves the confirmation. */
export function usePaymentReturnConfirmation(
  eventId: string | undefined,
  knownTicketIds: ReadonlySet<string> | UserTicket[],
  isAuthenticated: boolean,
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
