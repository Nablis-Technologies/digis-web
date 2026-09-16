# Confirmed Backend Gaps (digis_backend)

> Every confirmed gap between what the frontend needs and what the backend provides,
> **verified against the actual backend code** (serializers, policies, controllers,
> routes). The frontend does NOT work around these (ADR-0002) — it disables/hides
> until the backend resolves them.
>
> **Seed data is NOT a backend gap.** The dev seeds (`db/seeds_events.rb`,
> `db/seeds/preview.rb`) mirror the frontend mocks so the UI has data — a seed
> omission is fixed in the seed, never tracked here. Past seed-side issues (#30
> parking accesses, #35 purchase limit) were fixed in the seed and are recorded in
> the Resolved archive.
>
> Re-verified 2026-09-10 against `feat/launch-hardening-telemetry` at `78e4a6f`
> (fast-forward `d67e132` + merged 11 commits: RSVP public endpoints, registration
> repeat, guest ticket view material) by code read + live HTTP. Sweep result:
> **#31, #30, #23, #27, #1, #29, #32 resolved and frontend-wired.** Still open:
> #17, #26, #8, #9, #33, #34. Informational: #11, #16, #36, #37.
>
> **Re-verified 2026-09-15 against `feat/launch-hardening-telemetry` at `a470c76`**
> (merged 46 commits: **Chapa API V2 migration** — `api.chapa.global`, `CHAPA_TEST_`/
> `CHAPA_LIVE_` keys, hosted + direct charge, refunds, webhooks; **marketplace
> seller payout direct transfer**; resale purchase replay/idempotency). Sweep
> result: **#26 and #16 resolved and frontend-wired** (payout create now succeeds
> with the new flat Chapa V2 payload; see #39 for the remaining bank-list
> limitation). **#38 upgraded to a real backend surface** (`requires_ticket` is
> exposed — G-07 — but still not enforced). Still open: #17, #8, #9, #33, #34,
> #39. Informational: #11, #36, #37, #38. The dev `.env.chapa` had to migrate from
> a V1 `CHASECK_TEST-` key to a V2 `CHAPA_TEST_` key to boot at all.

## Status key

| Status | Meaning |
|---|---|
| **open — blocking** | frontend feature cannot ship until fixed |
| **open — degrading** | works but suboptimal; frontend has a mitigation |
| **informational** | note for backend correctness; no frontend impact |
| **deferred** | product decision, not a bug |
| **resolved** | fixed; detail in the Resolved archive |

## At a glance

| # | Status | Summary |
|---|---|---|
| 17 | open — blocking | `cbe` not a backend payment method (`PAYMENT_METHODS = %w[telebirr card bank]`) |
| 40 | resolved | `ExpireCheckout` no longer aborts the sweep on an elapsed-grace payment (2026-09-16) |
| 39 | open — degrading | no public endpoint listing payout `bank_slug`s; frontend hardcodes the 3 known slugs |
| 41 | open — degrading | a released order permanently burns its registration (`idx_one_order_item_per_registration` ignores order status) |
| 8 | open — degrading | no user `name` column / serializer field |
| 9 | open — degrading | no self-service `PATCH /auth/me` |
| 33 | open — degrading | guest payment-refresh re-validates the quote token on accepted payments |
| 34 | open — degrading | past events remain purchasable (no date/sales-window check) |
| 11 | informational | event-slug `slug_history` 301 table missing (slug safety partial) |
| 36 | informational | public payload lacks lineup/participants + venue media/coords |
| 37 | informational | no public waitlist-join / invite-request endpoint |
| 38 | informational | `requires_ticket` exposed but not enforced at quote/order time |
| 8-deferred | deferred | no Google / check-account / password-reset auth |
| 16 | resolved | Chapa API V2 (`CHAPA_TEST_`/`CHAPA_LIVE_` keys, `api.chapa.global`) |
| 26 | resolved | payout destination create works (Chapa V2 direct-transfer registration) |

---

## Open — blocking

These items block a frontend feature. Each entry: what's missing (file + fields),
why it matters, and a concrete fix.

### #17. `cbe` is not a valid backend payment method

Frontend `PaymentMethod = 'telebirr' | 'cbe' | 'card'`; backend
`Commercial::FeeComponent::PAYMENT_METHODS = %w[telebirr card bank]`
(`app/models/commercial/fee_component.rb:23`), and the Chapa payment adapter
capabilities list `payment_methods: %w[telebirr card bank]`
(`app/services/payments/providers/registration.rb`). Selecting CBE Birr →
`422 invalid_payment_method`.

