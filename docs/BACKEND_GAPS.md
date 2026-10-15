# Confirmed Backend Gaps (digis_backend)

> Every confirmed gap between what the frontend needs and what the backend provides,
> **verified against the actual backend code** (serializers, policies, controllers,
> routes). The frontend does NOT work around these (ADR-0002) — it disables/hides
> until the backend resolves them.
>
> **What counts as a backend gap:** a deficiency in the backend's
> **code / API / contract** that the backend dev must fix — a missing field or
> endpoint, a wrong status or business rule, a serializer/policy gap.
>
> **What does NOT count:** anything that has to be **set up**. Seeds; dev
> environment config (`config.hosts` tunnel allowlist, `config/recurring.yml` dev
> jobs); provider/dashboard setup (webhook registration, API keys, webhook secret
> hash); env vars; tunnels; deploys. Those are setup chores for whoever runs the
> environment — record them where the setup lives, never as a gap here.
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
>
> **Re-verified 2026-09-21 against the local backend tree** (`dc1d9df` +7 unpushed;
> `origin/feat/launch-hardening-telemetry` is stale at `a470c76`, 2026-09-14 — there
> was nothing newer to pull). **Sweep result: every open gap is still open** — #17,
> #40, #41, #8, #9, #33, #34, #42, #36, #37, #38. **#39 and #1 re-filed open**: both
> had been marked resolved on the strength of patches *of ours* (uncommitted for
> #39, a local-only commit for #1), which do not resolve a gap (see `AGENTS.md`).
> Both have been reverted. No frontend wiring was needed.
>
> **Re-verified 2026-09-30 against `feat/launch-hardening-telemetry` at `326f6a3`**
> (merged 41 commits — the **Composable Admission Selection** release). It replaced
> the event-level "RSVP vs Ticketed" model with an offer-driven one: the RSVP routes
> are **deleted** (`POST /public/events/:slug/rsvps` + `/rsvps/request_otp`,
> `/public/registrations/:id/waitlist/enqueue|accept`), replaced by
> `POST /public/events/:slug/admission_selections` (+ `/request_otp`) and
> offer-scoped `POST /public/events/:slug/admission_offers/:product_id/waitlist`
> (+ `/request_otp`). It also **gutting the public `event_setting.config`
> projection to `%w[public_guest_limit]`** (so the frontend's 17 keys are gone, not
> just `allow_waitlist`/`event_type`).
>
> **Sweep result — newly resolved (backend code, verified):** #41 (index is now
> `(registration_id, order_id)`), #40 (`ExpireCheckout` reconciles grace instead of
> aborting the sweep), #39 (`GET .../payout_accounts/destinations` + `TYPES` widened
> to `bank mobile_money`), #34 (`Orders::EventDateEligibility` now gates both
> `BuildQuote` and `CreateCheckout`), #33 (`ResolveGuestOrderAccess` accepts an
> `order_access_token`), #43/#45/#37 (the unified selection accepts `audience_proof`
> and the offer-scoped public waitlist exists), #27 **superseded** (RSVP routes
> deleted). **Re-scoped:** #1 (the projection is now a single key — see #53).
> **New gaps filed:** #53 (public event payload drops the detail fields),
> #54 (no discovery availability), #55 (detail has no `price_from_minor`).
> **Still open:** #17, #8, #9, #42, #44, #46–#52, #11, #36, #38. The frontend's
> `src/lib/registration.ts` RSVP methods (`rsvpRequestOtp`/`rsvpSubmit`) are now
> **dead** (routes gone) and must be removed.
>
> **Added 2026-09-30 (auth):** #56 (a guest who bought a ticket can't create an
> account — signup can't take over the shadow phone) and #57 (no forgot-password
> endpoint) — both blocking, filed on fresh code reads.
>
> **Re-verified 2026-10-01 against `feat/launch-hardening-telemetry` at `ed6309a`**
> (9 commits since `326f6a3`; all organizer/admin surfaces plus one consumer fix).
> **Only #42 resolved and frontend-wired** — the wallet resale policy now serves
> `resale_price_cap_minor` (`d7aa4ff`). Every other open gap re-checked and still
> open: #17, #8, #9, #44, #54, #55, #46–#52, #58, #11, #36, #38. Filed since the
> last sweep: **#58** (`active_checkout_exists` 409 carries no order id), **#59**
> (no invitation link format/delivery), **#60** (Chapa payment amount sent 100×
> too large). Local backend synced to `ed6309a` with dev setup preserved; the
> stale organizer `attendee_export.request` grant from the old seed was removed.
> No upstream change required new frontend wiring beyond #42.

## Status key

| Status | Meaning |
|---|---|
| **open — blocking** | frontend feature cannot ship until fixed |
| **open — degrading** | works but suboptimal; frontend has a mitigation |
| **frontend-fixable** | **not a backend gap** — the frontend can satisfy this from an existing surface (reclassified 2026-10-02) |
| **informational** | note for backend correctness; no frontend impact |
| **deferred** | product decision, not a bug |
| **resolved** | fixed; detail in the Resolved archive |

## At a glance

