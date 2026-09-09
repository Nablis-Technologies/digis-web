# 03 — Create listing (sell flow) on live API

Status: implemented — verified unit/typecheck/build (live drill in 08)

Blocked by: 02

## Scope

Wire listing creation to `POST /tickets/:ticket_id/resale` with the wallet
ticket's id and an integer-minor asking price (major→minor conversion at the
input boundary only). Offer the sell entry point only for eligible wallet
tickets (active, owned, resale-enabled type); validate asking price against
the cap and cutoff client-side before submit. Render fee estimates from the
returned fee terms. Enrich the flat seller-scoped create response for
my-listings display via the detail endpoint.

## Acceptance

- An eligible wallet ticket lists end-to-end; my-listings shows it.
- Ineligible tickets never offer the sell action; over-cap/past-cutoff input
  is rejected before any request.
- No float money math anywhere in the flow.

## Comments

- `createListing` is live: `POST tickets/:id/resale`
  (`{resale_listing: {asking_amount_minor}}`) → 201 seller wire mapped with
  display from the wallet ticket + economics (fee terms, acquisition value)
  from the backend. Id is tracked for my-listings. `UserTicket.id` is the
  backend ticket UUID (verified in the wallet mapper).
- Honesty correction on pre-enforcement: the buyer-visible wallet carries no
  resale policy (no enabled flag, cap, or cutoff), so the client enforces
  only active-ticket + positive-integer-amount. Cap/cutoff/disabled-type
  rejections surface as typed backend errors (friendly copy in 07). The
  spec's stronger pre-enforcement claim is not realizable without a backend
  change — recorded here, not silently dropped.
- Sell entries gated to active tickets in both places (resale list-a-ticket
  rows via new `UserTicket.status` from the wallet wire; ticket-detail
  resell via optional `onResell`). Legacy mock tickets without status are
  correctly unlistable.
- Fee estimate removed from the sell sheet (rate unknowable pre-create);
  sheet states the fee is applied at listing time. `RESALE_FEE_BPS` deleted.
- `createTicketListingReference` resolves the live wallet first (dynamic
  import, mirroring the events-module precedent for the tickets↔resale
  cycle), then delegates.
- Verified: resale suite 15/15, full vitest 27/27, `tsc` clean, `vite
  build` ok.