**Fix:** add `"cbe"` to the model, the `chapa_adapter` capabilities, and any
organizer-facing `payment_method` enums. The frontend's CBE button is currently
disabled as a workaround.

**Status: open — verified 2026-09-09.**

### #40. Abandoned checkouts never expire → `active_checkout_exists` blocks all later checkouts (RESOLVED 2026-09-16)

**Fixed:** `ExpireCheckout#expire_order` now moves an order to settlement grace
only while the grace window is still open; with no live attempt, **or** an attempt
whose `settlement_grace_expires_at` has already elapsed, it releases the order
instead of raising. Verified live with `ExpireCheckout.call(now: 1.day.from_now)`
→ `success=true`, active checkouts released (previously `success=false`, 0
released). A late provider success is still handled by `AcceptPayment`'s
rejection/reversal path.

**Original finding (below, kept for context).**

`Orders::ExpireCheckout` is driven only by `Orders::EnterSettlementGraceJob`, and
development had **no `development:` section in `config/recurring.yml`**, so it
never ran: abandoned `pending_payment` orders piled up and every later checkout
for that buyer+event 409s `active_checkout_exists`.

Even once it runs, `ExpireCheckout#expire_order` **raises `ExpiryFailure` when a
`current` payment (`status in created/processing`) has an already-elapsed
`settlement_grace_expires_at`** (`app/services/orders/expire_checkout.rb:49-63`).
`ExpiryFailure` aborts the whole sweep (`call` rescues → failure), so one such
order leaves **every** stale checkout unexpired. Verified live 2026-09-15: 10
active checkouts, 2 with elapsed grace → `ExpireCheckout.call` `success=false`,
`remaining=10`, 0 released.

**Why it blocks the frontend:** the buyer can never start a new checkout for the
event; from a fresh session the conflict sheet cannot even offer a restart,
because the `active_checkout_exists` 409 carries no order id.

**Fix (backend):** release the order when a current payment's grace has elapsed
(or the payment is terminal) instead of raising; include the conflicting order id
in the 409 so the client can offer restart. **Dev mitigation added:** a minimal
`development:` block in `config/recurring.yml` (expiry + outbox) plus a one-off
`Orders::ReleaseCheckout` sweep to clear the backlog.

**Status: open — verified 2026-09-15 (dev DB + `expire_checkout.rb` + live `ExpireCheckout.call`).**

---

## Open — degrading

Work but suboptimal; the frontend mitigates. Fixing these improves correctness.

### #41. A released order permanently burns its registration

`idx_one_order_item_per_registration` is `UNIQUE (registration_id) WHERE
registration_id IS NOT NULL` (`db/structure.sql`) — it does **not** exclude
released/expired orders. Once a registration is attached to any order item it can
never be attached to another, so releasing an abandoned order leaves that
registration unusable for a retry: a new order with it 409s
`idempotency_conflict`.

**Why it degrades:** the buyer must start a brand-new registration to retry
(frontend "Discard & start fresh" → `registrationModule.release` + a fresh
submit). If a registration is meant to be one-checkout-only that's fine, but a
*released* order should not keep the slot burned.

**Status: open — verified 2026-09-15 (index definition + live 409).**

### #39. No public endpoint exposing payout `bank_slug`s

Chapa V2 payout-registration requires a top-level `bank_slug`
(`Marketplace::VerifyPayoutAccount` requires `bank_slug`, validates it against
the provider's ET bank list via `adapter.available_banks(country: "ET")`, and
persists the encrypted destination — `verify_payout_account.rb:28,88-93`). The
provider list is reachable server-side (`ChapaPayoutClient#available_banks` →
`GET /v2/payouts/banks`), but **no API route exposes it** (`config/routes.rb`
has no banks endpoint). The frontend therefore hardcodes the three known slugs
(`telebirr`, `cbe`, `boa` — `src/lib/payout.ts`).

**Why it degrades:** with a configured provider the user cannot be offered the
authoritative, complete bank list; an unknown slug 422s
`payout_account_bank_unsupported`. With an unconfigured/failing provider,
`available_banks` returns `nil` and validation is skipped (any slug passes).

