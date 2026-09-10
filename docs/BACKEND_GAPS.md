# Confirmed Backend Gaps (digis_backend)

> Every confirmed gap between what the frontend needs and what the backend provides,
> **verified against the actual backend code** (serializers, policies, controllers,
> routes). The frontend does NOT work around these (ADR-0002) — it mocks/defer/disables
> until the backend resolves them.
>
> Status key: `blocking` (frontend feature can't ship), `degrading` (works but
> suboptimal), `informational` (note for backend correctness), `RESOLVED` (fixed on
> `feat/launch-hardening-telemetry`).
>
> Re-verified 2026-09-09 against the pulled branch (`91063d8` then fast-forward
> `d67e132` — wallet `add_ons` + ticket-only min price + public ticket-transfer
> OTP endpoints) by code read + live HTTP. Items whose fix is confirmed are in
> the Resolved archive at the bottom.

---

## Open — blocking

These are the items the frontend cannot ship a feature around. Each entry: what's
missing (file + fields), why it matters, and a concrete fix.

### #17. `cbe` is not a valid backend payment method (BLOCKING for the CBE Birr option)

Frontend `PaymentMethod = 'telebirr' | 'cbe' | 'card'`; backend
`Commercial::FeeComponent::PAYMENT_METHODS = %w[telebirr card bank]`
(`app/models/commercial/fee_component.rb:23`), and the Chapa payment adapter
capabilities list `payment_methods: %w[telebirr card bank]`
(`app/services/payments/providers/registration.rb`). Selecting CBE Birr →
`422 invalid_payment_method`. Add `"cbe"` to the model, the `chapa_adapter`
capabilities, and any organizer-facing `payment_method` enums; the frontend's CBE
button is currently disabled as a workaround. **VERIFIED STILL OPEN 2026-09-09.**

### #23. One active registration per identity+ticket type — RESOLVED 2026-09-10

`ad7bd57` (`feat(registration)`) dropped `confirmed` from the active-identity
unique index `idx_ticketing_registrations_active_identity` and from
`Registration.active`, so a confirmed registration no longer blocks a fresh
submit of the same tier — repeat bookings after confirmation now work. The
frontend `register`/`guestRegister` already map `active_registration_conflict`
(still valid for genuinely active rows) — no frontend change needed. See Resolved archive.

### #26. Payout destination creation fail-closed (BLOCKING for seller payout-account verification) — PARTIAL

`Marketplace::PayoutProviders::Registration` registers the Chapa adapter at boot
(when `CHAPA_ENABLED` + `CHAPA_PAYOUT_ENABLED`), so `Registry.fetch` no longer
raises `KeyError` — the `payout_account_provider_unavailable` 422 is gone.
However `ChapaTransferClient#capabilities` reports
`destination_registration: { supported: false }`
(`app/services/finance/payout_providers/chapa_transfer_client.rb:64-70`), and
`Marketplace::PayoutProviders::ChapaAdapter#tokenize_payout_account` raises
`payout_provider_operation_not_implemented` unless the client responds to it
(`chapa_adapter.rb:15-19`). Creates still 422, intentionally — raw credentials
must never be stored until the provider can tokenize destinations. Reads (`GET`)
work. **VERIFIED PARTIAL 2026-09-09:** registry fixed; destination verification
remains blocked on Chapa tokenization capability.

---

## Open — degrading

Work but suboptimal. Frontend falls back to mock or local enrichment.

### #8. `UserAuthSerializer` lacks `name`; no `Core::User.name` column

`Core::UserAuthSerializer` returns `id, email, phone, verified_at, created_at,
updated_at, permissions` only (`app/serializers/core/user_auth_serializer.rb:3`)
— no `name`. Frontend derives display name from email local-part. Fix: add
`name` column and serializer field if the product wants a real display name.
**VERIFIED STILL OPEN 2026-09-09.**

### #9. No self-service `PATCH /auth/me` or `PATCH /users/me`

