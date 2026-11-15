# Spec: Resale frontend↔backend integration

Status: `ready-for-agent` (spec only — no implementation yet)

## Problem Statement

The resale feature area (browse marketplace, sell a ticket, buy a resale listing,
manage payout destinations) is fully built as UI running on an in-memory mock
store. The Rails backend already ships the complete controlled-resale surface
(listings, purchase, cancel, resale policy, seller payout accounts) with a
buyer-facing serializer, and the wallet endpoint the sell flow depends on is
live. Users cannot actually list, buy, or get paid for resale through the app.

## Solution

Replace the mock bodies in the resale deep module with real authenticated calls
to the existing backend endpoints, adapting the UI to the backend's contract.
The UI pre-enforces every rule it can know client-side (caps, cutoffs,
ownership, sell eligibility) and reuses the checkout module's payment and
return-confirmation flow for purchases. Anything the backend does not serve
(seller identity, ratings, listing images, payout removal/defaults, alert
persistence, own sold/cancelled history) is removed from the UI, not faked.

## User Stories

1. As a buyer, I want to browse active resale listings with event, date, venue,
   ticket type, and asking price, so that I can find tickets to sold-out events.
2. As a buyer, I want to open a listing and see the full detail (event dates,
   venue, admissions, fee terms), so that I know exactly what I am buying.
3. As a buyer, I want to buy a listing and pay through the standard checkout
   payment flow, so that paying for resale feels identical to paying for a new
   ticket.
4. As a buyer, I want to see a pending/processing state after paying until my
   ticket appears in the wallet, so that I am never told I own something I do
   not own yet.
5. As a buyer, I want a clear, friendly message when a listing sells out under
   me, the cutoff passes, or terms change mid-purchase, so that I understand
   what happened and what to do next.
6. As a ticket owner, I want to list an eligible wallet ticket for resale at an
   asking price I choose, so that I can sell a ticket I cannot use.
7. As a seller, I want the app to stop me from listing an ineligible ticket
   (wrong status, resale disabled, past cutoff, over the price cap) before
   anything is submitted, so that I never fill a form that is doomed to fail.
8. As a seller, I want to see the fee terms that will apply to my listing, so
   that I know what I will keep.
9. As a seller, I want to see my active listings and cancel an open one, so
   that I stay in control of what I am selling.
10. As a seller, I want to register a payout destination (mobile money or bank)
    and see my registered destinations, so that my proceeds have somewhere to go.
11. As a seller, I want to be told what payout details are required before I
    submit, so that verification failures are rare.
12. As a developer, I want every resale test to run against mocked HTTP at the
    module boundary (never the in-memory store), so that the suite proves the
    integration, not the mock.
13. As a developer, I want one dev ticket type with resale enabled plus a live
    end-to-end drill, so that every wired path is proven against the real API.

## Implementation Decisions

- **Seam (one): the resale deep module owns HTTP and mapping.** All reads and
  writes go through the resale module's methods via the central API client;
  components keep calling the module and React Query keys unchanged. No new
  service layer, no second HTTP path. (Matches the repo's deep-module
  architecture and the deleted-shim ADR.)
- **Read mapping is honest.** Browse/detail responses nest event, product,
  ticket type, and event dates with venue; the module maps them to the card's
  display fields (name from event title, date/time from the first event date,
  venue from its nested venue). Images come from the existing event-cover fetch
  with a placeholder fallback. Seller name, seller rating, and verified badges
  have no backend source and are removed. Buyer cards never show the seller's
  original acquisition price (it exists only in the seller-scoped view).
- **Seller responses are enriched, not assumed.** Create/cancel return the
  flat seller-scoped shape (foreign keys, no display nesting); the module
  enriches own-listing display via the detail endpoint rather than assuming
  nested fields are present.
- **My listings means active own listings only.** The backend index serves
  active listings; own reserved/sold/cancelled/expired rows are not listable,
  so history views are removed until a backend endpoint exists.