**Fix:** expose `GET` available payout banks (slug + name + type) behind the
seller scope so the frontend can render real options.

**Status: open — verified 2026-09-15 (route grep + adapter code read).**

### #8. `UserAuthSerializer` lacks `name`; no `Core::User.name` column

`Core::UserAuthSerializer` returns `id, email, phone, verified_at, created_at,
updated_at, permissions` only (`app/serializers/core/user_auth_serializer.rb:3`)
— no `name`. Frontend derives display name from email local-part.

**Fix:** add a `name` column and serializer field if the product wants a real
display name.

**Status: open — verified 2026-09-09.**

### #9. No self-service `PATCH /auth/me` or `PATCH /users/me`

Routes expose only `GET auth/me` (`config/routes.rb:10`) — no update endpoint.
Settings profile-edit UI is display-only.

**Fix:** add an auth-bounded update endpoint guarded by `Core::Authorizable`;
needs the `name` column (#8) for the same payload.

**Status: open — verified 2026-09-09.**

### #33. Guest payment-refresh re-validates the quote token even for accepted payments

`Orders::GuestPaymentRefreshController#create` re-decodes `GuestQuoteToken`
(`guest_payment_refresh_controller.rb:19-21`) before reconciling. The token
binds `event_id` + a `phone_digest` (`guest_quote_token.rb:36,70-75`); any
failure — including pairing a payment with creds from a DIFFERENT order —
returns `422 invalid_guest_quote`. There is **no time check at decode**; the
10-minute quote hold is enforced only at create/restart/payment-attempt, not at
refresh. Separately, `Core::GuestRequestThrottling` counts every ≥400 response
(LIMIT=10/min per IP+phone), and the app's 3-second return poll tripped it
(`429 rate_limited`) by retrying the failing refresh.

**Why it degrades the frontend:** a guest whose checkout creds are stale or
crossed gets a refresh that 422s even though the payment was accepted and
tickets issued server-side. The return screen then says "payment failed", and
the retry loop locks the phone out of the guest endpoints for a minute.

**Frontend mitigation (live 2026-09-09):** guest creds are correlated to the
payment being reconciled (`findGuestReturnCreds(paymentId)` in `src/lib/order.ts`
resolves the order via `digis:payment-id:<orderId>`), the reconcile loop treats
`invalid_guest_quote`/not-owned/not-found as terminal (stops polling, honest
copy), and 429 backs off for the throttle window. Device wallet + SMS link
remain the recovery path.

**Fix (backend):** for an already-accepted payment, bind refresh by payment id
+ the order's buyer phone and skip the quote-token decode (the payment is the
durable proof); don't count `invalid_guest_quote` on accepted payments toward
the guest throttle.

**Status: open — verified 2026-09-09.**

### #34. Past events remain purchasable — no date / sales-window enforcement

The quote → order → payment path never checks the event date or the product
sales window. `Orders::BuildQuote#normalize_item_request`
(`app/services/orders/build_quote.rb:108-154`) only rejects an event when
`status == "cancelled"` and a product when `status != "active"`. It ignores:
- `Events::EventDate#starts_at` / `#ends_at` and `status`
  (`STATUSES = %w[scheduled postponed cancelled completed]`) — nothing marks
  dates `completed` when `ends_at` passes, nothing refuses a quote for a
  finished date.
- the product sales window `sales_start_at` / `sales_end_at`
  (`app/models/catalog/event_product.rb`). `Catalog::Public::ProductAvailability`
  respects it but is DISPLAY-only; `Catalog::Inventory::Reserve` (box-office)
  enforces it — the online guest/auth checkout path does not.
- `Events::Event.publicly_visible` is `status: "published" AND visibility:
  "public"` with no date filter, so past published events stay listed/quotable.

**Verified live 2026-09-09:** a published event whose only date has passed still
quotes, orders, and opens payment — end-to-end purchasable.

**Frontend mitigation (live 2026-09-09):** display-side "disable" per ADR-0002.
`eventEnded()` (`src/lib/eventDates.ts`) treats an event as ended when no date
remains with `status ∈ {scheduled, postponed}` and `ends_at` (fallback
`starts_at`) in the future. The event-detail page hides the ticket selector +
purchase bar and shows an "Event ended" state; the `choose_one` date step offers
only future dates; the discovery grid keeps the event visible with an "Ended"
badge.

