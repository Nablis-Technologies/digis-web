# 04 — Cancel listing on live API

Status: implemented — verified unit/typecheck/build (live drill in 08)

Blocked by: 02

## Scope

Wire cancellation to `POST /resale_listings/:id/cancel` with reason, offered
only on open own listings. Invalidate the listings queries so the cancelled
row disappears from browse and my-listings without a reload.

## Acceptance

- Cancelling an open own listing returns it to `cancelled` and both lists
  update.
- Cancel is not offered on non-open or others' listings.

## Comments

- `cancelListing` is live: `POST resale_listings/:id/cancel`
  (`{resale_listing: {reason}}`, default `seller_requested`) → seller wire.
  The return is confirmation only (flat wire, blank display) — callers
  re-read the lists via invalidation, which the page already does.
- No UI changes needed: entry gating (own open listings) and
  invalidation were already correct.
- Verified: resale suite 15/15, full vitest 27/27, `tsc` clean, `vite
  build` ok.