Routes expose only `GET auth/me` (`config/routes.rb:10`) — no update endpoint.
Settings profile-edit UI is display-only. Add an auth-bounded update endpoint
guarded by `Core::Authorizable`; needs `name` column (#8) for the same payload.
**VERIFIED STILL OPEN 2026-09-09.**

### #27. No consumer RSVP submit endpoint — RESOLVED 2026-09-10

`983c6a3`/`e42f981`/`193fbb2`/`0a3b728` (`feat(rsvps)`) added public RSVP:
`POST public/events/:event_slug/rsvp/request_otp` (guest OTP challenge, free
products only) + `POST public/events/:event_slug/rsvp` (submit → `confirmed` /
`issuing` / `awaiting_approval`, with synchronous ticket issuance for free
products). Frontend wired: `registrationModule.rsvpRequestOtp`/`verifyPhoneOtp`/
`rsvpSubmit` + `RsvpRegistrationSheet` (guest phone → OTP → submit; signed-in
attendees submit directly). Live probe: FREEFORM's paid product →
`rsvp_paid_product_requires_checkout` (mapped). See Resolved archive.

### #30. Parking fulfillment blocked by missing seed zones (DEGRADING — clean error, not a crash)

The `Parking::FulfillOrderItem` keyword-arg crash (`ArgumentError`) is RESOLVED
on `feat/launch-hardening-telemetry` (all `error()` call sites pass `status:`
correctly). However every parking product in the dev seed still has zero parking
access zones, so any order containing a parking extra returns a clean
`Core::BusinessError` ("The parking product has no parking access") instead of
fulfilling. **Why it degrades the frontend:** the Chapa return screen stays
`pending` until the ticket is issued. Ticket-only orders unaffected. **Fix:**
seed parking access zones (our `db/seeds_events.rb` or backend seed).

### #31. No JSON endpoint returns a signed guest ticket `view_token` (DEGRADING for guest ticket access + OTP claim)

`Ticketing::GuestTicketViewToken.issue(ticket:)` is minted ONLY inside
`Links::BrandedUrl#direct_ticket_url` (SMS fallback when short links disabled)
and `Links::TargetResolver#public_ticket_location` (short-link redirect) —
**no controller returns a view_token in a JSON body** (verified 2026-09-09). The
public ticket view (`GET /public/tickets/:ticket_id?view_token=`) and the guest
OTP request (`POST /public/ticket_views/:token/request_otp`, which requires a
valid `view_token`) are therefore unreachable from inside the app without first
holding a signed link.

**Why it degrades the frontend:** a guest's device-held ticket has no server-
signed fallback link, and the in-app "claim your account" OTP flow cannot start
(no token to feed `request_otp`).

**Frontend mitigation (live 2026-09-09):** the guest return screen persists the
issued tickets (full wire, incl. per-credential QR) into an **encrypted device
wallet** (`src/lib/guest-wallet.ts` — AES-GCM over IndexedDB) BEFORE the checkout
resume keys are cleared. Signed-out `/tickets` shows a "Tickets on this device"
section. This covers same-device re-entry; the durable cross-device path still
needs the backend fix below.

**Fix (backend):** expose a `view_url`/`view_token` on the guest payment-refresh
response (or a public endpoint that mints one for the owner of a ticket), and/or
allow `request_otp` to accept phone+payment proof instead of a view_token.
This is the backend follow-up that makes claim → authenticated wallet fully
workable.

### #33. Guest payment-refresh re-validates the quote token even for accepted payments (DEGRADING — can strand a paid guest)

`Orders::GuestPaymentRefreshController#create` re-decodes `GuestQuoteToken`
(`guest_payment_refresh_controller.rb:19-21`) before reconciling. The token
binds `event_id` + a `phone_digest` (`guest_quote_token.rb:36,70-75`); any
failure — including pairing a payment with creds from a DIFFERENT order —
returns `422 invalid_guest_quote`. Note there is **no time check at decode**
(the "invalid or has expired" copy is generic): the 10-minute quote hold
(`Orders::BuildQuote::HOLD_DURATION`) is enforced only at create/restart/
payment-attempt, not at refresh. Separately, `Core::GuestRequestThrottling`
(`guest_request_throttling.rb:23`) counts every ≥400 response (LIMIT=10/min per
IP+phone), and the app's 3-second return poll tripped it (`429 rate_limited`)
by retrying the failing refresh.

**Why it degrades the frontend:** a guest whose checkout creds are stale or
crossed (abandoned earlier checkout, multi-order purchase, leftover
`localStorage`) gets a refresh that 422s even though the payment was accepted
and tickets were issued server-side. The return screen then tells them
"payment failed", and the retry loop locks the phone out of the guest
endpoints for a minute.

**Frontend mitigation (live 2026-09-09):** guest creds are now correlated to
the payment being reconciled (`findGuestReturnCreds(paymentId)` in
`src/lib/order.ts` resolves the order via `digis:payment-id:<orderId>`), the
reconcile loop treats `invalid_guest_quote`/not-owned/not-found as terminal
(stops polling, honest copy), and 429 backs off for the throttle window. The
device wallet + SMS link remain the recovery path when verification genuinely
can't run.

**Fix (backend):** for an already-accepted payment, bind refresh by payment id
+ the order's buyer phone and skip the quote-token decode (the payment is the
durable proof, not the quote); and don't count `invalid_guest_quote` on
accepted payments toward the guest throttle. **VERIFIED 2026-09-09.**

### #34. Past events remain purchasable — no date / sales-window enforcement (DEGRADING for purchase correctness)