**Fix (backend):** reject a quote when the event has no future purchasable date
(or the requested event_date has passed / is `completed`/`cancelled`), and
enforce the product `sales_end_at` window in `BuildQuote` (or
`StartPaymentAttempt` as the last gate). Optionally auto-mark dates `completed`
when `ends_at` passes and/or filter `publicly_visible` to events with a future
date.

**Status: open — verified 2026-09-09.**

---

## Informational

Notes for backend correctness; no frontend impact (or frontend already honest).

### #11. Slug namespace safety + redirects (PARTIALLY ADDRESSED)

A `RESERVED_SLUGS` denylist exists on the short-link model
(`app/models/links/short_link.rb:12`, validated at `short_link.rb:58`) guarding
the branded-link space. What remains: an event-slug `slug_history` 301 table so
renamed event slugs keep their old URLs. Frontend needs zero changes.

### #16. Chapa v1 vs v2 (RESOLVED — V2 migrated 2026-09-15)

Backend now implements **Chapa API V2 only** (`api.chapa.global`, `POST
/v2/payments/hosted` + `/v2/payments/direct`). V1 `CHASECK_*` validation is
removed; `ChapaClient`/`ChapaPayoutClient` require `CHAPA_TEST_`/`CHAPA_LIVE_`
key prefixes matching `CHAPA_MODE` (`chapa_client.rb:388-394`,
`chapa_payout_client.rb:174-175`). The `PaymentSerializer` shape is unchanged,
so no consumer wiring was needed beyond the dev `.env.chapa` key-format fix.
Direct charge and `cbebirr`/`mpesa`/`awashbirr` are adapter capabilities, but
the domain `PAYMENT_METHODS` enum is still `%w[telebirr card bank]` (see #17).

**Local-testing constraint (verified live 2026-09-15):** with a valid V2 test
key, `POST /v2/payments/hosted` returns `400 invalid_format — "Callback URL must
start with https:// and be a valid URL"` when `CHAPA_CALLBACK_URL`/`CHAPA_RETURN_URL`
are `http://localhost`. Both must be **https**.

**Resolved locally via HTTPS tunnels (2026-09-16):** backend + frontend are
exposed through cloudflared quick tunnels; `digis_backend/script/dev_tunnels.ps1`
restarts them, rewrites `.env.chapa`, reloads the backend, and prints the
webhook URL. Dev tunnel hosts are allowlisted in `config/environments/development.rb`
(`.trycloudflare.com`) and Vite `server.allowedHosts`/`host: true`.

**Verified end-to-end with a real Chapa test payment (2026-09-16):** Chapa
delivered a signed `POST /payments/chapa/webhook` **from its own IP** →
`payment.success` → `processed` → payment `succeeded` (`provider_reference` =
Chapa's reference) → order `fulfilled` → **ticket issued**. Our side was also
proven independently by re-sending a correctly HMAC-signed webhook.

**Two caveats:**
1. Quick-tunnel hostnames are **ephemeral**. When they expire (DNS stops
   resolving) no callback/webhook arrives — symptom: the payment succeeds on
   Chapa but nothing fulfills. Re-run `script/dev_tunnels.ps1` and update the
   dashboard webhook URL it prints.
2. Chapa V2 does **not** return the buyer to the app — the API `return_url` is
   ignored (verified: the browser stays on Chapa's receipt; there is no dashboard
   redirect setting either). **Handled in the frontend:** the hosted checkout now
   opens in a **new tab** (`window.open`), and the app tab stays open and confirms
   the payment (`POST /payments/:id/refresh` + wallet poll) — once the webhook
   fulfills, the app shows "You're going!", **closes the Chapa tab**
   (`src/lib/checkout-popup.ts`, so the buyer is returned to Digis) and routes to
   the ticket. Falls back to same-tab navigation if the popup is blocked.
   (`e2e/checkout.spec.ts` accepts either a popup or a redirect.)

### #36. Public event payload lacks lineup/participants + venue media/coords

`EventDetailSerializer` / `EventListSerializer` expose only categories,
event_dates, event_media, event_organizations, event_setting, organization —
**no event participants/artists**, and `venue_summary` is `{id,name,city}` only
(**no photos or lat/lng**). This is a backend SERIALIZER gap: the frontend
cannot source a lineup, venue photos, or a real map pin even with seed data
present, so it renders **absent** (Lineup section hides, venue photos dropped,
map falls back to a city-level default). **Seed side (frontend-owned):** the
dev seeds do not yet populate `events_event_participants` / venue media — that
is a seed task for when the backend exposes them, not a gap tracked here.

**Fix (backend):** add `participants`/`artists` and venue `media`/`latitude`/
`longitude` to the public serializers (or a public participants endpoint).

### #37. No public waitlist-join or access-request endpoint

The waitlist is an **authenticated, registration-based** flow
(`POST /registrations/:id/enqueue_waitlist` + `.../accept_waitlist_offer` — not
public). There is **no endpoint to request an invite** ("Request access"). The
frontend `InviteOnlySection`'s "Join Waitlist"/"Request access" were local-only
fakes; now display-only (no fake "joined"/"sent" state), fabricated
`waitlistAhead` default removed. Note `InviteOnlySection` only renders when
`event_type === "inviteOnly"`, which the backend never emits — dead for live
data.

**Fix (if wanted):** a public guest waitlist-join endpoint and/or an
invite-request endpoint.

### #38. `requires_ticket` is not enforced at quote/order time

Product `metadata.requires_ticket` is projected on the public products payload
(`requires_ticket`) and mapped by the frontend (`EventProduct.requiresTicket`),
but **no gate enforces it** — `Orders::BuildQuote` accepts a non-ticket line
regardless, and there is no order-level "buyer holds a ticket for this event"
check. Extras-only orders are otherwise fully supported (verified live 2026-09-10:
a guest extras-only quote → order for on-on "Reserved parking",
`requires_ticket: true`, succeeded without any ticket). The UI only offers
extras from a ticket's "Add extras" entry, so it's soft-gated there — but the
API would accept a ticket-required extra standalone.

**Fix (if wanted):** reject a quote/order line whose product `requires_ticket`
when the buyer has no ticket (or no ticket in the order) for the event.

---

## Deferred by design

Product decisions, not bugs. Re-open only if requirements change.

### #8-deferred. Auth: no Google / check-account / password-reset

Phone-OTP verification now EXISTS (guest claim flow, #14); Google / check-account
/ password-reset remain removed from the UI. Add only if the product spec
demands these flows.

### Consumer promos

`/catalog/promotions` is organizer CRUD. `order_quotes` accepts `promotion_code`
server-side (`Orders::BuildQuote` + `order_quotes_controller.rb`, verified
2026-09-09) so the consumer path runs through the quote. Confirm and drop the
standalone UI validate when wiring.

---

## Resolved (archive)

Full text of older resolved items is in the original `BACKEND_GAPS.md` (git
history). Every item below was re-verified against the pulled
`feat/launch-hardening-telemetry` branch.

| # | Resolution | Verified |
|---|---|---|
| 1b | Detail policy-filter → `public_show` action serves the full shape | live HTTP |
| 2 | `venue {name,city}` + `organization {name,slug}` nested in public payloads | live HTTP |
| 3 (main) | Products: `price_options` (cents) + `available` | live HTTP |
| 4 | Buyer-facing resale listing with event/product/ticket/venue context | live HTTP |
| 5 | `GET /tickets` owner wallet (`TicketWalletSerializer`) | live HTTP + frontend wired |
| 6 | Free orders fulfill → issue tickets (`accept_zero_total!`) | code |
| 15 | Mock-mirror dev events seeded with `platform_default` fee schedule | live 2026-09-04 |
| 1 | `PUBLIC_CONFIG_KEYS` 19-key projection — `event_setting_serializer.rb`; frontend `events-adapter.ts` maps all 17 keys (`featured`, `rating`, `sold_out`, `tickets_left`, `event_type`, `seat_map`, `rsvp_*`, `access_mode`, `invite_only_paid`, `price_foreign_from_minor`, …) | live HTTP 2026-09-10 (mirror events serve `featured`×8, `sold_out`×11, `seat_map`×3) |
| 13 | `price_from_minor` computed on the public list serializer | live HTTP 2026-09-08 (`on-on` → 10000) |
| 3-nuance | `requires_ticket` projected from product `metadata` | code 2026-09-08 |
| 19 | Public `GET public/events/:slug/ticket_types/:id/registration_schema` | live HTTP 2026-09-08 |
| 21 | `AcceptPayment` → `ConfirmPaid` transitions paid registrations to `confirmed` | code 2026-09-08 |
| 22 | `POST /registrations/:id/release` (`ReleasePending`, buyer-scoped) | code + route 2026-09-08 |
| 24 | `GET /resale_listings/mine` seller-scoped | live HTTP 2026-09-08 |
| 25 | Wallet `ticket_type` projects all resale-policy fields | live HTTP 2026-09-08 |
| 10 | Server-side signup validations (password length/confirmation, phone) | live HTTP 2026-09-08 |
| 12 | `Core::AuthThrottle` 10/min per IP + identifier on auth endpoints | code 2026-09-08 |
| 18 | `POST /payments/:id/refresh` buyer-scoped reconciliation + frontend return-screen wiring (`ready`/`pending`/`terminal`) | code + live HTTP 2026-09-08 |
| 20 | Audience gating — `POST ticketing/audience_authorizations` + `GatedTierGate` frontend wiring | live HTTP 2026-09-08 |
| 7 (notifications) | `GET /notifications` + `POST /notifications/:id/read` + preferences live; TopBar bell wired | live HTTP 2026-09-08 |
| 28 | Dev DB re-synced to the edited `create_payments` migration (`structure.sql` regenerated) | live 2026-09-08 |
| 14 | Guest shadow checkout: OTP flow, guest registration, guest quote/order/payment, claim-guest upgrade, public ticket views (backend complete; frontend slices 1–3 wired) | code + live HTTP 2026-09-09 |
| 30 (crash half) | `Parking::FulfillOrderItem` keyword-arg crash fixed (`status:` keyword) | code 2026-09-09 |
| 29 | Wallet `add_ons` projected from the ticket's order + eager-loaded; frontend `mapWalletTicket` maps → `UserTicket.addOns` ("Your extras" on live wallet tickets) | code 2026-09-09 (d67e132); live paid verification needs a Chapa sandbox-paid attempt |
| 32 | `price_from_minor` restricted to `active && ticket?` products — discovery shows the true "from" price | live HTTP 2026-09-09 (`on-on` → 60000, `euphoria` → 70000) |
| 23 | Repeat submissions after confirmation — `confirmed` dropped from the active-identity index + `Registration.blocking_duplicate`; dev DB index recreated by SQL | live HTTP 2026-09-10: **repeat purchase proven** (2nd RSVP same identity+ticket_type → new confirmed registration + new ticket) |
| 27 | Public RSVP — `request_otp` (guest OTP) + `rsvp` submit (confirmed/issuing/awaiting_approval, free tickets issued synchronously); `registrationModule.rsvpRequestOtp`/`verifyPhoneOtp`/`rsvpSubmit` + `RsvpRegistrationSheet` wired | live HTTP 2026-09-10: **happy path confirmed** (Chapa Test Free RSVP → registration `confirmed`, ticket with active QR); paid-guard 422 on FREEFORM |
| 31 | Guest payment-refresh returns signed guest ticket material — `GuestPaymentTicketSerializer` (`registration_id`, `ticket_view_token`, `ticket_view_url`, `short_url`); frontend maps → `UserTicket` + copyable "Ticket link"; **claim-to-account flow built** (`ClaimGuestSheet`: OTP → password → claim → sign in; follow-up note in `.scratch/guest-claim-account/`) | code 2026-09-10 (`43174dd`); live paid drill needs a Chapa sandbox-paid attempt |
| 30 | Parking fulfillment data — **seed-side fix**: every fabricated parking product gets a `parking` `product_access` + `PARKING` zone; 26/26 dev parking products carry them; fulfill path covered by backend tests | SQL 2026-09-10 (26/26); live fulfill drill needs a Chapa-paid order |
| 35 | Checkout purchase limit — **seed-side fix**: `PurchaseLimits::Reserve`/`Commit` require a ticket-type limit (`purchase_limit_allocations_missing` otherwise); the dev free-RSVP fixture now sets `max_packages_per_user: 10` (preview.rb), so guest checkout on it creates + auto-fulfills. Frontend maps friendly copy for the limit errors | live HTTP 2026-09-10 (free guest order 422 → after seed fix: order created, active ticket issued) |
| 16 | Chapa API V2 migration — `api.chapa.global`, `CHAPA_TEST_`/`CHAPA_LIVE_` key prefixes matching `CHAPA_MODE`, V1 `CHASECK_*` validation removed; `PaymentSerializer` shape unchanged | code read 2026-09-15 (`a470c76`) |
| 26 | Seller payout destination create now works — Chapa V2 direct transfer: `VerifyPayoutAccount` persists an encrypted destination from a **flat** `payout_account { type, provider, bank_slug, account_number, holder_name }`, verifies via provider or leaves `pending_verification`; frontend `payoutService.addMethod` rewired to the flat payload + new wire fields | code read + local wiring 2026-09-15 (`a470c76`) |

---

## Seed-side review (2026-09-04)

The dev seeds (`db/seeds_events.rb` — the frontend-owned mock-mirror;
`db/seeds/preview.rb`) exist so the UI has data. **Seed-side issues are fixed in
the seed, not tracked as backend gaps.** Past seed fixes: **#30** (parking
`product_access` + `PARKING` zone per parking add-on) and **#35**
(`max_packages_per_user: 10` on the free-RSVP fixture) — see the Resolved
archive.

Every open gap above is backend serializer/code-level, not a seed problem. The
mock-mirror seed writes everything the backend can possibly consume (full
`event_setting.config` JSONB, `price_from_minor` via `Catalog::ProductPrice`,
`requires_ticket` via product metadata); remaining seed-side TODO is populating
`event_participants` + venue media once the backend exposes them (#36).

**Seed-side TODO (frontend-owned, Phase 3):** ~~add a promotion + promo code
fixture so `order_quotes.promotion_code` can be integration-tested.~~
**DONE 2026-09-05** — active 10% promotion + `LAUNCH10` code on `on-on`;
verified live (quote applies `discount_minor`, unknown codes →
`invalid_promotion_code`).

---

## Discovered endpoints

Recorded for knowledge; most are now consumed (see the relevant gap/archive row).

### Guest checkout + claim (verified against `config/routes.rb` 2026-09-09; wired)

- `POST /public/ticket_views/:token/request_otp` — request OTP for a guest ticket (needs a valid `view_token`; #31)
- `POST /phone_verifications/:id/verify` — verify OTP code → signed proof token (Idempotency-Key required)
- `POST /guest/ticket_types/:ticket_type_id/registrations` — passwordless shadow registration
- `POST /guest/events/:event_id/order_quotes` — phone-confirmed quote preview
- `POST /guest/events/:event_id/orders` (and `/guest/orders`) — create order from guest quote token
- `POST /guest/orders/:order_id/payment_attempts` — start Chapa payment for a guest order
- `POST /guest/payments/:payment_id/refresh` — guest payment reconciliation (returns wallet incl. QR credentials; now serves the signed guest ticket material, #31)
- `POST /registrations/:id/claim_guest` — upgrade shadow user with OTP proof + password → auth tokens (wired: `ClaimGuestSheet`)
- `GET /public/tickets/:ticket_id?view_token=` — signed public ticket view (QR material)
- `POST /auth/phone_verifications` — OTP request for the authenticated-account path

### Ticket transfer recipient flow (verified against `config/routes.rb` + live E2E 2026-09-09)

**WIRED 2026-09-09** — `src/lib/transfer.ts` consumes these live (see
`.scratch/transfer-recipient-otp/`). `TicketTransfer` stores an encrypted
`token_ciphertext`; verify proof tokens carry a `purpose` (e.g. `ticket_transfer`):

- `POST /tickets/:ticket_id/transfers` — authenticated initiate → `{ transfer, token }` (the secret the sender shares)
- `GET /public/ticket_transfers/:id?token=` — recipient-safe landing (404 `invalid_transfer` for wrong/expired token)
- `POST /public/ticket_transfers/:id/request_otp` — `{ phone, token }` (+ Idempotency-Key) → `{ challenge_id, status, expires_at }`; `purpose: "ticket_transfer"`
- `POST /phone_verifications/:challenge_id/verify` — `{ code }` (+ Idempotency-Key) → `{ verification_token, expires_at }`
- `POST /public/ticket_transfers/:id/accept_guest` — `{ token, phone, verification_token, password?, password_confirmation? }` → claims the ticket, rotates credentials, returns a signed view link + auth tokens
- `POST /ticket_transfers/:id/accept|decline|cancel` — authenticated recipient paths (not yet consumed by the frontend)

### Previously recorded (not consumed)

- `GET /feed` (`core/feed#index`) — follows-based social feed. Discovery is the browse surface.
- `GET /categories`, `/venues`, `/artists` (+ `:id`) — public read endpoints backing the follow system.