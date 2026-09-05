# Confirmed Backend Gaps (digis_backend)

> Every confirmed gap between what the frontend needs and what the backend provides,
> **verified against the actual backend code** (serializers, policies, controllers,
> routes). The frontend does NOT work around these (ADR-0002) — it mocks/defer/disables
> until the backend resolves them.
>
> Status key: `blocking` (frontend feature can't ship), `degrading` (works but
> suboptimal), `informational` (note for backend correctness), `RESOLVED` (fixed on
> `feat/launch-hardening-telemetry`, verified live 2026-09-03).
>
> Verified against live HTTP where noted; the rest verified by code read.

---

## Open — blocking

These are the items the frontend cannot ship a feature around. Each entry: what's
missing (file + fields), why it matters, and a concrete fix.

### #14. No guest checkout + unreachable `verified_at` (BLOCKING for new buyers)

`allow_guest_checkout` is documented in `COMPOSABLE_EVENT_PLATFORM_DATABASE_DESIGN.md`
but never implemented; the rejection path in `AUTHENTICATION AND IDENTITY ARCHITECTURE.md`
won. No consumer-side OTP/verify endpoint exists, so freshly signed-up users can
never reach `verified_at: present` and `RegistrationsController#create` rejects them
with `422 phone_identity_unverified`. Backend must pick (a) or (b) per the existing
entry text; until then nobody new can buy.

### #17. `cbe` is not a valid backend payment method (BLOCKING for the CBE Birr option)

Frontend `PaymentMethod = 'telebirr' | 'cbe' | 'card'`; backend
`Commercial::FeeComponent::PAYMENT_METHODS = %w[telebirr card bank]`. Selecting CBE
Birr → `422 invalid_payment_method`. Add `"cbe"` to the model, the
`chapa_adapter` capabilities, and any organizer-facing `payment_method` enums; the
frontend's CBE button is currently disabled as a workaround.

### #18. No buyer-scoped order/attempt read endpoint (BLOCKING for Chapa return)

`POST /orders/:id/payment_attempts` returns `PaymentSerializer { status, checkout_url }`
and the buyer is redirected to Chapa's hosted page. On return the frontend has no
endpoint to confirm completion (`routes.rb:110-113` — create/restart only). The
frontend works around this by polling `GET /tickets` until the issued ticket appears,
but the correct fix is a `GET /orders/:id` (or `GET /orders/:id/payment_attempts`)
endpoint scoped to the buyer.

---

## Open — degrading

Work but suboptimal. Frontend falls back to mock or local enrichment.

### #1. `event_setting.config` is whitelisted to `{}` for the public list

`Events::Public::EventSettingSerializer::PUBLIC_CONFIG_KEYS = %w[allow_waitlist public_guest_limit]`
strips `featured`, `rating`, `tickets_left`, `sold_out`, `event_type`, `seat_map`,
`rsvp_*`, `access_codes`, `invite_tickets`. Seed writes the full config; serializer
just doesn't project it. Frontend adapter falls back to mock for these fields.
Fix: expand `PUBLIC_CONFIG_KEYS` to a deliberate public projection.

### #13. Public events LIST lacks `price_from_minor`

`Events::Public::EventListSerializer` doesn't compute the min-active-price across
the event's products. `Catalog::ProductPrice` rows are seeded in integer cents;
the serializer just doesn't expose them. Discovery grid prices are still mock-fed.
Fix: add the `price_from_minor` attribute method to the list serializer
(`flat_map { |p| p.prices.active.map(&:amount_minor) }.min`).

### #3-nuance. `requires_ticket` not exposed on `Catalog::Public::EventProductSerializer`

Product `metadata: { requires_ticket: true }` JSONB exists in the seed but isn't
serialized. Extras gating ("this add-on requires a ticket line") is currently
read from the mock. Fix: project `metadata` (or just `requires_ticket`) on the
public product serializer.

### #19. No public registration-schema endpoint (FRONTEND-BLOCKED for slot-coord answers)

The backend validates answers against published `RegistrationFormVersion`
schemas, including `response_scope` (`registration` vs per-slot
`package_unit_number`/`admission_position`) and `form_version_id` (stale-version
detection). `routes.rb:119` exposes `registration_forms` only to organizer
auth. The frontend cannot learn schema keys/versions/scopes before submission,
so it sends `{question_key, value}` only — fine for single-line `registration`
scope, broken for per-admission-slot questions and any stale-version flow. Fix:
add a public `GET public/events/:event_slug/ticket_types/:ticket_type_id/registration_schema`
mirroring `Ticketing::Forms::ApplicableSchema`.

### #8. `UserAuthSerializer` lacks `name`; no `Core::User.name` column

`Core::UserAuthSerializer` returns `id, email, phone, verified_at, ...` only.
Frontend derives display name from email local-part. Fix: add `name` column
and serializer field if the product wants a real display name.

### #9. No self-service `PATCH /auth/me` or `PATCH /users/me`