The quote → order → payment path never checks the event date or the product
sales window. `Orders::BuildQuote#normalize_item_request`
(`app/services/orders/build_quote.rb:108-154`) only rejects an event when
`status == "cancelled"` and a product when `status != "active"`. It ignores:
- `Events::EventDate#starts_at` / `#ends_at` and its `status`
  (`STATUSES = %w[scheduled postponed cancelled completed]`,
  `app/models/events/event_date.rb:8`) — nothing marks dates `completed` when
  `ends_at` passes, and nothing refuses a quote for a finished date.
- the product sales window `sales_start_at` / `sales_end_at`
  (`app/models/catalog/event_product.rb`). `Catalog::Public::ProductAvailability`
  respects it but is DISPLAY-only (sold-out/tickets-left), and
  `Catalog::Inventory::Reserve` (box-office reserve) enforces it — the online
  guest/auth checkout path (`BuildQuote` → `CreateCheckout` →
  `StartPaymentAttempt`) does not.
- `Events::Event.publicly_visible` is `status: "published" AND
  visibility: "public"` with no date filter (`app/models/events/event.rb:86`),
  so past published events stay listed and quotable.

**Verified live 2026-09-09:** a published event whose only date has passed still
returns a quote, creates an order, and opens a payment — end-to-end purchasable.

**Frontend mitigation (live 2026-09-09):** display-side "disable" per ADR-0002.
`eventEnded()` (`src/lib/eventDates.ts`) treats an event as ended when no date
remains with `status ∈ {scheduled, postponed}` and `ends_at` (fallback
`starts_at`) in the future. The event-detail page hides the ticket selector +
purchase bar and shows an "Event ended" state; the `choose_one` date step offers
only future dates; the discovery grid keeps the event visible with an "Ended"
badge.

**Fix (backend):** reject a quote when the event has no future purchasable date
(or the requested event_date has passed / is `completed`/`cancelled`), and
enforce the product `sales_end_at` window in `BuildQuote` (or in
`StartPaymentAttempt` as the last gate). Optionally auto-mark event dates
`completed` when `ends_at` passes (the status already exists) and/or filter
`publicly_visible` to events with a future date.

---

## Informational

Cheap insurance / product-clarity notes, not blocking.

### #11. Slug namespace safety + redirects — PARTIALLY ADDRESSED

A `RESERVED_SLUGS` denylist now exists on the short-link model
(`app/models/links/short_link.rb:12`, validated at `short_link.rb:58`) guarding
the branded-link space. What remains: an event-slug `slug_history` 301 table so
renamed event slugs keep their old URLs. Frontend needs zero changes.

### #16. Chapa v1 vs v2 (key-prefix gated)

Backend implements v1 only. Keys prefixed `CHASECK_TEST-`/`CHASECK-` work
(`app/services/payments/providers/chapa_client.rb:191`,
`app/services/finance/payout_providers/chapa_transfer_client.rb:152`);
`CHAPA_TEST-` keys (v2) fail the boot-time validator. No frontend impact —
backend presents the same `PaymentSerializer` either way.

---

## Deferred by design

These are product decisions, not bugs. Re-open only if requirements change.

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
| 1 | `PUBLIC_CONFIG_KEYS` 19-key projection (`allow_waitlist`, `public_guest_limit`, `featured`, `rating`, `sold_out`, `tickets_left`, `price_foreign_from_minor`, `foreign_currency`, `event_type`, `seat_map`, `answer_edit_window_hours`, `rsvp_going`, `rsvp_capacity`, `allows_plus_one`, `max_guests`, `rsvp_requirements`, `access_mode`, `invite_only_paid`, `on_guest_list`) — `event_setting_serializer.rb` (committed `feat(events)` 2026-09-10); frontend `events-adapter.ts` maps all 17 keys | live HTTP 2026-09-10 (mirror events serve `featured`×8, `sold_out`×11, `seat_map`×3, `event_type`, `tickets_left`) |
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
| 29 | Wallet `add_ons` projected from the ticket's order (non-ticket items `{id,name,type,quantity,unit_amount_minor}`) + eager load in `TicketsController#index` and `PaymentRefresh`; frontend `mapWalletTicket` already maps `add_ons` → `UserTicket.addOns`, so `DetailedTicket` "Your extras" renders on live wallet tickets | code 2026-09-09 (d67e132); live paid verification needs a Chapa sandbox-paid attempt |
| 32 | `price_from_minor` restricted to `status == "active" && ticket?` products (`event_list_serializer.rb`) — discovery grid/filter/sort now show the true ticket "from" price | live HTTP 2026-09-09 (`on-on` → 60000, `euphoria` → 70000; was 10000) |
| 23 | Repeat submissions after confirmation — `confirmed` dropped from `idx_ticketing_registrations_active_identity` + `Registration.active` (`ad7bd57`) | code 2026-09-10 |
| 27 | Public RSVP — `POST public/events/:event_slug/rsvp/request_otp` (guest OTP, free products) + `POST public/events/:event_slug/rsvp` (submit → confirmed/issuing/awaiting_approval, free tickets issued synchronously); frontend `registrationModule.rsvpRequestOtp`/`verifyPhoneOtp`/`rsvpSubmit` + `RsvpRegistrationSheet` guest-OTP / signed-in submit wired | live HTTP 2026-09-10 (paid-guard 422 `rsvp_paid_product_requires_checkout` on FREEFORM); happy-path live drill needs a free RSVP product in dev + an OTP code |

