# 01 — Seed one resale-enabled dev ticket type

Status: implemented — pending live reseed (docker daemon down at implementation time; verify in 08)

Blocked by: (none — do first)

## Scope

In the frontend-owned backend seed file, enable resale on exactly one
general-admission-pattern dev ticket type (no streaming access on it):
resale-enabled flag on, percentage price cap, max completed resales of 1.
Confirm its product has a real price and inventory capacity. Seed nothing
else — no listings, sales, ledger rows, or payout accounts.

## Acceptance

- Reseed cleanly; the ticket type reads back resale-enabled with cap fields.
- The ticket type is purchasable through the normal quote→order→payment path.
- No other seed data changed; backend code untouched.

## Comments

- Implemented as a post-seed fixture block in `db/seeds_events.rb` (after the
  promo block): finds the `on-on` checkout e2e event's first active ticket
  product and updates its ticket type to resale-enabled + percentage cap
  10000bps + max 1 resale. Idempotent; warns and skips if the event or
  product is absent. Satisfies the `ticketing_ticket_types_resale_cap_check`
  constraint and the model's `resale_cap_consistency` validation.
- Not live-verified: no Ruby runtime on this host and the Docker daemon was
  down, so no reseed, no RuboCop. Reseed + row check belong to the 08 drill.