- **Sell eligibility is pre-enforced in the UI.** The sell entry point is
  offered only for wallet tickets that are active, owned, group-credentialed,
  and whose ticket type has resale enabled; the asking-price input is validated
  against the cap and cutoff client-side before submit. Backend rejections
  remain possible (state can change between render and submit) and fall
  through to friendly error copy.
- **Fee display uses backend fee terms.** The hardcoded fee constant is
  deleted; estimates render from the listing's fee terms, which are the
  seller-side platform fee resolved by the backend's commercial engine — never
  a buyer surcharge, never frontend math on floats.
- **Purchase returns an order, not a ticket.** The purchase call yields a
  pending-payment order with a short expiry; the module hands it directly to
  the checkout module's existing payment starter and the existing
  return-confirmation path (redirect, return verification, wallet polling).
  The UI shows processing until the wallet proves fulfillment — it never
  claims ownership on payment submission.
- **Money discipline.** All amounts stay integer minor units inside domain
  types via the Money value object; major-unit conversion happens only at the
  user-input boundary and formatting only at render. No float math in
  components.
- **Payout UI is thin.** The list shows provider, destination type, and
  verification status (the only fields the backend returns — identifiers are
  encrypted server-side and never serialized). The create form collects holder
  name (required), type, provider, and account details. Removal, defaults, and
  alert preferences have no backend endpoint and are removed from the UI.
- **Policy correction (verified against the backend policy file).** The gap
  log claims seller payout accounts are organizer/admin-only; the backend
  policy permits any authenticated user to manage their own accounts. The gap
  entry is corrected as part of this work — the consumer payout path is not
  blocked.
- **Seed enablement (frontend-owned seed file).** Exactly one dev ticket type
  (general-admission pattern, no streaming access) gains resale-enabled status
  with a percentage cap and a resale limit. No listings, sales, ledger rows,
  or payout accounts are seeded — financial rows are created at runtime
  through the real endpoints during verification, so fixtures never fake
  provenance.
- **Cuts (no backend endpoint, removed not faked).** Payout removal/default,
  resale-alert persistence, verified/type filters that need seller metadata,
  own sold/cancelled history, pre-create fee quotes, fabricated event wrapper
  objects.

## Testing Decisions

- **What makes a good test here:** real HTTP shapes in, real behavior out.
  Tests mock at the API-client boundary with backend-shaped payloads (nested
  public serializer for browse, flat seller shape for create/cancel, order
  shape for purchase) and assert module outputs, mapped display fields, query
  invalidations, and error mapping. Nothing asserts against the old in-memory
  store, which is deleted.
- **Prior art:** the checkout module's tests (quote/order/payment flows
  against mocked client responses), the wallet mapping tests, and the
  checkout e2e spec that proves the live chain (login → registration → quote
  → order → payment redirect or typed error).
- **Unit scope:** browse mapping incl. date/venue/image fallback, active-only
  scoping, create body shape and cents handling, cancel transition, purchase
  handoff to the checkout module, payout list/create shapes, friendly copy for
  the buyer-facing race/time codes, pre-enforcement guards.
- **Live proof:** a runtime drill against the local backend (enabled ticket
  type → buy → list → browse → purchase → pay → wallet shows ticket →
  cancel path) plus the standard build and typecheck gates. Results are
  recorded in the living integration-status tracker.

## Out of Scope

- Any backend code, schema, serializer, or policy change (the seed-file edit
  above is the only backend-repo touch, and that file is frontend-owned).
- Date-scoped resale-chain cancellation (documented backend follow-up needing
  an orders/refund-schema design change — untouched).
- Resale policy admin surfaces (organizer-only price-cap configuration).
- Transfers, credential claims, per-slot registration answers, promo
  validation, notifications — separate tracks.
- E2E automation for resale (the drill is manual this pass; automation is a
  follow-up once the live path is stable).

## Further Notes

- The integration plan's resale section predates the backend's buyer-facing
  serializer; its "backend lacks display fields" gap note is obsolete and
  should be read as resolved.
- If the live drill surfaces contract mismatches (field renames, new required
  params, changed error codes), the frontend adapts within this spec's scope
  as long as no backend change is needed; anything requiring a backend change
  is flagged to the backend dev instead of worked around.
