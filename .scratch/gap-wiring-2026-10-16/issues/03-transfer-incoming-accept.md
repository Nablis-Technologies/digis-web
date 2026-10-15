# Accept an incoming transfer from the in-app notification

- **Status:** `ready-for-agent` — frontend-only; the backend signal already exists.
- **Related:** `docs/BACKEND_GAPS.md` **#61** (resolved 2026-10-16),
  `src/lib/notifications.ts`, `src/lib/transfer.ts`,
  `app/services/messaging/notification_types.rb` (`transfer_incoming`).

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
