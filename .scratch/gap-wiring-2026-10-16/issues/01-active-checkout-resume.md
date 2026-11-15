**STATUS: DONE 2026-10-16e** � wired (see spec.md).

# Offer resume / restart from the `active_checkout_exists` conflict

- **Status:** `ready-for-agent` — frontend-only; the backend signal already exists.
- **Related:** `docs/BACKEND_GAPS.md` **#58** (resolved 2026-10-16),
  `src/features/checkout/components/ConflictSheet.tsx`,
  `app/services/orders/active_checkout_recovery.rb`.

## Context

`Orders::CreateCheckout#active_checkout_conflict!` now returns a **409**
`active_checkout_exists` whose body carries
`meta.active_checkout = { order_id, expires_at, payment?, order_access_token? }`
(`Orders::ActiveCheckoutRecovery`; the token only for a verified guest context).
`ConflictSheet` still renders only "View Tickets" — its comment still claims the
409 carries no order id (stale).

## Change

- Surface the 409 `meta.active_checkout` from the checkout flow to `ConflictSheet`
  (`useCheckoutFlow` already handles the error — thread the `ApiError.meta`
  through).
- Render **Continue checkout** (re-open the hosted page / resume the order) and
  **Restart** (existing discard path) when the recovery payload is present, with
  the `expires_at` hold shown honestly.
- When the payload is absent (older backend / unauthorized context), keep today's
  "View Tickets"-only copy.

## Definition of done

- The conflict sheet offers resume/restart with the real `order_id` + `expires_at`
  when the backend provides them; unchanged when it does not.
- `npx tsc --noEmit` clean · `npx vitest run` green · `pnpm build` OK.

## Tests

- Unit: mapping `active_checkout_exists` + `meta.active_checkout` → the sheet's
  resume/restart model.
- E2E (if cheap): a route-mocked 409 with the meta shows both actions.
