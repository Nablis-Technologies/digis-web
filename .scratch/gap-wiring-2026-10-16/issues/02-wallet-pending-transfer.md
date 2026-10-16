**STATUS: DONE 2026-10-16e** � wired (see spec.md).

# Render a "Transfer pending" state on the sender's wallet ticket

- **Status:** `ready-for-agent` — frontend-only; the backend field already exists.
- **Related:** `docs/BACKEND_GAPS.md` **#62** (resolved 2026-10-16),
  `src/lib/tickets.ts`, `app/serializers/ticketing/ticket_wallet_serializer.rb`.

## Context

`Ticketing::TicketWalletSerializer` now projects
`pending_transfer { id, status, expires_at }` (or `null`) from
`ticket.pending_ticket_transfer`. While a transfer is pending the ticket stays
`active` and owned by the sender, so the wallet must distinguish it: resale is
already refused server-side with `pending_transfer`, but the UI gives no hint.

## Change

- Map `pending_transfer` in `src/lib/tickets.ts` (`mapWalletTicket`) onto the
  `UserTicket` view-model.
- Render a **Transfer pending** badge on the ticket card / detail, with the
  `expires_at` hold, and gate the transfer / resale / QR affordances for that
  ticket (mirror the server rule rather than re-deriving it).
- Leave `null` rendering exactly as today.

## Definition of done

- A ticket with a pending outgoing transfer reads as "Transfer pending" and does
  not present transfer/resale/QR as available; normal tickets are unchanged.
- `npx tsc --noEmit` clean · `npx vitest run` green · `pnpm build` OK.

## Tests

- Unit: adapter maps present/absent `pending_transfer`; the card's affordance
  gate flips only when pending.