---

## Seed-side review (2026-09-04)

Every open gap is backend serializer/code-level — not a seed problem. The
frontend-owned `db/seeds_events.rb` mock-mirror seed writes everything the
backend can possibly consume (full `event_setting.config` JSONB, `price_from_minor`
data via `Catalog::ProductPrice`, `requires_ticket` via product metadata).
Per the hard constraint we do not touch backend code; the seed is ready
for backend fixes to land without further seed work.

**One seed-side TODO (frontend-owned, for Phase 3 wiring):** ~~add a promotion
+ promo code fixture to `db/seeds_events.rb` so `order_quotes.promotion_code`
can be integration-tested once the frontend passes the code at quote time.~~
**DONE 2026-09-05** — active 10% promotion + `LAUNCH10` code seeded on the
`on-on` event; verified live (quote applies `discount_minor`, unknown codes →
`invalid_promotion_code`).

---

## Discovered endpoints (no consumer yet — recorded for knowledge)

### Guest shadow checkout (verified against `config/routes.rb`, 2026-09-09)

- `POST /public/ticket_views/:token/request_otp` — request OTP for a guest ticket
  (requires a valid `view_token`; see #31)
- `POST /phone_verifications/:id/verify` — verify OTP code, get signed proof token
- `POST /guest/ticket_types/:ticket_type_id/registrations` — passwordless shadow registration
- `POST /guest/events/:event_id/order_quotes` — phone-confirmed quote preview
- `POST /guest/events/:event_id/orders` (and `/guest/orders`) — create order from guest quote token
- `POST /guest/orders/:order_id/payment_attempts` — start Chapa payment for guest order
- `POST /guest/payments/:payment_id/refresh` — guest payment reconciliation (returns wallet incl. QR credentials)
- `POST /registrations/:id/claim_guest` — upgrade shadow user with OTP proof + password → auth tokens
- `GET /public/tickets/:ticket_id?view_token=` — signed public ticket view (QR material)
- `POST /auth/phone_verifications` — OTP request for the authenticated-account path

### Ticket transfer recipient flow (verified against `config/routes.rb` + live E2E 2026-09-09)

**WIRED 2026-09-09** — `src/lib/transfer.ts` now consumes these live (see
`.scratch/transfer-recipient-otp/`): sender `POST /tickets/:ticket_id/transfers`
(nested under `resources :tickets`), recipient landing/OTP/accept as below.
`TicketTransfer` stores an encrypted `token_ciphertext` and verify proof tokens
carry a `purpose` (e.g. `ticket_transfer`):

- `POST /tickets/:ticket_id/transfers` — authenticated initiate → `{ transfer,
  token }` (the secret the sender shares; only recipient acceptance changes
  ownership)
- `GET /public/ticket_transfers/:id?token=` — recipient-safe landing
  (`PublicTicketTransferSerializer`: masked recipient phone, event, ticket
  product, `expires_at`; 404 `invalid_transfer` for wrong/expired token)
- `POST /public/ticket_transfers/:id/request_otp` — `{ phone, token }` (+ Idempotency-Key)
  → `{ challenge_id, status, expires_at }`; `purpose: "ticket_transfer"`
- `POST /phone_verifications/:challenge_id/verify` — `{ code }` (+ Idempotency-Key)
  → `{ verification_token, expires_at }` (15-min proof)
- `POST /public/ticket_transfers/:id/accept_guest` — `{ token, phone,
  verification_token, password?, password_confirmation? }` (+ Idempotency-Key)
  → `{ transfer, ticket (PublicTicketViewSerializer), ticket_view_url, user,
  access_token, refresh_token }` — claims the ticket into the recipient's wallet
  (or shadow identity when no password), rotates the credential generation, and
  returns a signed view link
- `POST /ticket_transfers/:id/accept|decline|cancel` — authenticated recipient
  paths (not yet consumed by the frontend)

### Previously recorded

- `GET /feed` (`core/feed#index`) — follows-based social feed. Discovery is
  the browse surface; not consumed yet.
- `GET /categories`, `/venues`, `/artists` (+ `:id`) — public read endpoints
  backing the follow system. Not consumed.