| # | Status | Summary |
|---|---|---|
| 17 | open — blocking | persisted enum `PAYMENT_METHODS = %w[telebirr card bank]` rejects `cbe`/`cbebirr` (the Chapa adapter already advertises `cbebirr`) |
| 56 | open — blocking | signup can't take over an existing (shadow) phone → a guest who bought a ticket can never create an account ("Phone has already been taken") |
| 57 | open — blocking | no password reset / forgot-password endpoint (phone-first reset would reuse the existing OTP infra) |
| 53 | open — blocking | public event payload drops the non-admission detail fields (`age_restriction` / `seat_map` / `featured` / `rating`; lineup → #36). The `rsvp_*` / `event_type` / `access_mode` keys are superseded by the per-offer model |
| 8 | open — blocking | no user `name` column / serializer field (signup now sends `name` — silently dropped) |
| 9 | open — degrading | no self-service `PATCH /auth/me` |
| 42 | resolved 2026-10-01 | wallet resale policy now serves `resale_price_cap_minor` (percentage resolved to an amount) |
| 44 | open — degrading | event-level `event_type` / `access_mode` / `rsvp_*` config is inert — now also unexposed (see #53); the real gates are per-offer |
| 54 | open — degrading | no discovery availability — `GET /public/events` has no `sold_out` / per-offer `available` (products are per-event) |
| 55 | frontend-fixable — done | detail "from" price implemented via `useTicketPricing` + `PurchaseBar` (2026-10-03) |
| 46 | open — degrading | no saved-events/favourites, home feed (`GET /feed` route has no controller), reviews/ratings, or user social graph |
| 47 | open — degrading | no gift-ticket endpoint (the UI fabricates a `#gift` link) |
| 48 | open — degrading | no consumer account preferences (language/currency/region), 2FA, or password change/reset |
| 49 | open — degrading | `GET /public/events` has no search/filter/sort/pagination; no events-by-organizer/artist/venue |
| 50 | open — degrading | wallet/history gaps: registration answers + edit window, per-ticket capability flags, order/registration/transfer history, unread-count/mark-all-read |
| 51 | open — degrading | no events-by-followable (organizer/venue/artist history); no profile stats (gamification) |
| 52 | frontend-fixable | venue/artist detail omit `is_following`; derivable from `GET /users/:id/following` (self-scoped) — a backend attribute would be cleaner but isn't required |
| 58 | open — degrading | `active_checkout_exists` 409 carries no order id and there is no buyer-scoped order lookup → the client can't resume/discard the open checkout |
| 59 | frontend-fixable | invitation link is frontend-constructible (backend already accepts `invitation_token`); the unset dev sender is **setup**, not a gap |
| 60 | open — blocking | Chapa payment amount is sent in minor units (100× too large) → large orders fail with "amount is greater than the maximum amount supported by the currency" |
| 61 | open — degrading | a pending ticket transfer is invisible in-app: no notification on initiation and no way to list incoming transfers (only the SMS/email claim link) |
| 62 | open — degrading | a ticket with a pending (unaccepted) outgoing transfer is indistinguishable from a normal active ticket in the sender's wallet |
| 63 | resolved 2026-10-05 | G-41 mixed ticket + add-on checkout implemented (backend commits `b157e36`, `d5a8320`); frontend wired in `admissionModule` & `useCheckoutFlow` |
| 64 | resolved 2026-10-01 | resale default now uses the served resale cap (exact for the standard 100% policy); the acquisition field isn't needed |
| 65 | open — blocking | seller payout dispatch fails at the provider — Chapa returns `invalid_format`; no payout has reached `succeeded` |
| 66 | resolved 2026-10-05 | `ticket_id` added to `Marketplace::ResaleListingSerializer` and policy `SELLER_FIELDS` (commit `360f9c7`); frontend wired in `resaleModule` |
| 67 | open — degrading | `Core::UserProfile` enforces mandatory `last_name` (`null: false`, `validates :last_name, presence: true`) → single-name signups require client-side fallback/duplication |
| 68 | open — degrading | public event payload exposes no recurrence/series signal (no `recurrence`/`is_recurring`, no public `source_key`) despite a full backend recurrence engine → the recurring consumer UI stays parked |
| 11 | informational | event-slug `slug_history` 301 table missing (slug safety partial) |
| 36 | informational | public payload lacks event participants/lineup (real; no public event→artist link; participants **do** model a per-date link — see #36 addendum). Venue media/coords are **frontend-fixable** via `GET /venues/:id` |
| 38 | informational | `requires_ticket` exposed but not enforced at quote/order time |
| 1 | resolved 2026-09-30 | public `event_setting.config` is now `%w[public_guest_limit]` — the old "widen to 17 keys" ask is moot; the fields it held are covered by #53/#44 |
| 27 | superseded 2026-09-30 | Public RSVP routes deleted → free admission now goes through `admission_selections` |
| 33 | resolved 2026-09-30 | guest payment resolves via `order_access_token` (`ResolveGuestOrderAccess`) |
| 34 | resolved 2026-09-30 | `Orders::EventDateEligibility` gates `BuildQuote` + `CreateCheckout` |
| 37 | resolved 2026-09-30 | offer-scoped public waitlist endpoint exists |
| 39 | resolved 2026-09-30 | `GET .../payout_accounts/destinations` + `TYPES = %w[bank mobile_money]` |
| 40 | resolved 2026-09-30 | `ExpireCheckout` reconciles grace instead of aborting the sweep |
| 41 | resolved 2026-09-30 | `idx_one_order_item_per_registration` is now `(registration_id, order_id)` |
| 43 | resolved 2026-09-30 | `admission_selections` accepts `access_code` / `invitation_token` as `audience_proof` |
| 45 | resolved 2026-09-30 | per-offer sold-out → `waitlist_available` + offer waitlist |
| 8-deferred | deferred | no Google / check-account / password-reset auth |
| 16 | resolved | Chapa API V2 (`CHAPA_TEST_`/`CHAPA_LIVE_` keys, `api.chapa.global`) |
| 26 | resolved | payout destination create works (Chapa V2 direct-transfer registration) |

---

## Open — blocking

These items block a frontend feature. Each entry: what's missing (file + fields),
why it matters, and a concrete fix.

### #17. `cbe` is not a valid backend payment method

Frontend `PaymentMethod = 'telebirr' | 'cbe' | 'card'`; the persisted enum
`Commercial::FeeComponent::PAYMENT_METHODS = %w[telebirr card bank]`
(`app/models/commercial/fee_component.rb:23`), inherited by `Orders::Payment`
(`app/models/orders/payment.rb:13`, validated `:49`), rejects it at
`app/services/orders/payment_attempt_support.rb:28`. Selecting CBE Birr →
`422 invalid_payment_method`.

**Correction 2026-10-02:** the earlier claim that the Chapa adapter capabilities
are `%w[telebirr card bank]` is **stale** — `app/services/payments/providers/registration.rb:33`
now advertises `%w[telebirr cbebirr mpesa awashbirr ebirr enat_bank card bank]`
(direct charge: `telebirr cbebirr mpesa awashbirr`). The only blocker is the
persisted enum, which rejects **both** `cbe` and `cbebirr` even though the
adapter supports `cbebirr`. So the fix is a one-line enum widening, not an
adapter change.

**Fix:** add `"cbe"`/`"cbebirr"` to `PAYMENT_METHODS` (and any organizer-facing
`payment_method` enum). The frontend's CBE button is currently disabled as a
workaround.

**Status: open — verified 2026-10-02 (enum confirmed; adapter evidence corrected).**

### #40. Abandoned checkouts never expire → `active_checkout_exists` blocks all later checkouts — RESOLVED 2026-09-30

`Orders::ExpireCheckout` is what releases an abandoned `pending_payment` order,
which is what unblocks `active_checkout_exists`. When the sweep aborts, those
orders pile up and every later checkout for that buyer+event 409s.

**The gap** is in `ExpireCheckout#expire_order`
(`app/services/orders/expire_checkout.rb:49-57`): it **raises `ExpiryFailure`
when a `current` payment (`status in created/processing`) has an already-elapsed
`settlement_grace_expires_at`**. `ExpiryFailure` aborts the whole sweep
(`call` rescues → failure), so a single such order leaves **every** stale checkout
unexpired. Verified live 2026-09-15: 10 active checkouts, 2 with elapsed grace →
`ExpireCheckout.call` `success=false`, `remaining=10`, 0 released.

**Why it blocks the frontend:** the buyer can never start a new checkout for the
event; from a fresh session the conflict sheet cannot even offer a restart,
because the `active_checkout_exists` 409 carries no order id.

**Fix (product code — `app/services/orders/expire_checkout.rb`):** move to
settlement grace only while it is still open; otherwise release the order instead
of raising:

```ruby
payment = order.payments.current.lock.order(:id).first
if payment && payment.settlement_grace_expires_at > now
  move_to_grace!(order, payment)
  next payment.id
end

release = Orders::ReleaseCheckout.call(order:, at: now)
raise ExpiryFailure, release.error if release.failure?
next true
```
(A late provider success is still handled by `AcceptPayment`'s rejection/reversal
path.)

**Dev setup (NOT part of the gap):** to *exercise* this locally the sweep must
run, which needs a `development:` block in `config/recurring.yml`
(`Catalog::ExpireInventoryReservationsJob`, `Orders::EnterSettlementGraceJob`
every minute, `Core::ProcessOutboxJob` for the outbox drain) — otherwise
`Orders::ExpireCheckout` is never triggered in dev. That is local environment
config; the gap itself is the code path above.

**Fix (optional):** include the conflicting order id in the
`active_checkout_exists` 409 so the client can offer a restart, not just
"start fresh".

**Status: resolved 2026-09-30** — `Orders::ExpireCheckout` now reconciles an
elapsed-grace payment (`action: :reconcile_grace`) / releases the stale order
instead of raising, so the sweep no longer aborts. The residual "the 409 carries
no order id" ask (the optional fix above) is filed separately as **#58**.

### #43. RSVP rejects `access_code` / `invitation_token` → audience-gated RSVP is impossible

`Ticketing::PublicRsvpsController#create` permits only
`ticket_type_id, phone, verification_token, package_quantity,
selected_event_date_id, answers, consents`
(`app/controllers/ticketing/public_rsvps_controller.rb:98-110`) — there is **no**
`access_code` or `invitation_token`. `Ticketing::Rsvps::Submit` then delegates
with a hard-coded empty proof: `audience_proof: {}`
(`app/services/ticketing/rsvps/submit.rb:46`), so `Ticketing::Audience::Authorize`
(`app/services/ticketing/registrations/submit.rb:50-54`) fails for any ticket type
whose `audience != "public"`. Only the paid guest/auth registration endpoints
accept audience proofs (`registrations_controller.rb:22`,
`guest_registrations_controller.rb:28`).

**Why it blocks:** a free RSVP event whose ticket type is `access_code`,
`invitation`, or `code_or_invitation` cannot be registered for through the public
RSVP flow at all — the code/token is never accepted.

**Fix:** permit and forward `access_code` / `invitation_token` on both RSVP
endpoints and pass them through as `audience_proof` to `Registrations::Submit`.

---

### #53. Public event payload no longer exposes the non-admission detail fields

`Events::Public::EventSettingSerializer` now whitelists **only**
`%w[public_guest_limit]` (`app/serializers/events/public/event_setting_serializer.rb:8`),
and `EventDetailSerializer` carries no replacement attributes, so the
previously-public config keys have no source in the public API (grep of `app/`
confirms the strings are gone).

**Re-scoped 2026-10-02 — split into two groups:**

- **Superseded by the per-offer model (NOT a gap).** `event_type`, `access_mode`,
  `invite_only_paid`, `on_guest_list`, `invite_waitlist_only`, `waitlist_ahead`,
  `rsvp_going`, `rsvp_capacity`, `allows_plus_one`, `max_guests`,
  `rsvp_requirements`. The real admission contract is per-offer
  (`ticket_type.approval_mode` / `audience` / `waitlist_enabled` + `price_options`);
  the frontend must source gating from the offer, not from event config (see #44).
- **Genuinely lost non-admission data (real gap).** `age_restriction`, `seat_map`,
  `featured`, `rating`, `answer_edit_window_hours`, `price_foreign_from_minor`.
  No substitute exists: the event-detail Age info card, SeatMap step, and the
  discovery Featured/rating surfaces lose their data. `lineup` is tracked under
  #36 (needs a participants/artists surface, not just a config key).

**Why it blocks:** those event-detail modules can only render absent. ADR-0002
forbids fabricating them.

**Fix:** expose the non-admission public-safe fields on the detail serializer —
at minimum `age_restriction`, `seat_map` (and `lineup` via #36); decide explicitly
whether `featured` / `rating` / `answer_edit_window_hours` /
`price_foreign_from_minor` are part of the public contract.

**Status: open (re-scoped 2026-10-02) — filed 2026-09-30 (verified against
`326f6a3` by code read + live `GET /public/events/:slug` → `event_setting.config == {}`).**

### #56. Signup cannot take over an existing (shadow) phone

A guest checkout creates a **shadow `Core::User`** bound to the buyer's phone
(`Core::PhoneIdentity::ResolveGuest`; phone-confirmed, no password, unverified).
`POST /auth/signup` (`Core::AuthController#signup`) does `Core::User.new(phone:)`
then `user.save!`, so a phone that already owns a shadow user fails its uniqueness
validation and returns:

```
422 { code: "signup_failed", errors: ["Phone has already been taken"] }
```

There is **no distinct code** (nothing like `phone_taken`) and **no claim-on-signup**:
the only way to take over a shadow user is the registration-scoped
`POST /registrations/:id/claim_guest` (OTP + password), which the buyer can only
reach from their ticket. So after buying a ticket as a guest, "Create an account"
with that phone is a permanent dead end — exactly the reported "Phone has already
been taken".

**Also: signup has NO phone verification at all.** `Core::AuthController#signup`
(`user_params` permits `email, phone, password, password_confirmation`) saves the
user with no OTP — so any phone can be registered without proving ownership. On a
phone-first platform this is both a hijack hole and the root of the dead end
below: the phone a guest "confirmed" at checkout is likewise unproven
(`validate_guest_context!` accepts `phone_confirmation: true` with no OTP), so
signup and claim disagree about what "the phone" means.

**Fix:** make signup phone-verified and resolve the phone:
1. `POST /auth/signup` (or a two-step flow) OTP-verifies the phone, reusing
   `Core::PhoneVerification` (the same proof the claim/transfer flows use).
2. On a proven phone that already owns a **shadow** (no `password_digest`, no
   `verified_at`), **upgrade it** (set password + `verified_at`) and issue auth
   tokens — i.e. unify signup with the claim.
3. On a proven phone that owns a **real** account, return a distinct `422`
   `phone_taken` so the UI routes to log in.

This single change fixes "Phone has already been taken" after a guest purchase
AND removes anonymous phone signup.

**Status: open — filed 2026-09-30 (code read + reported UX).**

### #57. No password reset / forgot-password

`config/routes.rb` exposes only `auth/login|signup|refresh|logout|reauthenticate|me`
and `auth/phone_verifications`. There is **no** forgot/reset/change-password
endpoint, and password is only ever *set* inside the shadow-user upgrades
(`Ticketing::Registrations::ClaimGuest`, `Ticketing::Transfers::AcceptGuest`). A
real account that forgets its password has no recovery path.

**Fix:** a phone-OTP reset reusing the existing `Core::PhoneVerification` infra:
`POST /auth/password_reset/request_otp { phone }` → challenge, then
`POST /auth/password_reset { phone, verification_token, password,
password_confirmation }` → sets the password on the (real) account and returns
auth tokens. Refuse when the phone belongs to an unverified shadow (that case is
the claim flow, #56).

**Status: open — filed 2026-09-30 (route grep).**

### #59. Invitation link — frontend contract done; the dev sender is SETUP, not a gap

**Reclassified 2026-10-02 — this is NOT a backend code gap.**

The app owns the deep-link contract and already implements it:
`/events/:slug` reads `?invitation=<token>` (also `?invitation_token=`) and passes
it as `invitation_token` to `POST /ticketing/audience_authorizations` and to
`admission_selections` (`audience_proof.invitation_token`). The backend already
**accepts** that token — `Orders::AdmissionSelectionEnvelope::PUBLIC_PROOF_FIELDS
= %w[access_code invitation_token]` and the audience controller maps it
(`Ticketing::Audience::Authorize#authorize_invitation`). Verified live:
`origins-2?invitation=<token>` auto-unlocks.

What was previously filed as "no link format" is really two non-gaps:
1. **Link format** — the app defines it (`<app>/events/<slug>?invitation=<token>`).
   Nothing for the backend to invent; whoever composes the invitation message
   (the configurable sender) just appends the token to that URL.
2. **Delivery in dev** — `Ticketing::DeliverInvitationJob` calls
   `config.x.invitation_delivery_sender`, which is unset in dev (an initializer
   installs a no-op default, `config/initializers/ticketing_outbox_handlers.rb:5`,
   so it does not literally "return early" — it calls a no-op). Setting a dev
   sender is **environment setup**, which the gap rules explicitly exclude.

**Setup note (record in dev setup, NOT here):** a dev
`invitation_delivery_sender` (e.g. log the composed link) makes the
`audience=invitation` flow exercisable end-to-end. Production configures a real
sender.

**Evidence:** `app/services/ticketing/invitations/create.rb`;
`app/jobs/ticketing/deliver_invitation_job.rb:14`;
`config/initializers/ticketing_outbox_handlers.rb:5`; no `invitation_delivery_sender`
in `config/environments/development.rb`. Frontend build note:
`.scratch/invite-only-audience/issues/01-invitation-token-wiring.md`.

**Status: frontend-fixable / setup — reclassified 2026-10-02 (filed 2026-10-01).**
Removed from the open-gap count; the frontend half is built and the backend already
accepts the token.

### #60. Chapa payment amount is sent 100× too large (minor units, not the provider's major unit)

`Payments::Providers::ChapaClient#payment_payload` sends the amount as the raw
minor value:

```ruby
# app/services/payments/providers/chapa_client.rb:142
amount: integer_amount(request.fetch(:amount_minor)),   # returns amount_minor unchanged (:307-312)
```

But Chapa's API expresses `amount` in the **currency's major unit** — the
adapter's own response parsing proves it: `provider_fee_minor: minor_amount(...)`
multiplies the provider's `charge`/`service_fee` by 100 (`chapa_client.rb:230`,
`minor_amount` at `:324-328`). So every payment is posted 100× too large.

**Evidence (live, 2026-10-01):** a guest payment for an order totalling
**153,750.00 ETB** (`amount_minor = 15_375_000`) produced a Chapa hosted page whose
`data-page` props contain `"amount":15375000,"currency":"ETB"` — i.e. Chapa reads
**15,375,000 ETB**. Paying then fails with *"amount is greater than the maximum
amount supported by the currency."*

**Why it matters:** every paid checkout sends 100× the order total to Chapa. In
test mode the test bank ignores the amount, so small orders appear to work while
still being inflated; in production this is a 100× overcharge. Only large orders
surface it, via Chapa's max-amount check.

**Fix:** convert minor → major before sending, in `payment_payload` (`:142`):

```ruby
amount: format("%.2f", BigDecimal(amount_minor) / 100)
```

Also check the refund path (`:64`) — confirm whether Chapa refunds expect major or
minor before changing it. Add a request-shaping test asserting the initialize
payload amount for a known `amount_minor`.

**Status: open — filed 2026-10-01 (live repro on the Chapa hosted page).**

### #65. Seller payout dispatch is rejected by the provider (`invalid_format`) — no payout ever succeeds

The seller payout **API** works end-to-end (create → `pending`, list/show), but the
**dispatch** (`Marketplace::DispatchSellerPayoutJob` → `Marketplace::DispatchSellerPayout`
→ `Marketplace::PayoutProviders::ChapaAdapter#payout`) always ends in provider
rejection. The payout reaches a terminal `failed` with `failure_code` from Chapa.

**Live drill 2026-10-02 (real backend `f679e56`, `CHAPA_ENABLED=true` +
`CHAPA_PAYOUT_ENABLED=true`, `CHAPA_MODE=test`):** a seller with a verified
destination (`bank_slug: "test"`, "Test Bank" — the only rail the test provider
`GET …/payout_accounts/destinations` returns) and a positive balance:
`POST /marketplace/seller/payouts` → `pending` → (worker) `processing` → **`failed`,
`failure_code: "invalid_format"`**, `provider_reference: null`. Reproduced twice
(after correcting the rail from `cbe` → `test`, the code moved `invalid_value` →
`invalid_format`). **No payout has ever reached `succeeded`.**

**Evidence:**
- Payload the client sends (`app/services/finance/payout_providers/chapa_payout_client.rb:21-38`):
  `amount: integer_amount(request.fetch(:amount_minor))` — the **raw minor integer**,
  unchanged (`:161-165`) — plus a nested `account: { account_number, account_name,
  bank_slug }`.
- `failure_code_for` (`:126-134`) passes the provider's `data.reason` / `error.code`
  through, so `invalid_format` is **Chapa's own error code**.
- Balance is correctly released on failure (the reservation is dropped).

**Hypothesis (needs backend/provider confirmation):** the same minor-vs-major family
as **#60** (the amount is posted 100× / in the wrong unit), and/or the payout payload
field names don't match Chapa's V2 payouts contract. It may also be a test-mode
capability/funding limitation — the existing tracker note (G-26) already says
test-mode payout *transfer* evidence was still outstanding.

**Why it blocks:** the payout feature can create and track a payout but the money can
never move; the frontend can only render the resulting `failed` state.

**Fix:** align the Chapa V2 payout request with the provider contract (amount unit +
field names) and obtain a `succeeded` test-mode payout as evidence; add a
request-shaping test asserting the `/v2/payouts` payload.

**Status: open — filed 2026-10-02 (live drill; provider returns `invalid_format`).**

## Open — degrading

Work but suboptimal; the frontend mitigates. Fixing these improves correctness.

### #66. Seller listing wire omits `ticket_id` — the wallet can't tell which tickets are already listed

`Marketplace::ResaleListingSerializer`
(`app/serializers/marketplace/resale_listing_serializer.rb:10-16`) exposes `id,
event_id, ticket_type_id, seller_user_id, status, …` but **no `ticket_id`**, and the
public serializer (`app/serializers/marketplace/public/resale_listing_serializer.rb`)
carries only event / product / ticket-type context. The association exists on the
model (`ResaleListing#ticket_id`, used by `ActivateListing#build_listing` and
`#lock_related_rows`) — it is simply not serialized. The wallet serializer
(`app/serializers/ticketing/ticket_wallet_serializer.rb`) carries no
active-listing reference either, so there is no other client-visible source.

**Why it matters:** the My Listings tab's "List a Ticket for Sale" picker should
hide tickets that already have an open listing (the backend rejects a second one
with `listing_already_open`, `activate_listing.rb:114`). It can only map a listing
→ wallet ticket by id, which the wire omits, so already-listed tickets still render
as listable and the seller only discovers the conflict after opening the sell
sheet and submitting.

**Fix:** add `ticket_id` to `Marketplace::ResaleListingSerializer` (or expose an
`active_resale_listing_id` / `resale_listing_status` on
`Ticketing::TicketWalletSerializer`). The seller scope already owns the ticket, so
this exposes nothing to buyers.

**Status: resolved 2026-10-05 (backend commit `360f9c7` added `ticket_id` to `Marketplace::ResaleListingSerializer` and policy `SELLER_FIELDS`; frontend wired in `src/lib/resale.ts` and `src/features/resale/pages/ResalePage.tsx`).**

### #67. `Core::UserProfile` requires mandatory `last_name` (`null: false` and presence validation)

In `Core::UserProfile` (`app/models/core/user_profile.rb:16`):
```ruby
validates :first_name, :last_name, presence: true, length: { maximum: 100 }
```
and DB migration `db/migrate/20261011090000_create_core_user_profiles.rb:8`:
```ruby
t.string :last_name, limit: 100, null: false
```
`Core::Signups::Complete` (`app/services/core/signups/complete.rb:126-130`) creates the profile by passing `first_name` and `last_name`:
```ruby
Core::UserProfile.create!(
  user: user,
  first_name: @attributes[:first_name],
  last_name: @attributes[:last_name]
)
```
If `last_name` is absent or empty, signup 422s with `errors: { "last_name" => ["can't be blank"] }`. Furthermore, `UserProfile#full_name` (`user_profile.rb:19-21`) joins both names:
```ruby
def full_name
  [ first_name, last_name ].compact.join(" ").gsub(/\p{Space}+/u, " ").strip
end
```

**Why it matters:**
In the Ethiopia market and globally, many users have only a single mononym or single name, or choose not to provide a distinct surname. The consumer UI presents a single "Name" field during signup and treats "Last Name" as optional in settings. Because the backend strictly mandates a non-null, present `last_name`, the frontend must apply a mitigation: duplicating single names (`last_name: first_name`) on submission, and then deduplicating `"FirstName FirstName"` back to `"FirstName"` when reading the wire response.

**Fix for backend dev:**
1. Migration: Change column constraint `change_column_null :core_user_profiles, :last_name, true`.
2. Model: Remove `:last_name` from presence validation (`validates :first_name, presence: true, length: { maximum: 100 }; validates :last_name, length: { maximum: 100 }, allow_nil: true, allow_blank: true`).
3. `full_name`: Already uses `[ first_name, last_name ].compact.join(" ")` which naturally produces just `first_name` when `last_name` is `nil` or empty.

**Status: open — degrading (filed 2026-10-14; frontend mitigates via `splitFullName` and `toAuthUser` display deduplication).**


### #68. Public event payload exposes no recurrence / series signal — the recurring consumer UI is unbuildable

The backend **models recurrence fully**: `Events::RecurrenceRule`
(`app/models/events/recurrence_rule.rb`, table `events_recurrence_rules`),
the `Events::Recurrence::{Configure,Materialize,Activate,Deactivate}` services
(`app/services/events/recurrence/*.rb`, all four present), and
`MaterializeRecurrenceJob` (`app/jobs/events/materialize_recurrence_job.rb`)
expand an RRULE into concrete `events_event_dates` rows tagged
`source_key LIKE "recurrence-<rule_id>-%"` (`recurrence_rule.rb:27-31`). An
organizer-side API exists (`Events::RecurrenceRulesController`,
`config/routes.rb:108` `resource :recurrence_rule`, only: show/create/update/
destroy) with `Events::RecurrenceRuleSerializer` (`id, event_id, rrule,
timezone, dtstart_local, duration_seconds, generated_until, active, exdates,
rdates, …`).

**But the consumer payload carries none of it.** Live probe (2026-10-15) of
`GET /public/events/<slug>`:
- top level: `id, title, slug, description, visibility, timezone, currency,
  published_at, created_at, categories, event_dates, event_media,
  event_organizations, event_setting, organization` — **no `recurrence` /
  `is_recurring` / `series` field**;
- `event_dates[]`: `id, name, doors_at, starts_at, ends_at, status, venue` — the
  date serializer's `source_key`
  (`app/serializers/events/event_date_serializer.rb:12`) is **not** in the
  public projection, so materialized recurrence dates are indistinguishable
  from hand-added ones.

**Why it matters:** the ported web2 recurring UI (weekly series carousel,
session grouping, per-session waitlists, the `recurring` `FormatTag`) cannot be
wired without inventing the series (ADR-0002), so it stays parked. The consumer
can only flatten a series into a plain list of dates, and
`EventCard.cardFormat()` never returns `recurring`.

**Fix (backend):** expose a series signal on the public payload — e.g.
`recurrence: { rule_id, rrule, active }` (or `is_recurring`) on
`EventListSerializer` / `EventDetailSerializer`, and surface `source_key` (or a
`series_id`) on the public `event_dates[]` so the client can group sessions.

**Status: open — degrading (filed 2026-10-15; frontend renders multi-day as a flat day list — no invented series).**

**Frontend follow-up (tracked):** `.scratch/recurring-ui/` — spec + ticket
`01-recurring-session-wireup.md` (queued, `needs-triage`), to wire the session UI
once this resolves.


### #54. Discovery availability has no backend source

`EventListSerializer` (`app/serializers/events/public/event_list_serializer.rb`)
exposes `price_from_minor` but **no availability**: the old `sold_out` /
`tickets_left` config keys are gone (#53), and per-offer availability lives only
on `GET /public/events/:slug/products` (a boolean per product, one request per
event). So the discovery grid cannot show a Sold Out / "N left" state without an
N+1 per-card fetch.

**Why it degrades:** the `EventCard` sold-out badge and the low-tickets chip lose
their only source; events on the grid can't signal availability.

**Fix:** a batched availability projection on the list endpoint (e.g.
`sold_out` / `has_available_offer` per event), or a `GET /public/events?ids=`
availability batch.

**Status: open — filed 2026-09-30 (verified against `326f6a3`).**

### #55. `EventDetailSerializer` omits `price_from_minor` — FRONTEND-FIXABLE (not a backend gap)

`EventListSerializer` computes `price_from_minor` (over active ticket products)
but `EventDetailSerializer` does not
(`app/serializers/events/public/event_detail_serializer.rb`). The detail page can
already derive the "from" price from `GET /public/events/:slug/products`
(`price_options[].amount_minor`, min) — a surface the detail page fetches anyway
for the offers — or reuse the list payload's `price_from_minor`.

**Fix (optional, convenience only):** mirror `price_from_minor` onto the detail
serializer to save the second request. Not required.

**Status: frontend-fixable — IMPLEMENTED 2026-10-03.** The detail page already
derives it: `useTicketPricing` computes `minPrice` from the loaded products and
`PurchaseBar` renders "From {minPrice}" when no tier is selected
(`PurchaseBar.tsx:27,60`). No work remained; closed as done.

### #41. A released order permanently burns its registration — RESOLVED 2026-09-30

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

**Status: RESOLVED 2026-09-30** — `db/structure.sql` now reads
`CREATE UNIQUE INDEX idx_one_order_item_per_registration ON public.orders_order_items USING btree (registration_id, order_id) WHERE (registration_id IS NOT NULL)`
(the migration was edited in place at `20260811090002_create_order_items.rb`), so a
released order no longer burns the registration for a retry. **Frontend done
2026-09-30: the "Discard & start fresh" `registrationModule.release` workaround
was retired** (the direct `register`/`guestRegister` methods went with the
`admission_selections` migration too).

### #42. Wallet resale policy omits the value a percentage cap is computed from — RESOLVED 2026-10-01

`Ticketing::TicketWalletSerializer` projects the resale policy
(`resale_enabled`, `resale_price_cap_type`, `resale_fixed_cap_minor`,
`resale_percentage_cap_bps`, cutoff, `max_completed_resales`) but **no
acquisition/face value**. For a `percentage` cap the ceiling is
`current_acquisition_product_value_minor × bps / 10000` (=
`Marketplace::CalculatePriceCap`), so the seller UI cannot know the allowed
range. The fixed-cap case is expressible (the cap is the number itself); the
percentage case is not.

**Why it degrades:** `SellTicketSheet` defaults the asking price to 2000 ETB and
only validates a *fixed* cap. Verified live on `on-on` (100% cap on a 1025 ETB
acquisition): asking 2000 ETB → `422 asking_amount_exceeds_cap`; asking 1000 ETB
→ `201`. The seller only learns the ceiling from the error and must guess
(no price engine is allowed on the frontend). The FE now states the rule
("Capped at N% of your purchase price") but cannot enforce it.

**Fix:** expose the cap basis (or the resolved cap) alongside the resale policy
on the wallet ticket — e.g. `resale_acquisition_product_value_minor` and/or a
resolved `resale_price_cap_minor`. A resolved cap keeps the money math
server-side (the Marketplace-owned `CalculatePriceCap`), which the module
dependency rules require, since Ticketing must not depend on Marketplace.

**Status: resolved 2026-10-01** — `Ticketing::TicketWalletSerializer` now serves
`resale_price_cap_minor`, the cap resolved server-side through
`Marketplace::CalculatePriceCap` (`d7aa4ff`, upstream `ed6309a`; gated to active
paid tickets in the event currency). **Frontend wired:** `tickets.ts` maps it to
`resalePolicy.priceCapMinor`; `SellTicketSheet` now enforces/displays the resolved
amount for both fixed and percentage caps (falling back to the old percent-rule
text only when the field is absent).

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

**2026-09-18 update — the hardcoded slugs are all rejected, so a payout method
cannot be added at all (live-probed):**
- Chapa's live `GET /v2/payouts/banks?country=ET` (test key) returns **one**
  bank: `{ bank_slug: "link", bank_name: "Link", type: "store_value" }`.
- `Marketplace::SellerPayoutAccount::TYPES == ["bank"]`, so Telebirr's
  `type: "mobile_money"` → `422 payout_account_input_invalid`.
- `bank_slug` `cbe`/`boa` → `422 payout_account_bank_unsupported`.
- `type: "store_value"` (Link's own rail) → `422 payout_account_input_invalid`.
- **Only `type: "bank"` + `bank_slug: "link"` creates** (verified → `201`,
  `pending_verification`).

So the frontend's `KIND_ACCOUNTS` (`telebirr`/`cbe`/`boa`) can never succeed
against this backend/provider, and the sole working destination is Chapa's
`link` rail. Two backend-side issues combine: the `TYPES` allow-list is narrower
than the provider's own `type` values, and there is no discovery endpoint.

**Status: open — verified 2026-09-18 (live 422/201 pair + serializer read).**
This is a **backend product change** (new endpoint + widened `TYPES` + migration
/ constraint), so the backend developer must make it — see the rule in
`AGENTS.md`. A local, uncommitted implementation exists in `digis_backend`
(`seller_payout_accounts_controller#banks`, `TYPES` widened, `config/routes.rb`,
migration + `structure.sql`), but an uncommitted local patch does **not** resolve
a gap; only the backend dev's committed change does.

**Needed from the backend dev:**
- `GET /marketplace/seller/payout_accounts/banks` (seller-scoped) returning the
  provider's destinations (`bank_slug`, `bank_name`, `type`, …).
- Widen `Marketplace::SellerPayoutAccount::TYPES` to the provider's own rail
  types (`bank`, `mobile_money`, `store_value`), keeping
  `marketplace_payout_accounts_type_check` in sync.

**Frontend state:** currently wired to that endpoint (`src/lib/payout.ts` fetches
the list instead of hardcoding slugs) — the payout-methods flow therefore depends
on this gap landing.

### #8. `UserAuthSerializer` lacks `name`; no `Core::User.name` column

`Core::UserAuthSerializer` returns `id, email, phone, verified_at, created_at,
updated_at, permissions` only (`app/serializers/core/user_auth_serializer.rb:3`)
— no `name`. `Core::AuthController#user_params` permits only
`email, phone, password, password_confirmation`
(`app/controllers/core/auth_controller.rb:141-148`), so the `name` the signup
form now sends is silently dropped by `permit` (Rails logs an unpermitted
param; it does not 400). Frontend still derives a display name from the email
local-part / phone until the server field lands.

**Why it blocks:** the signup form collects a real **Full name** field and sends
`name`; the backend discards it, so every account loses the name the user
typed. Display name is then a fabricated email-local-part/phone derivative.

**Fix:** add a `name` column to `core_users` and `name` to
`Core::UserAuthSerializer`, and permit `:name` on signup (optionally require it).

**Status: open — blocking (filed 2026-09-09; the signup form now sends `name`
as of 2026-09-19, verified against `auth_controller.rb:141` + the serializer).**

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
  (`app/models/catalog/event_product.rb`). **Update 2026-09-21:** this IS now
  enforced on the online path — `Catalog::Inventory::Reserve#validate_sales_window!`
  (`app/services/catalog/inventory/reserve.rb:62-66`) runs for every item via
  `CreateCheckout#reserve_inventory!` (`create_checkout.rb:256-269`), for both
  authenticated and guest checkout. It blocks at order creation (surfacing as
  `inventory_unavailable`), not at quote. `BuildQuote` still ignores it.
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
(or the requested event_date has passed / is `completed`/`cancelled`). The
`sales_end_at` half is already enforced at order creation (see above), so what
remains is the event-date gate. Optionally auto-mark dates `completed` when
`ends_at` passes and/or filter `publicly_visible` to events with a future date.

**Status: open (partial) — re-verified 2026-09-21.** The product sales window is
enforced online; the event-date / `completed` gate is still absent, so a
finished published event remains quotable and payable.

### #1. Public `event_setting.config` projection truncated to 2 keys

`Events::Public::EventSettingSerializer` whitelists only
`%w[allow_waitlist public_guest_limit]`
(`app/serializers/events/public/event_setting_serializer.rb:8`). The frontend
`src/lib/events-adapter.ts` consumes 17 config keys for discovery: `featured`,
`rating`, `sold_out`, `tickets_left`, `price_foreign_from_minor`,
`foreign_currency`, `event_type`, `seat_map`, `answer_edit_window_hours`,
`rsvp_going`, `rsvp_capacity`, `allows_plus_one`, `max_guests`,
`rsvp_requirements`, `access_mode`, `invite_only_paid`, `on_guest_list`. Absent
keys render **absent** (ADR-0002): no featured ordering, no Sold Out badge, no
ratings, no seat map, no RSVP capacity/going counts.

**Why it degrades:** the frontend cannot source the discovery config the design
uses; those surfaces collapse to their empty/absent state.

**Fix (backend):** widen `PUBLIC_CONFIG_KEYS` to the 17 public-safe keys the
frontend consumes (or expose a dedicated public config projection).

**Status: open — re-filed 2026-09-21.** It had been recorded resolved on the
strength of a **local-only commit of ours** (`648d21d`, which widened the
whitelist to 19 keys) that is **not on the backend branch** (`origin` still has
the 2-key whitelist). A patch of ours does not resolve a gap (see `AGENTS.md`);
that change has been reverted.

### #44. Event-level `event_setting.config` type/access keys are inert and unwritable

`event_type`, `access_mode`, `invite_only_paid`, `rsvp_going`, `rsvp_capacity`,
`allows_plus_one`, `max_guests`, `rsvp_requirements` are written only by dev seeds
(`db/seeds_events.rb:587-599`, `db/pazimo_seed.rb:63,117-121`) and are **never read
by any application code** — the only real gates are
`ticketing_ticket_types.audience` / `waitlist_enabled` / `approval_mode` and
whether a product has a zero-amount price. There is **no API to read or write**
`event_setting.config` (`Events::Create` writes `{}`; no EventSetting controller),
and the two keys the public serializer *does* expose (`allow_waitlist`,
`public_guest_limit`) are themselves never seeded or enforced.

**Why it degrades:** the consumer frontend cannot distinguish `rsvp` /
`inviteOnly` / `ticketed`, nor show going/capacity/plus-one — the event-level
config is decorative. (See also #1: the public serializer strips it entirely.)

**Not frontend-fixable (corrected 2026-10-02):** the frontend *already* ignores
this dead config — `backendEventToEvent` (`src/lib/events-adapter.ts:85-148`) maps
no config keys, and `eventActionLabel()` is a constant (`src/lib/eventAction.ts`);
admission is sourced per-offer from `GET /public/events/:slug/products`. So there
is no frontend fix to make. Only the backend can resolve it: wire the keys
(read + enforce + make organizer-writable) or delete them.

**Fix:** decide whether the event-level type/access model is real. If yes, compute
and expose it (extend `PUBLIC_CONFIG_KEYS`, read it in the RSVP/invite gates) and
make it organizer-writable. If no, drop the inert keys so they stop implying a
contract.

### #45. RSVP has no sold-out signal or waitlist fallback; `rsvp_capacity` ignored

RSVP capacity is enforced only implicitly by `Catalog::Inventory::Reserve`
(`app/services/ticketing/registrations/support.rb:32-40`); a full RSVP surfaces as
a generic reserve failure, not a dedicated `rsvp_capacity_reached`, and nothing
enqueues the attendee into a waitlist (`Ticketing::Rsvps::Submit` has no
waitlist branch). `rsvp_capacity` (event config) is ignored; `public_guest_limit`
is exposed but never enforced; there is no public going/capacity counter.

**Why it degrades:** the UI cannot honestly show "full" or offer a waitlist — the
RSVP section currently renders "At capacity · Waitlist open" with no action.

**Fix:** return a dedicated full/capacity code and, when `waitlist_enabled`,
auto-enqueue (or expose capacity/going counts so the frontend can render
honestly). Related: #37 (no public waitlist-join endpoint).

### #46. No saved-events / favourites, home feed, reviews, or social graph

`POST/DELETE /events/:id/save` + `GET /saved_events` do not exist (no
saved/wishlist/favourite table). The **`GET /feed` route is declared but broken**:
`config/routes.rb` points it at `core/feed#index`, yet there is **no
`app/controllers/core/feed_controller.rb`**. There is no consumer review/rating
endpoint (`core_reviews` is the organizer-verification workflow), and no
user-to-user follow/friends/suggestions (follows are one-directional to
`venues|artists|organizations` only).

**Frontend today:** the event hero heart is local-only (`EventDetailPage.tsx`),
and Profile/RSVP render fabricated "suggested friends" (now removed) — nothing
persists.

**Fix:** a saved-events table + routes; implement `Core::FeedController` (or drop
the route); a consumer reviews endpoint; optional social graph.

### #47. No gift-ticket endpoint

There is no `POST /tickets/:id/gift` or gift-claim flow anywhere in the backend.
`GiftTicketDialog.tsx` fabricates a client-side `#gift/<id>` link and its `onSend`
is never invoked — a re-skinned transfer with a dead link.

**Fix (if the product wants gifting):** a gift command + a public claim flow
(like transfers), or remove the gift entry point.

### #48. No consumer account preferences, 2FA, or password change/reset

No user-preference surface (language/currency/region), no 2FA (enroll/verify/
disable, recovery codes), and no password change/forgot/reset. `GET /auth/me` is
read-only and `Core::User` has no name/photo/preferences columns (see #8, #9).
Settings renders language/currency/region pickers, a "Public profile" toggle, a
2FA sheet, and a disabled "Change password · Coming soon" row — all local-only.

**Fix:** `PATCH /auth/me` (with name/photo/preferences — #9), password-change +
reset endpoints, and a 2FA surface if required.

### #49. `GET /public/events` has no search/filter/sort/pagination

`Events::PublicEventsController#index` applies no query/category/city/date/price
filters, no sort, and no `Core::Pagination` — it returns the full set ordered
`published_at desc`. There is also no `GET /organizations/:id/events`,
`/artists/:id/events`, or `/venues/:id/events`.

**Frontend today:** discovery search/filter/sort runs client-side over a single
page (`useEventFilter.ts`), so it silently misses events beyond page one.

**Fix:** server-side query/category/city/date/price/sort + pagination on the
public events index; events-by-followable endpoints.

### #50. Wallet & history gaps

`TicketWalletSerializer` omits the ticket's **registration answers and edit
window**, so `EditTicketAnswersDialog` can never open for a live ticket (the
backend *does* expose `POST /registration_answers/:id/revise`, but the wallet
carries no answer ids/window). It also has no per-ticket `can_transfer` /
`can_resell` / `can_cancel`. Separately there is no `GET /orders`,
`GET /registrations`, `GET /tickets/:id`, `GET /ticket_transfers` (incoming), or
`GET /credential_claims` (pending), and no `GET /notifications/unread_count` /
`POST /notifications/read_all`.

**Fix:** project answers + `answers_editable_until` + capability flags on the
wallet serializer; add buyer-scoped list endpoints; add unread-count/mark-all.

### #51. No events-by-followable; no profile stats

**Corrected 2026-09-21.** The public DETAIL endpoints *do* carry stats/socials —
`GET /organizations/:id` exposes `description`, `social_links`, `events_count`,
`follower_count`, `verified`, `is_following`; `/venues/:id` and `/artists/:id`
expose `is_following` too. The event payload's organization summary is minimal by
design. The frontend now fetches the organization profile and wires follow/unfollow
(`src/lib/organizations.ts`, `src/lib/follows.ts`).

What remains genuinely missing:
- **event history per followable** — there is no `GET /organizations|venues|artists/:id/events`
  (see #49), so the organizer/venue/artist "upcoming/past" lists cannot be sourced;
  the fabricated lists were removed.
- **venue stats/amenities** — `VenueSummarySerializer` has no media/coords (#36);
  the venue sheet's followers/amenities/history were fabricated (still to remove).
- **profile gamification** — ProfilePage's tier/XP/events-attended/total-spent/
  achievements have no backend surface at all (product decision).

**Fix:** events-by-followable (#49); venue media/coords (#36); decide gamification.

### #52. Venue/artist detail omit `is_following` — FRONTEND-FIXABLE (not a backend gap)

`GET /venues/:id` (`app/serializers/events/public/venue_detail_serializer.rb:5-8`) and
`GET /artists/:id` expose the profile (description, socials, media, coords,
`follower_count`) but **not `is_following`** — only
`Organizations::Public::OrganizationDetailSerializer` has it
(`organization_detail_serializer.rb:13,24-26`). The follow write-path works for
all three (`POST|DELETE /:type/:id/follow`, type `venues|artists|organizations`,
`config/routes.rb:68-73`) and returns `{ following, follower_count }`.

**Correction 2026-10-02:** this is **derivable from an existing surface** —
`GET /users/:id/following` (`config/routes.rb:469`, `Core::FollowsController#following`,
self-scoped) returns the current user's `Core::Follow` rows
(`followable_type`/`followable_id`, `follow_serializer.rb`). The frontend can match
the venue/artist id to read back follow state. Caveat: that list caps at 25 unless
paginated (`follows_controller.rb:31`), so large follow sets need pagination.

**Fix (optional, convenience only):** add
`attribute :is_following { object.followed_by?(instance_options[:current_user]) }`
to the venue + artist detail serializers (mirroring the organization one). Cleaner,
but not required.

**Status: frontend-fixable — reclassified 2026-10-02.** Removed from the open-gap
count; the frontend can read follow state via `GET /users/:id/following`.

### #58. `active_checkout_exists` 409 carries no order id → the client can't resume or discard the open checkout

When `POST /public/events/:slug/admission_selections` finds an existing
`draft`/`pending_payment` order for the same buyer+event,
`Orders::CreateCheckout#active_checkout_conflict!`
(`app/services/orders/create_checkout.rb:104-108`) aborts with a **409
`active_checkout_exists`** whose body is only `{ success:false, error, code }` —
**no `order_id`**. There is no buyer-scoped order lookup either:
`config/routes.rb` exposes `resources :orders` as `only: :create` plus the member
`restart` / `payment_attempts` actions — no index or show. The one recovery route,
`POST /orders/:id/restart`, needs the id the client was never given.

**Why it matters:** #40's sweep fix means this is no longer a permanent lock —
abandoned checkouts now expire. But for the length of the hold (10 min, longer
while the sweep catches up) the buyer sees only a dead end. The frontend conflict
sheet can offer "View Tickets" and nothing else; it cannot resume the open
checkout or start fresh, even though the rest of the flow supports resume.

**Fix (preferred — composable):** when the dispatcher hits an existing active
order for the buyer+event, don't 409 — return it as the selection outcome
(`next_action: checkout_required` with that `order_id` + `expires_at`). The
replay store already models this for same-key replays; extend it to the
buyer+event case so a resumed submit stays idempotent.

**Fix (minimal):** include `order_id` (and `checkout_url` / `expires_at` when
known) in the 409 payload so the client can offer **Continue checkout** (open the
hosted page) or **Restart**.

**Evidence:** `app/services/orders/create_checkout.rb:104-108`;
`app/controllers/orders/admission_selections_controller.rb:64-83`;
`config/routes.rb` (orders member-only).

**Status: open — filed 2026-09-30 (frontend does not change backend code).**

### #61. A pending ticket transfer is invisible to the recipient in-app

When a sender initiates a transfer, the recipient is identified (`transfer.to_user`)
and the ticket is held `pending`, but there is **no in-app signal and no way to
list it**:

- The only notification is `transfer_received`, produced by the messaging handler
  for `ticketing.ticket_transfer.accepted` — i.e. **only after the recipient
  accepts**. `ticketing.ticket_transfer.initiated` is not in
  `Messaging::OutboxHandlers::PublishTransactionalNotification::EVENT_TYPES`.
- The initiation signal is the claim link sent by `Ticketing::TicketTransferDeliveryJob`
  through the SMS/email adapters — in dev the messaging provider registry holds
  **only `in_app`**, so no link is sent.
- There is **no endpoint to list incoming transfers**: `config/routes.rb` exposes
  `resources :transfers, only: :create` plus member `accept`/`decline`/`cancel`
  and the public token routes — no index scoped to `to_user`.

**Evidence (dev DB 2026-10-01):** one transfer `pending` to `+251900123456`
(verified account, has password, token present), yet zero `transfer_received`
notifications exist. A logged-in, verified recipient has no way to discover or
accept the transfer without the (undelivered) link.

**Why it degrades:** the recipient reasonably expects to see "someone sent you a
ticket" in the app. Today they see nothing.

**Fix (pick one/and):**
1. Add `GET /tickets/transfers?status=pending` scoped to `to_user` so the wallet
   can show incoming transfers (the recipient is already the resolved owner, so
   this needs no secret token).
2. Emit an in-app notification on `ticketing.ticket_transfer.initiated`
   (recipient = `to_user`) with an accept action, so the recipient is notified
   even when SMS/email isn't configured.

**Status: open — filed 2026-10-01 (dev-DB audit).**

### #62. A pending (unaccepted) outgoing transfer is invisible on the sender's wallet ticket

`Ticketing::Transfers::Initiate` deliberately keeps the ticket owned and
`active` until the recipient accepts ("Pending transfers do not change ownership
or credentials; only authenticated recipient acceptance does"). So for the whole
7-day window the sender's wallet still shows the ticket — but **nothing marks it
as "transfer pending"**: `Ticketing::TicketWalletSerializer` projects no transfer
state (no `pending_transfer`), and the ticket status stays `active`.

**Why it degrades:** the sender sees a normal-looking, still-usable ticket and
can't tell a transfer is outstanding. They may resell/scan it (resale is blocked
server-side with `pending_transfer`, but the QR/use path and the UI give no
hint), and once the recipient accepts the credential is replaced under them.

**Fix:** expose the pending-transfer state on the wallet ticket — e.g.
`pending_transfer: { id, to_user_id, expires_at }` (null when none) — so the UI
can render "Transfer pending" and gate transfer/resale/QR for that ticket. The
data already exists (`ticket.ticket_transfers.pending`); it just isn't projected.

**Status: open — filed 2026-10-01 (reported by the user; code read).**

### #63. `admission_selections` is ticket-only → a ticket + extra cart is rejected

`Orders::AdmissionSelections::Create#validate_selection!`
(`app/services/orders/admission_selections/create.rb:195-197`) aborts with
`product_unavailable` unless **every** item's product is a ticket
(`product.ticket? && product.ticket_type.present?`). But the main checkout folds
selected extras (parking/merch/food) into the same selection:
`useCheckoutFlow.buildSelectionInput` builds `items: [ticketItem, ...addOnItems]`
(`src/features/checkout/hooks/useCheckoutFlow.ts:416-420`). So on an event that
serves extras (`chapa-test-event` in the dev seed), selecting a ticket + an extra
and paying fails `product_unavailable` — the extras step can never complete.

**Why it degrades:** the composable selection is the one checkout path, but it
can't carry add-ons, so "ticket + parking" is un-buyable in one order.

**Fix (pick one):**
1. Let `admission_selections` accept non-ticket add-on items (validate them as
   purchasable add-ons instead of tickets) so one selection → one order, matching
   the composable model; or
2. Confirm add-ons are always separate orders — then the frontend removes the
   main-checkout extras step and buys extras via the extras-only flow
   (`ExtrasOnlyCheckout`, which uses the legacy quote→order endpoints) after the
   ticket.

**Evidence:** code read 2026-10-01; live products probe shows only
`chapa-test-event` currently has available extras.

**Status: resolved 2026-10-05 (backend commits `b157e36`, `d5a8320` implemented G-41 mixed ticket + add-on checkout; frontend wired in `src/lib/admission.ts` and `src/features/checkout/hooks/useCheckoutFlow.ts`).**

### #64. Wallet ticket omits the acquisition (sold) price — RESOLVED 2026-10-01 (no longer needed)

`Ticketing::TicketWalletSerializer#resale_policy` computes the cap from
`object.current_acquisition_product_value_minor` (`calculate_resale_price_cap_minor`,
serializer lines ~48-57) but **never serializes that value**. So the frontend has
the resale *cap* (`resale_price_cap_minor`) but not the price the ticket was
actually sold for, and `SellTicketSheet` falls back to a hard-coded default
(`useState(2000)`), unrelated to the buyer's purchase.

**Why it degrades:** the natural default asking price is the acquisition price;
today the seller must type it blind.

**Fix:** expose the acquisition/face price on the wallet ticket — e.g.
`acquisition_product_value_minor` (+ `acquisition_currency`) or a
`paid_unit_amount_minor` — ideally also on the resale policy. The frontend then
defaults `SellTicketSheet`'s price to it.

**Note:** it is derivable on the client only for a `percentage` cap
(`cap × 10000 / bps`), not for a `fixed` cap, and that would be frontend money
math — so a served field is the right fix.

**Status: resolved 2026-10-01 — no backend change needed.** The frontend no longer
needs the acquisition field: `SellTicketSheet` defaults the asking price to the
served `resale_price_cap_minor` (the maximum allowed price), which is a valid,
server-provided default and equals the paid price under the standard 100% policy.
For non-100% caps the default is the cap (the max) rather than the exact paid
price — acceptable, and not worth a backend field.

### #49 addendum — no city aggregation

There is no endpoint returning cities (or events-by-city counts); `GET /venues`
filters by `?city=` but does not aggregate. The frontend derives cities
client-side from the loaded events (no counts). A `/cities` (or counts on the
venue list serializer) would be needed for a counted location picker.

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

**Local dev setup (2026-09-16) — environment config, NOT a backend gap.** Chapa
needs a public HTTPS host, so the **backend** is exposed through a **stable ngrok
dev domain** (Docker container `digis-tunnel-ngrok`: `ngrok/ngrok` →
`http host.docker.internal:3000 --url=https://<dev-domain>`). Two pieces of
**local dev config** (dev-only, uncommitted) make that work — they are setup
chores, not gaps:
- `config/environments/development.rb` → allow the tunnel hosts:
  `config.hosts << ".ngrok-free.dev"` / `".ngrok-free.app"` /
  `".trycloudflare.com"`. Without it Rails **403s** every tunnel request (the
  response is Rails' Host Authorization HTML page), so Chapa's callback/webhook
  never lands.
- `config/recurring.yml` → a `development:` block running the checkout-lifecycle
  jobs (see #40 *dev setup*). Without it `Orders::ExpireCheckout` never runs locally.

Provider/dashboard setup lives with the setup too: the webhook endpoint
(`POST https://<dev-domain>/payments/chapa/webhook`) and the **webhook secret
hash** are registered in the Chapa dashboard, and `.env.chapa` holds the keys
(`CHAPA_WEBHOOK_SECRET` is any random string you invent — the same value must be
saved in the dashboard). Both `CHAPA_CALLBACK_URL` and `CHAPA_RETURN_URL` point at
the tunnel host (V2 requires https on both).

Frontend side: no tunnel needed any more (V2 ignores `return_url`); Vite still
carries `server.host: true` + `allowedHosts` in `vite.config.ts`.

**Verified end-to-end with a real Chapa test payment (2026-09-16):** Chapa
delivered a signed `POST /payments/chapa/webhook` **from its own IP** →
`payment.success` → `processed` → payment `succeeded` (`provider_reference` =
Chapa's reference) → order `fulfilled` → **ticket issued**. Our side was also
proven independently by re-sending a correctly HMAC-signed webhook.

**Two caveats:**
1. ~~Quick-tunnel hostnames are **ephemeral**~~ — **resolved 2026-09-16** by
   moving to a **stable ngrok dev domain**, which survives restarts, so the
   dashboard webhook URL is set once. (With the earlier cloudflared quick tunnels,
   an expired hostname meant no webhook arrived — symptom: the payment succeeded
   on Chapa but nothing fulfilled.)
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

**Correction 2026-10-02 — split:** the **venue media/coords half is
frontend-fixable**: public `GET /venues/:id`
(`app/controllers/events/venues_controller.rb:6-7`, `venue_detail_serializer.rb:5-8`)
serves `latitude`/`longitude` and media, and `event_dates[].venue.id` is public,
so the frontend can hydrate the venue. Only the **event participants/artists
(lineup) half remains a backend gap** — there is no public event→artist link
(`events_event_participants` is auth-gated, `routes.rb:94`; `Events::Event` has no
`artists` association).

**Correction 2026-10-03 — the venue half is now SEED-BLOCKED, not frontend-fixable.**
Live verification (local `e6...`, authed `GET /venues` + `GET /venues/:id`): all 25
seed venues return **blank `latitude`/`longitude`, `gallery_urls == []`,
`profile_url == null`**. The API is correct; the seed never sets venue coords or
attaches media (`rg latitude|longitude db/seeds` → 0 hits). So wiring the fetch
cannot surface anything until the seed populates venue geo/media — a **seed task**,
not frontend wiring. The frontend keeps its name→coords stopgap
(`src/lib/utils/venueCoords.ts`) and should switch to `GET /venues/:id` once the
seed carries the data.

**Fix (backend, lineup only):** add `participants`/`artists` to the public event
serializers (or a public participants endpoint). Venue media/coords: no backend
change needed — **seed must populate coordinator lat/lng + photos**.

### #36 addendum — expose the participant→date link when the lineup goes public

The backend **already models per-day participants**:
`Events::EventParticipant` has `belongs_to :event_date, optional: true`
(`app/models/events/event_participant.rb:11-12`, `event_date_id` in its ransack
attrs) — a participant is either event-level (`event_date_id: null`) or pinned
to one `event_date`. So a real per-day festival bill is derivable from the
backend; only the public projection is missing.

Today the frontend compensates with a **client-side distribution**:
`resolveFestivalSchedule` round-robins the event roster across dates
(`src/lib/festival.ts`), so the festival "day lineup" and per-day "Special
guests" show an invented assignment (ADR-0002). When #36's public lineup surface
lands, it should carry each participant's `event_date_id` (or a per-date
`participants` array) so the client can drop the round-robin and let
event-level participants fall back to "all days".

**Status: informational (filed 2026-10-15; broadens #36, no separate number).**

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
| 7 (notifications) | `GET /notifications` + `POST /notifications/:id/read` live; TopBar bell wired. **Preferences now wired too** (2026-09-21): Settings renders per-channel toggles (in_app / email / sms) from `GET`/`PATCH /notification_preferences` | live HTTP 2026-09-08; preferences wired 2026-09-21 |
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
| 41 | Released-order registration burn fixed — `idx_one_order_item_per_registration` is now `(registration_id, order_id)` (in-place migration edit `20260811090002`) | `db/structure.sql` + migration 2026-09-30 (`326f6a3`) |
| 40 | `Orders::ExpireCheckout` no longer aborts the sweep on an elapsed-grace payment — it reconciles the grace payment (`action: :reconcile_grace`) / releases the stale order instead of raising `ExpiryFailure` | code read 2026-09-30 (`326f6a3`) |
| 39 | Payout discovery + rails — `GET .../payout_accounts/destinations` (collection) exists and `Marketplace::SellerPayoutAccount::TYPES = %w[bank mobile_money]` | `config/routes.rb:311-312` + model 2026-09-30 (`326f6a3`) |
| 34 | Event-date gate — `Orders::EventDateEligibility.error_for` now runs in `Orders::BuildQuote` (quote) **and** `Orders::CreateCheckout#validate_event_date_eligibility!` (order) | code read 2026-09-30 (`326f6a3`) |
| 33 | Guest order access — `Orders::ResolveGuestOrderAccess` prefers an `order_access_token` (`GuestOrderAccessToken`, purpose `orders.guest_order_access`) and only falls back to the quote token, so an accepted payment reconciles without re-decoding the (crossed/stale) quote token. `guest_payment_attempts` + `guest_payment_refresh` accept `order_access_token` | code read 2026-09-30 (`326f6a3`) |
| 43 / 45 / 37 | RSVP audience-proof + sold-out/waitlist — the unified `POST /public/events/:slug/admission_selections` accepts `audience_proof { access_code, invitation_token }`, a sold-out cart returns `next_action.type: "waitlist_available"` + `event_product_ids`, and the offer-scoped public waitlist (`/admission_offers/:product_id/waitlist` + `/request_otp`) exists | `config/routes.rb:121-128` + `Orders::AdmissionSelections::Create` 2026-09-30 (`326f6a3`) |
| 27 | **Superseded** — the public RSVP routes (`/rsvps`, `/rsvps/request_otp`) were deleted; free admission is now a `$0` `admission_selections` (`next_action: confirmed` / `issuing`). Frontend `registrationModule.rsvpRequestOtp`/`rsvpSubmit` are dead code | `config/routes.rb` (no `rsvps`) 2026-09-30 (`326f6a3`) |
| 1 | **Re-scoped, not widened** — the public projection is now `%w[public_guest_limit]`; the "widen to 17 keys" fix is moot and the lost non-admission fields are tracked as #53 | code + live `GET /public/events/:slug` 2026-09-30 (`326f6a3`) |

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