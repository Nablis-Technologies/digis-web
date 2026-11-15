# 06 — Payout destinations (thin UI) + gap-log correction

Status: implemented — verified unit/typecheck/build (live drill in 08)

Blocked by: (none — parallel with 01, 02)

## Scope

Wire payout methods to the seller payout-accounts endpoints (list + create).
List rows show provider, destination type, and verification status only.
Create collects holder name (required), type, provider, and account details
with client-side required-field validation. Remove payout deletion, default
selection, and any display of account identifiers. Correct the stale gap-log
entry claiming these endpoints are organizer/admin-only (backend policy
permits owners managing their own accounts — verified against the policy).

## Acceptance

- A user registers a destination and sees it listed with status.
- No UI implies removal, defaults, or visible account numbers.
- Gap log corrected with the policy evidence cited.

## Comments

- List + create are live against the seller endpoints. Rows show provider
  display name + verification status only (identifiers never serialize).
  Removal/default UI deleted with the mock store. Input kinds map to
  backend type/provider on submit (telebirr→mobile_money/telebirr;
  CBE/BoA→bank rail with the bank inside encrypted details).
- Major finding while wiring: NOTHING registers into
  `Marketplace::PayoutProviders::Registry` in production (only the
  Payments and Finance registries have initializers), so every create —
  any provider — 422s `payout_account_provider_unavailable` today. Reads
  are unaffected. Filed as gap #26 (blocking, backend-side one-liner);
  the UI posts correctly and works unchanged once registered. Friendly
  copy added for the 422 + input_invalid (rest of payout copy in 07).
- BACKEND_GAPS #7 corrected: the surface is owner-scoped, not
  organizer/admin-only (verified against `SellerPayoutAccountPolicy`).
- Verified: payout suite 5/5, full vitest 32/32, `tsc` clean, `vite
  build` ok.