Settings profile-edit UI is display-only. Add an auth-bounded update endpoint
guarded by `Core::Authorizable`; needs `name` column (#8) for the same payload.

### #10. No server-side signup validations (verified live 2026-09-03)

`Core::UserAuthenticatable` uses `has_secure_password validations: false` —
any 1-char password works, `password_confirmation` is silently ignored,
malformed phones accepted. Frontend gates locally (8-char min, E.164) but the
API is open. Fix: re-enable `has_secure_password` validations or add
explicit length/confirmation validators; add a phone format validation
(`+2519XXXXXXXX`).

### #12. No rate limiting on auth endpoints (no `rack-attack`)

Unlimited password guessing on `POST /auth/login` (and signup/refresh). 15-min
access tokens + refresh rotation are useless if the refresh token is
brute-forceable. Auth strength itself is solid (bcrypt, HMAC'd refresh tokens,
device-binding, no user enumeration, mid-window revocation). Fix: add
`rack-attack` with `5/minute` per IP + per identifier digest.

### #20. Audience gating — backend ready, frontend still local-only

`POST ticketing/audience_authorizations` (public, no auth) is live and
`Audience::Authorize` validates `access_code` / `invitation_token` correctly.
`RegistrationsController#create` accepts these as top-level params. The
`InviteOnlySection` unlock is still client-side only (any non-empty code
"unlocks") and the code is not threaded into registration. Frontend work
in progress; the backend contract is correct.

### #21. Paid registrations are never confirmed (BLOCKING for re-buying the same ticket)

`Ticketing::Registration` stays `pending_payment` forever after its order is
paid and fulfilled — nothing transitions it to `confirmed` (only
`Registrations::ConfirmFree` writes `confirmed`, for the free path). Since
`Submit#existing_active_registration` treats `pending_payment` as active, a
buyer who completed a purchase can never buy the same tier again: any new
submit with different content → `422 active_registration_conflict`, and the
frontend has no valid next step (same registration can't back a second order
item per `idx_one_order_item_per_registration`). The paid path issues from
the order item (`Issue#verify_order_item`, which needs only a fulfilled
order), so tickets work — but re-purchase is permanently wedged. Fix:
transition the registration to `confirmed` during `AcceptPayment` (or the
`orders.payment.fulfilled` handler) once its order is paid.

### #22. No buyer cancel for own pending registration (BLOCKING for "discard & start fresh")

When a checkout is interrupted (tab closed, payment failed, answers changed),
the buyer can only *continue* it (restart/resume while the order is still
`draft`/`pending_payment`). There is no buyer-scoped way to discard their own
pending registration and start over — `ReleaseCheckout`/`RestartCheckout`
close orders but leave the registration active, so a fresh submit still
conflicts. The frontend's "start fresh" therefore only works while a
restartable order exists; otherwise it can only offer View Tickets. Fix: a
buyer-bounded cancel (or release) for own `pending_payment` registrations
that frees the identity+ticket-type slot.

### #23. One active registration per identity+ticket type (BLOCKING for buying the same ticket twice)

Even with #21 fixed, `Submit` allows exactly one *active* registration per
(identity, ticket type, date). Buying the same tier in a second, separate
checkout is rejected by design — multi-ticket intent must be expressed
upfront via `package_quantity`. If the product wants true repeat purchase
(e.g. "buy one now, one next week"), the backend must either allow multiple
active registrations up to `TicketType.max_packages_per_user`, or confirm
#21 is sufficient (a `confirmed` registration no longer blocks). Until one of
these lands, the frontend funnels multi-ticket buyers into the quantity
stepper and surfaces a choice sheet (continue / view Tickets) on conflict —
never a dead-end error.

---

## Informational

Cheap insurance / product-clarity notes, not blocking.

### #11. Slug namespace safety + redirects

Event slugs (`title.parameterize`) leak into the public URL space. A
`RESERVED_SLUGS` denylist (tickets, profile, settings, create, claim, resale,
admin, api, public, events, auth) plus a `slug_history` 301 table keep
short-link / sitemap / deep-link surfaces collision-free forever. Frontend
needs zero changes.

### #16. Chapa v1 vs v2 (key-prefix gated)

Backend implements v1 only. Keys prefixed `CHASECK_TEST-`/`CHASECK-` work;
`CHAPA_TEST-` keys (v2) crash the boot-time validator. No frontend impact —
backend presents the same `PaymentSerializer` either way.

---

## Deferred by design

These are product decisions, not bugs. Re-open only if requirements change.

### #7. No consumer notifications / payout-methods / consumer promo endpoints

- Consumer notifications: no `notification` routes exist.
- Consumer payout methods: existing surface (`marketplace/seller/payout_accounts`)
  is organizer/admin only.
- Consumer promos: `/catalog/promotions` is organizer CRUD. `order_quotes`
  accepts `promotion_code` server-side so the consumer path runs through the
  quote — confirm and drop the standalone UI validate when wiring.

### #8-deferred. Auth: no OTP / Google / check-account / password-reset

Removed from UI. Add only if the product spec demands these flows.

---

## Resolved (archive)

Full text of resolved items is in the original `BACKEND_GAPS.md` (git history).
Summary (verified live on `feat/launch-hardening-telemetry`, 2026-09-03):

| # | Resolution | Verified |
|---|---|---|
| 1b | Detail policy-filter → `public_show` action serves the full shape | live HTTP |
| 2 | `venue {name,city}` + `organization {name,slug}` nested in public payloads | live HTTP |
| 3 (main) | Products: `price_options` (cents) + `available` | live HTTP |
| 4 | Buyer-facing resale listing with event/product/ticket/venue context | live HTTP |
| 5 | `GET /tickets` owner wallet (`TicketWalletSerializer`) | live HTTP + frontend wired |
| 6 | Free orders fulfill → issue tickets (`accept_zero_total!`) | code |
| 15 | Mock-mirror dev events seeded with `platform_default` fee schedule | live (login → consent → registration → quote → order proven 2026-09-04) |

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

Recovered from the retired root `integration-plan.md`:

- `GET /feed` (`core/feed#index`) — follows-based social feed. Discovery is
  the browse surface; not consumed yet.
- `GET /categories`, `/venues`, `/artists` (+ `:id`) — public read endpoints
  backing the follow system. Not consumed.
