# 08 — Live verification drill + tracker updates

Status: implemented — drill executed 2026-09-06; wallet proof closed 2026-09-07
(paid ticket exists — see wallet-proof comments); resale list→cancel drill remaining

Blocked by: 01, 02, 03, 04, 05, 06, 07

## Scope

Prove the whole surface against the local backend: unit suite green with
all resale tests on mocked HTTP (old mock-store tests rewritten, none left
asserting the in-memory store), production build and typecheck clean, then
the manual runtime drill — buy ticket → list → browse → purchase → pay →
wallet shows ticket → cancel path — with results recorded in the living
integration-status tracker. Flag anything needing a backend change to the
backend dev instead of working around it.

## Acceptance

- Unit suite, build, and typecheck all green.
- Drill completed end-to-end on live API; evidence noted in the tracker.
- Zero backend-code changes; seed edit limited to ticket 01's scope.

## Comments (drill 2026-09-06, backend + frontend both running locally)

- Reseed clean: 54 public events; `promo LAUNCH10` on `on-on`;
  `resale enabled on on-on / Early Bird` (ticket 01 fixture live — first
  ticket product of the checkout e2e event, percentage cap, max 1).
- Reads proven live as the seeded buyer (+251900123456): login 200,
  `GET /resale_listings` 200 `[]`, `GET /tickets` 200 `[]`,
  `GET /marketplace/seller/payout_accounts` 200 `[]`.
- #26 proven empirically: valid payout create → 422 with code
  `payout_account_provider_unavailable` exactly as diagnosed (empty
  marketplace registry — static + live evidence agree).
- Write-route wiring proven: create on bogus ticket id → ticket-not-found;
  purchase on bogus listing id → listing-not-found (route + JWT auth +
  Idempotency-Key all reach the domain layer).
- Chain limit (honest): no paid ticket exists post-reseed (wallet empty),
  and acquiring one requires completing a Chapa hosted payment by hand —
  the same standing item as the wallet-proof in the integration tracker.
  Everything short of that is covered: checkout-to-payment by the existing
  checkout e2e, resale create/purchase/cancel + copy by unit tests on
  backend-shaped payloads, and every endpoint's live envelope above.
- Full buy→list→purchase→pay→wallet→cancel on live data remains for a
  session with a paid ticket (manual Chapa step first).
- Verified: full vitest 35/35, `tsc` clean, `vite build` ok.

## Comments (e2e follow-up 2026-09-06)

- Headed full suite initially went 12 passed / 1 failed / 1 skipped: the
  checkout chain found no consent box. Root cause was the drill's own
  reseed — `seeds_events.rb` deliberately purges consent docs for its
  events ("optional", line 430) and never recreates them, so `on-on` lost
  the Event Terms doc the checkout e2e depends on. Not a frontend
  regression (no consent code was touched).
- Fixed via the organizer API (no seed change): created + published one
  "Event Terms" doc on `on-on` as admin; requirements endpoint returns 1
  doc again. Re-ran: checkout spec 2/2, then full headed suite 14/14.
- Standing seed gap for the backend dev: any reseed breaks the checkout
  e2e until an Event Terms doc is re-created on the e2e event (same class
  of fixture as the LAUNCH10 promo — candidate for the frontend-owned
  seed, not done here to keep 01 minimal).

## Comments (wallet proof 2026-09-07 — chain limit lifted)

- `e2e/zz-live-payment.spec.ts` ran the full REAL chain green (2.6 min): seeded
  buyer `+251900123456` bought Final Wave on `avenida-desperados-pregame-edition`,
  paid via Chapa test mode (`#test-number` + "Pay using Test Mode"), returned to
  `?status=return`, wallet-polled to "You're going!", QR visible on /tickets.
  The wallet is no longer empty — a paid ticket exists for the resale drill.
- Spec maintenance: slug/tier constants updated for current seed (single avenida
  event, Final Wave tier); `playwright.config.ts` gained a `RUN_ZZ=1` escape hatch
  so the gated zz-* proofs can actually run explicitly (`testIgnore` previously
  blocked even the documented explicit invocation).
