# 07 — Friendly copy for race/time resale errors

Status: implemented — verified unit/typecheck/build (live drill in 08)

Blocked by: 03, 05

## Scope

Add buyer-facing messages for the error codes that survive client-side
pre-enforcement because they are inherently server-side: listing reserved
under the buyer, cutoff passed mid-flow, terms re-resolved at purchase,
competing active checkout, payment-accepted-too-late on cancel. Everything
else keeps the generic fallback. No copy for states the UI makes
unreachable (e.g. self-purchase).

## Acceptance

- Each listed code shows a message telling the user what happened and the
  next step (pick another listing, wait for expiry, check wallet).
- Unmapped codes still fall back gracefully, never raw.

## Comments

- 29 codes mapped (24 resale + 7 payout, 2 shared), each verified against
  the backend locale with a next step. Fulfillment internals (`sale_*`,
  ledger, chargeback) intentionally left on the generic fallback — they
  never surface in these UI flows.
- Two codes collide across flows (`commercial_terms_unavailable`,
  `idempotency_conflict` — backend reuses them for checkout and resale):
  merged into flow-neutral copy instead of duplicating keys (duplicates
  are a compile error). The old checkout-only wording is superseded.
- New `errors.test.ts` pins every mapped code (no code text leaks into
  copy), the fallback, and flat-code extraction.
- Verified: errors suite 3/3, full vitest 35/35, `tsc` clean, `vite
  build` ok.
