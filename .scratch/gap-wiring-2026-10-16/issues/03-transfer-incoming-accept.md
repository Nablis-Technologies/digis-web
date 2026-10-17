# Accept an incoming transfer from the in-app notification

- **Status:** **DONE 2026-10-17** — the `transfer_incoming` card now offers an
  **Accept** action that calls the tokenless `POST /ticket_transfers/:id/accept`
  with the notification's `data.transfer_id` and refreshes the wallet on success.
  A route-mocked e2e (`e2e/transfer-accept.spec.ts`) asserts the empty body, the
  `Idempotency-Key` header, the post-confirm "Accepted" state, and the wallet
  refetch.
- **Related:** `docs/BACKEND_GAPS.md` **#61** (resolved 2026-10-16),
  `src/lib/notifications.ts`, `src/lib/transfer.ts`,
  `app/services/messaging/notification_types.rb` (`transfer_incoming`).

## Resolution (2026-10-17)

| Piece | Where |
|---|---|
| Wire → domain | `mapNotification` sets `AppNotification.acceptTransferId` **only** for `transfer_incoming` with a string `data.transfer_id` (never invented, ADR-0002) |
| No-action fallback | the same card deep-links to `/tickets` (`link`) **only** when no action is offered — the spec's "keep the deep-link as the fallback" |
| Action UI | `TopBar`'s notification card renders an accent `AppButton` ("Accept" → spinner → "Accepted") as a sibling of the row button (no nested `<button>`) |
| Command | `transferService.acceptAuthenticated(transferId)` — empty body, bearer proves identity, `Idempotency-Key` injected by `apiFetch`; on success: mark read, confirm in place, toast, `invalidateQueries(ticketKeys.userTickets)` |
| Failure | `toastError` only — the card is **not** marked read, and no success state is shown. New `CODE_MESSAGES` for `transfer_expired` / `transfer_not_pending` / `transfer_recipient_unverified` |

**Deliberate choices (reviewed 2026-10-17):**
- The card body keeps the backend's copy ("Accept it to add it to your wallet.")
  even after the accept — the notification text is the backend's; only the action
  state is ours. The accepted state is component-local (`TopBar`), so it resets on
  reload; a second accept is a server-side no-op (`Ticketing::Transfers::Accept#replay`).
- The no-action fallback is effectively unreachable (the backend always projects
  `transfer_id`) and the wallet has no accept UI — so the fallback link is a
  graceful dead-end, not an alternative accept path. There is still no
  incoming-transfers list endpoint.

## Context

`ticketing.ticket_transfer.initiated` now produces a **`transfer_incoming`**
notification (`channels: %w[in_app]`, recipient `to_user`) whose `data` carries
`transfer_id, ticket_id, event_id, event_title, ticket_label, expires_at`. The
frontend already labels it (`src/lib/notifications.ts`: type → `transfer`, title
"You received a ticket", body "Accept it in Tickets."), but there is **no action**
and no incoming-transfers list endpoint — so "accept it in Tickets" leads nowhere.

## Change

- Give the `transfer_incoming` notification an **Accept** action that calls the
  authenticated `POST /ticket_transfers/:id/accept` with the notification's
  `data.transfer_id` (the recipient is `to_user`, so no token is needed).
- Refresh the wallet on success; keep the existing deep-link as the fallback when
  the action is not offered.

## Definition of done

- A signed-in recipient can accept a pending transfer straight from the
  notification; the ticket appears in the wallet afterward.
- `npx tsc --noEmit` clean · `npx vitest run` green · `pnpm build` OK.

## Tests

- Unit: the notification view-model exposes the accept action (and its
  `transfer_id`) only for `transfer_incoming`.
- E2E (if cheap): a route-mocked `transfer_incoming` notification accepts and
  refreshes.