- Remaining for this ticket: the resale drill itself (list the paid ticket →
  browse → purchase → pay → wallet → cancel) — now unblocked.

## Comments (code-review 2026-09-07 + smell fixes)

Two-axis review (Standards + Spec sub-agents) ran against HEAD with the
spec + tickets 01–08 as reference. Standards: slice conforms broadly (mock
deleted, deep modules own HTTP, gaps #24/#25/#26 filed, money in minor
units); deviations: spec file lives at `docs/` not `.scratch/…/spec.md`,
purchase failure surfaces as inline text (ADR-0005 toast preference),
buyer total computed from `fee_terms.rate_bps` (AGENTS fee-engine tension).
Spec: 05 and 06 marked done but miss their own acceptance criteria; 01 and
08 remain open; scope-creep items (buyer surcharge, payout gating,
fabricated Event wrapper, dead `fetchListingDetail`) noted.

Smells fixed same session (all in `src/lib/resale.ts` / `src/lib/payout.ts`,
unit-tested, tsc + build green):
- Duplicated Code: extracted `sellerWireToListing` shared by create/cancel.
- Mysterious Name: `resetToSeed()` → `clearTrackedOwnListings()`.
- Feature Envy / fat interface: `cancelListing` no longer fabricates 21 blank
  display fields — it returns the narrow seller-wire economics shape.
- Fabricated default / Primitive Obsession: `mapPayoutAccount` no longer
  invents `pending_verification`; unknown statuses are dropped (status now
  optional), pinned by tests.
- Repeated Switches: `displayNameFor`/`statusLabel` → lookup maps exported
  from `payout.ts`; component's local cascade deleted.
- Duplicated persistence: `readOwnIds`/`trackOwnListing` dual-write logic
  consolidated into `syncFromStorage`/`persistToStorage`.

Spec-axis findings intentionally NOT changed (product/behavior decisions,
flagged for the human): premature "Purchased" edge, own-listing buy-hide
(#24), frontend fee surcharge, payout gating, fabricated Event wrapper,
dead `fetchListingDetail`.

## Comments (spec findings fixed 2026-09-07)

User approved fixing the Spec-axis findings that are frontend-fixable. All
done, verified (vitest 44/44, tsc clean, build ok, e2e 14/14):
- **Own-listing buy-hide (05)**: new `resaleModule.isOwnListing(id)`
  (session-scoped to tracked creation ids, unit-tested). `ListingDetailSheet`
  renders "Your listing" instead of Buy for own rows.
- **Premature "Purchased" (US4)**: the no-redirect edge no longer claims
  "Ticket Purchased!" — it shows "Confirming your payment…" + a View My
  Tickets escape (the router's wallet-poll proves fulfillment).
- **Buyer surcharge / frontend fee math (spec 86-88)**: removed the
  "Service fee" and `asking + rate_bps` Total computed in the sheet — the
  buyer sees the asking price only; currency comes from `listing.currency`,
  never a hardcoded "ETB".
- **Payout gating (spec 102)**: sell no longer blocks on having a payout
  destination; the confirm button always lists, payout is managed separately.
- **Fabricated Event wrapper (spec 118)**: deleted — `ResaleEventCard` now
  takes a narrow `ResaleGroupCardData` (real group fields only) and renders
  its own card instead of fabricating an `Event` with fake category/currency/
  ticketsLeft.
- **Dead `fetchListingDetail` + spec decision 3**: `createListing` now
  enriches display via the detail endpoint (flat create response never
  assumed to carry nested fields); the method is no longer test-only.

Still blocked by backend: pre-enforcement of cap/cutoff/resale-enabled
(#25), owner filter on browse (#24), payout create (#26), the "already
accepted" wallet-poll verification sharing (#18).

## Comments (test hardening 2026-09-06)

- The checkout e2e assumed a consent box unconditionally; with the doc
  gone it failed at the assertion, not the flow. Fixed with
  `acceptConsentIfPresent` (5s wait, skip when the event has no terms) in
  both checkout tests. Proven both ways: doc deactivated → 2/2 pass;
  doc reactivated → full headed suite 14/14.
