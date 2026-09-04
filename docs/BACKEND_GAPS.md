# Confirmed Backend Gaps (digis_backend)

> Every confirmed gap between what the frontend needs and what the backend provides,
> **verified against the actual backend code** (serializers, policies, controllers,
> routes). Each entry has: what's missing (with exact file + fields), why it matters,
> and a concrete solution. The frontend does NOT work around these (ADR-0002) — it
> mocks/defer/disables until the backend resolves them.
>
> Status key: `blocking` (frontend feature can't go live), `degrading` (works but
> suboptimal), `informational` (note for backend correctness), `RESOLVED` (fixed on
> `feat/launch-hardening-telemetry`, verified live 2026-09-03).
>
> Note: verified by reading code, not live HTTP (backend not running at review time).

---

## RESOLVED ON THIS BRANCH (summary — details in each entry)
| Gap | Resolution | Verified |
|---|---|---|
| 1b | Detail policy-filter → new `public_show` action, full shape | ✅ live HTTP |
| 2 | `venue {name,city}` + `organization {name,slug}` nested in public payloads | ✅ live HTTP |
| 3 | Products: `price_options` (cents) + `available` | ✅ live HTTP |
| 4 | Buyer-facing resale listing with event/product/ticket/venue context | ✅ code + live endpoint |
| 5 | `GET /tickets` owner wallet (`TicketWalletSerializer`) | ✅ live HTTP + frontend wired |
| 6 | Free orders now fulfill → issue tickets | ✅ code (`accept_zero_total!`) |
| 1 | **PARTIAL** — `event_setting` included but `config` stripped → still open | ✅ live HTTP |
| 13 | **NEW** — list serializer lacks `price_from_minor` → still open | ✅ live HTTP |

**Known backend endpoints with no frontend consumer yet (not gaps, just recorded so
the knowledge isn't lost — recovered from the retired root `integration-plan.md`):**
- `GET /feed` (`core/feed#index`) — follows-based social feed. No roadmap phase
  consumes it yet; discovery is the browse surface.
- `GET /categories`, `/venues`, `/artists` (+ `:id`) — public read endpoints backing
  the follow system; no consumer integration required for Phases 0–3.

---

## SEED-SIDE REVIEW (2026-09-03) — no open gap is a seed problem

Audited every open gap against `db/seeds_events.rb` (the mock-mirror seed we own):

| Open gap | What the seed already writes | Verdict |
|---|---|---|
| #1 config stripped | full `event_setting.config` JSONB (featured, rating, tickets_left, rsvp_*, seat_map, access_codes, invite_tickets) | **backend serializer** (`PUBLIC_CONFIG_KEYS` whitelist) — seed data is correct |
| #13 list `price_from_minor` | `Catalog::ProductPrice` rows (integer cents) per product | **backend serializer** — data exists, serializer doesn't project it |
| #3 nuance `requires_ticket` | product `metadata: { requires_ticket: true }` JSONB | **backend serializer** — data exists, not exposed |
| #8 user `name` | n/a (no column) | **backend** |
| #9 profile update | n/a (no endpoint) | **backend** |
| #10 signup validations | n/a (no model validations) | **backend** |
| #12 rate limiting | n/a (no middleware) | **backend** |
| #7 notifications/payouts | n/a (no routes) | **backend** |

**Conclusion:** every open item is backend serializer/code-level — the seed is not the
blocker for anything, and per the hard constraint we do not touch backend code.

**One seed-side TODO (owned by frontend, for Phase 3):** add a promotion + promo code
fixture to `db/seeds_events.rb` (or dev extensions) so `order_quotes.promotion_code`
can be integration-tested once the frontend passes the code at quote time — the
backend already validates it server-side (`OrderQuotesController#promotion_context`),
no consumer endpoint needed.

---

## 1. Public events LIST lacks `event_setting.config` (featured/rating/tickets_left)

**Status: PARTIALLY RESOLVED — still open**

**What the branch did (how it was solved):** `Events::Public::EventListSerializer` now
declares `has_one :event_setting, serializer: Events::Public::EventSettingSerializer`
(alongside `event_dates`, `event_media`, `event_organizations`, `organization`), and
`PublicEventsController#index` eager-loads `:event_setting`. The association is
therefore present in `GET /public/events` responses.

**What's still missing (verified live 2026-09-03):**
`Events::Public::EventSettingSerializer` whitelists config down to
`PUBLIC_CONFIG_KEYS = %w[allow_waitlist public_guest_limit]`, so the seeded config
fields the grid needs — `featured`, `rating`, `tickets_left`, `sold_out`, `event_type`,
`seat_map`, `access_codes`, `rsvp_*`, `invite_tickets` — never reach the client
(`"config": {}` in responses). The frontend adapter falls back to mock for these
(`events-adapter.ts:93-94`), so the grid works but is not backend-truthed for
featured/rating/tickets_left.

**Remaining solution (backend dev):** expand `PUBLIC_CONFIG_KEYS` to a deliberate
public projection (featured, rating, tickets_left, sold_out, event_type, rsvp_*,
access_codes, invite_tickets, seat_map) — or expose a computed public-flags attribute.
Frontend needs zero changes once served.

> Verified note (2026-08-29): the LIST endpoint is NOT policy-filtered — the public
> controller passes a Relation, `@clazz` is nil, so `resolved_visible_attributes` is
> nil and the serializer emits all declared fields. The earlier "only id/slug/title/
> visibility" claim was incorrect.

---

## 1b. Public events DETAIL is heavily policy-filtered (blocks detail-by-slug)

**Status: RESOLVED** on `feat/launch-hardening-telemetry` — verified live 2026-09-03

**How it was solved:** the branch split public detail onto its own action —
`PublicEventsController#public_show` (route `GET /public/events/:slug`, separate from
the organizer-facing `show`) — with `skip_authorization` for the public pair and a
dedicated `EventPolicy::VISIBILITY[:public_show]` entry. The controller eager-loads
everything (`:categories, :event_setting, :organization, {event_dates: :venue},
{event_organizations: :organization}, event_media → blob`) and passes the full
`include:` list explicitly to `EventDetailSerializer`, so no policy stripping occurs.
`EventDetailSerializer` also gained `has_one :event_setting` and
`has_one :organization`.

**Verified live:** `GET /public/events/:slug` returns categories (names), event_dates
(starts_at/ends_at + `venue {id,name,city}`), event_media (Active Storage variant
URLs), organization summary — the frontend's deep-link detail (`fetchById`) renders
fully from it (e2e: `event-detail.spec.ts`). Detail images are pre-sized variants
(`file.medium`/`file.thumbnail`) — the frontend adapter consumes those.

**Frontend follow-through (done):** router deep-links fetch `GET /public/events/:slug`
via `eventsModule.fetchById`; `location.state` is still used for instant paint on
in-app clicks. Unknown slugs 404 → redirect to discovery.

---

## 2. Event detail lacks venue name/city and organizer name

**Status: RESOLVED** on `feat/launch-hardening-telemetry` — verified live 2026-09-03

**How it was solved:** two new public serializers were added on the branch:
- `Events::Public::EventDateSerializer` — schedule projection that embeds
  `venue` via a `venue` method returning `Events::Public::VenueSummarySerializer`
  (`id, name, city`) — so `event_dates[0].venue.name/city` arrives nested.
- `Events::Public::OrganizationSummarySerializer` (`id, name, slug`) — exposed as
  `has_one :organization` on BOTH the list and detail serializers (organizer name
  no longer requires walking `event_organizations`).

**Verified live:** detail payloads return
`"venue": {"id","name","city"}` inside each event_date and
`"organization": {"id","name","slug"}` at the top level.

**Frontend follow-through (done):** `events-adapter.ts` maps
`date0.venue.name/city` → `Event.venue/city` and `be.organization.name` →
`Event.organizer`, falling back to mock only when the backend omits them.

---

## 3. Public products endpoint lacks price, availability, and requires_ticket

**Status: RESOLVED** on `feat/launch-hardening-telemetry` — verified live 2026-09-03
(one nuance remains, see below)

**How it was solved:** `Catalog::Public::EventProductSerializer` now exposes:
- `price_options` — a method projecting every ACTIVE `Catalog::ProductPrice` window
  (`currency, amount_minor, active_from, active_to`) via the new
  `Catalog::Public::ProductPriceSerializer`, sorted by currency/amount/start;
- `available` — boolean fed from `Catalog::Public::ProductAvailability` (the public
  products controller computes availability per product and passes it through
  serializer `instance_options`), so capacity math stays server-side.

**Verified live:** `GET /public/events/:slug/products` returns products with
`price_options` in integer cents and `available: true/false`.

**Remaining nuance:** `requires_ticket` still isn't serialized — the product's
`metadata` JSONB (holding `requires_ticket`) is not exposed. The frontend's extras
gating currently reads it from the mock. Tiny ask: add `metadata` (or a
`requires_ticket` boolean) to the public product serializer.

---

## 4. Resale listing serializer returns no display fields

**Status: RESOLVED** on `feat/launch-hardening-telemetry` — verified (code + live endpoint)

**How it was solved:** a new buyer-facing projection was added:
`app/serializers/marketplace/public/resale_listing_serializer.rb` — exposes
`id, status, asking_amount_minor, currency, resale_cutoff_at, fee_terms, created_at,
updated_at` PLUS the display context a listing card needs:
- `event {id, slug, title, timezone, currency}`
- `product {id, name, type}` (via `ticket.event_product`)
- `ticket_type {id, name, admissions_per_unit, entry_validation_mode}`
- `event_dates [{id, name, starts_at, ends_at, status, venue {id,name,city}}]`
  (from the ticket's product accesses)

Seller identity/payout data remains deliberately excluded (privacy), which is correct.

**Verified:** `GET /resale_listings` routes to the marketplace controller with the
public serializer wired (`resale_listings_controller.rb` changed on the branch);
live endpoint returns 200 (empty list until listings exist — the projection shape is
confirmed by the serializer code).

---

## 5. No user-tickets list endpoint (My Tickets)

**Status: RESOLVED** on `feat/launch-hardening-telemetry` — verified live 2026-09-03,
**and wired into the frontend**

**How it was solved:**
- `app/controllers/ticketing/tickets_controller.rb` — `TicketsController#index`
  (`GET /tickets`, route `resources :tickets, only: :index`): authorizes the owner,
  scopes via `policy_scope` (ownership boundary), eager-loads
  event/admission_slots/credential generation/product accesses, supports pagination
  and whitelisted ordering.
- `app/serializers/ticketing/ticket_wallet_serializer.rb` — owner wallet projection:
  `id, status, unit_number, event {id,slug,title,timezone,currency}, product
  {id,name,type}, ticket_type, event_dates (with venue summary), admission_slots,
  credentials` — credential `lookup_code`/`qr_token` are delivered ONLY for the
  caller's own ACTIVE tickets (`TicketWalletCredentialSerializer`, `deliver_secret:`).
- `app/models/ticketing/ticket.rb` gained the policy/scope support
  (`ticket_policy.rb` +6 lines).

**Verified live:** authenticated `GET /tickets` → 200 with the wallet envelope
(empty for fresh users — correct); unauthenticated → 401.

**Frontend follow-through (done):** `ticketsService.fetchUserTickets` calls the real
endpoint and maps the wire (`mapWalletTicket` — QR token only for active tickets);
the router's wallet query is auth-aware (keyed on `isAuthenticated`). The mock
fixture store no longer renders anywhere (e2e-proven). The mock WRITE path
(`issueTicketsForOrder`) remains until Phase 3 checkout issues real tickets.

---

## 6. Free orders never issue tickets

**Status: RESOLVED** on `feat/launch-hardening-telemetry` — verified in code

**How it was solved:** `Orders::CreateCheckout#accept_zero_total!` now runs the real
fulfillment path instead of just marking the order paid:

```ruby
result = Orders::FulfillOrder.call(
  order:, payment: nil, idempotency_key: "orders-free-fulfilled-#{order.id}"
)
```

So a `total_minor == 0` order (free RSVP) goes through the same
fulfillment → `orders.payment.fulfilled` outbox event →
`Ticketing::OutboxHandlers::OrderFulfilled` → `Ticketing::Packages::Issue` pipeline as
paid orders — the attendee gets a ticket/credential/QR. `Orders::FulfillOrder` itself
also changed on the branch (+12 lines) to support the paymentless call, and
`fulfill_order_test.rb` (+125 lines) covers it.

---

## 7. No consumer notifications / payout-methods / consumer promo endpoints

**Status:** confirmed, unresolved (deferred)

**What's missing:**
- **Notifications:** no notification routes/controllers exist for consumers (nothing in
  `config/routes.rb` matches "notification").
- **Payout methods:** consumer payout-method CRUD does not exist. Existing payout
  surface is organizer/admin only: `marketplace/seller/payout_accounts`
  (`routes.rb` line 217), `finance/.../payouts` (lines 235-243), `admin/commercial`
  (lines 254-281).
- **Consumer promos:** promotions are organizer CRUD only
  (`/catalog/promotions`, routes lines 71-78). There is no consumer promo-validate
  endpoint. However, `POST /events/:id/order_quotes` accepts `promotion_code` and the
  backend validates it server-side (`OrderQuotesController#promotion_context`), so the
  consumer promo path may already work through the quote — needs confirmation.

**Why it matters (deferred):** The notification bell, payout settings, and a standalone
promo-validate UI cannot be wired. They stay mock/deferred.

**Solution (backend dev):**
- Add consumer notification endpoints (or confirm a realtime channel).
- Add consumer payout-method CRUD, or confirm `marketplace/seller/payout_accounts` is
  usable by end-user sellers.
- Confirm `order_quotes.promotion_code` is the consumer promo path (the frontend can
  then pass the code at quote time and drop its standalone promo-validate mock).

---

## 8. Auth has no OTP / Google / check-account / password-reset, and user has no name

**Status:** confirmed, resolved-by-design (removed from UI)

**What's missing:** Auth routes (`config/routes.rb` lines 4-10) are identifier+password
only: `POST /auth/login`, `POST /auth/signup`, `POST /auth/refresh`, `POST /auth/logout`,
`POST /auth/reauthenticate`, `GET /auth/me`. No OTP, no Google/SSO, no `check-account`,
no server-side password reset. Additionally, `Core::UserAuthSerializer`
(`app/serializers/core/user_auth_serializer.rb`) returns `id, email, phone, verified_at,
created_at, updated_at, permissions, roles` — **no `name`**, no `photo`, no `provider`.

**Why it matters (degrading):** The frontend simplified its auth modal to
identifier+password; OTP/Google/reset flows were removed (Phase 2 plan). The missing
`name` field means the frontend must derive a display name from the email locally.

**Solution (backend dev):** Only if OTP/Google are product requirements — add the
corresponding endpoints. Add a `name` attribute to `UserAuthSerializer` (or a
`profile` field) if the platform wants users to have a display name.

---

## 9. No self-service profile-update endpoint (consumer account editing)

**Status:** confirmed, unresolved — **NEW finding (2026-08-31), blocks Settings edit UI**

**What's missing:** There is no consumer-facing endpoint to update one's own profile.
Routes show only `admin/users` CRUD (`config/routes.rb` line 284, admin-scoped) and the
`auth/*` block. Nothing handles `PATCH /auth/me` or `PATCH /users/me` for an end user
to change name/email/phone/photo.

**Why it matters (degrading):** The Settings account card is now display-only
(`src/features/profile/components/SettingsAccountCard.tsx`). Name/email/phone/photo
editing was stripped from the UI (and `updateProfile` removed from `AuthContext`)
because there is no endpoint to trace it to. The card shows "Profile editing is coming
soon."

**Solution (backend dev):** Add a self-service update endpoint, e.g.
`PATCH /auth/me` (or `PATCH /users/me`) permitting `name`, `email`, `phone` (with the
existing uniqueness validations in `Core::UserAuthenticatable`), guarded by
`Core::Authorizable` so a user can only edit their own record. A `name` column would
also be needed (see gap #8). Until then the edit UI stays disabled.

---

## 10. Signup has no server-side password/phone-format validation (verified live, 2026-09-03)

**Status:** confirmed — backend correctness; frontend now gates locally (AuthModal)

**What's missing (verified by hitting the live API):** `Core::UserAuthenticatable` uses
`has_secure_password validations: false` and `Core::User` adds no password validations.
`POST /auth/signup` therefore accepts:

- **Any password** — `"a"` (1 char) creates a working, login-able account
- **`password != password_confirmation`** — the confirmation param is silently ignored
  (`validations: false` also disables the built-in confirmation match), so the user can
  believe their password is "different" while the account's real password is the first one
- **Malformed phones** — `"123"` creates a valid account (no E.164/format check;
  uniqueness is the only phone rule)

The only enforced rules are `email_or_phone_present` and phone/email uniqueness.

**Why it matters (backend correctness):** password policy is a security baseline; the
confirmation mismatch is a correctness trap, not just UX. The frontend now enforces
min-8 chars + E.164 shape client-side, but client-side rules are advisory — the API
remains open.

**Solution (backend dev):** In `Core::UserAuthenticatable` (or `Core::User`):
`validates :password, length: { minimum: 8 }` (re-enable `has_secure_password`
validations or add `validates_confirmation_of :password`), and a phone format
validation normalizing/requiring Ethiopian E.164 (`+2519XXXXXXXX`, cf.
`Core::PhoneIdentity::ResolveOrCreate.normalize`). Keep returning per-field
`errors: [...]` — the frontend already surfaces them.

---

## 11. SUGGESTION — slug namespace safety + stability (event URLs)

**Status:** suggestion (no current bug) — from the frontend routing review (2026-09-03)

**Context:** the frontend serves event detail at `/events/:slug` (namespaced on
purpose) and builds links with `eventPath()` preferring the backend slug
(`Events::Event#slug`, generated by `title.parameterize` in `build_slug` /
`Core::Slugable`). The frontend URL does not need to mirror the API path, but it
consumes the backend slug directly as the public URL — which makes slug generation
part of the platform's public URL space.

**Two low-cost protections worth adding before public launch:**

1. **Reserved-slug guard.** Event titles are organizer free text, so any word is a
   potential slug. Today that is safe because the frontend namespaces events under
   `/events/…` (no collision with `/tickets`, `/profile`, `/resale`, `/settings`,
   `/create`, `/claim/:token`). But slugs leak into OTHER surfaces that do share
   top-level namespaces with future pages — short links (dig.is `/…`), email
   deep links, organizer share cards, sitemaps. A small guard keeps those surfaces
   collision-free forever:
   - a `RESERVED_SLUGS` denylist on event/venue/artist/organization slug
     generation (`tickets`, `profile`, `settings`, `create`, `claim`, `resale`,
     `admin`, `api`, `public`, `events`, `auth`, …) — either reject or suffix
     (`tickets-2`) like `build_slug` already does for duplicate titles;
   - cheap to add now, expensive to retrofit (needs a backfill for any slug
     created before the guard).

2. **Slug stability (redirects).** Shared event URLs outlive code — posters,
   WhatsApp forwards, sitemaps. If slug generation ever changes (parameterize
   version, transliteration for Amharic titles, normalization fixes), old links
   should keep working: keep a `slug_history` (or `previous_slugs`) table and
   301 old → new in the public show action. Without it, slug logic changes break
   every link already printed or shared.

**Why (degrading, not blocking):** neither is broken today; both are cheap-insurance
items where the retrofit cost is much higher than the upfront cost. The frontend
needs zero changes for either — it already prefers `event.slug` and tolerates any
slug value.

---

## 12. No rate limiting / brute-force protection on auth endpoints

**Status:** confirmed — NEW finding (2026-09-03 security review), `informational` but
should be `blocking` before public launch

**What's missing (verified):** no `rack-attack` (or equivalent) in the Gemfile and no
throttling middleware anywhere in `config/`. `POST /auth/login` accepts unlimited
password guesses from one IP/account. The only rate limit in the codebase is the
ticketing manual-lookup counter (`manual_lookup/online_search.rb`), which proves the
pattern (Rails.cache increment + window) but isn't applied to auth.

**Verified auth strength (everything else is solid — see the 2026-09-03 session
review):** bcrypt via `has_secure_password`; access JWT HS256 15-min TTL, expiry
enforced; refresh tokens are 256-bit random stored as SHA-256 fingerprints only,
30-day TTL, rotated-with-revocation in a transaction (old refresh token rejected on
reuse), device-bound (`invalid_device` on mismatch), ip/user-agent recorded; access
tokens carry their session's `jti` so logout/rotation revokes the access token
mid-window; no user enumeration (identical error for unknown identifier vs wrong
password); deactivated users can't authenticate or refresh.

**Why it matters:** everything above is undone by unlimited offline-style password
guessing over HTTP. 15-min access tokens + rotation assume the refresh token isn't
brute-forceable.

**Solution (backend dev):** add `rack-attack` — throttle `POST /auth/login` (and
`/auth/signup`, `/auth/refresh`) per IP + per identifier (e.g. 5/minute keyed
`"auth:#{ip}"` and `"auth:id:#{digest}"`), returning `429` with a flat `code`
(`rate_limited`) the frontend already maps through `errors.ts` (add the friendly
copy). Optional: `revoke_all_user_tokens` already exists for lockout flows.

---

## 13. Public events LIST lacks `price_from_minor` (grid prices)

**Status:** confirmed, unresolved — **verified live + against branch code 2026-09-03**

**What's missing:** `Events::Public::EventListSerializer` declares
`id, slug, title, description, visibility, timezone, currency, published_at` +
associations — **no `price_from_minor`**. Live check: the attribute is absent from
every item in `GET /public/events`.

**Why it matters (degrading):** the discovery grid shows a "from Br X" price per card.
The adapter (`events-adapter.ts:88-91`) falls back to `mock.priceFromMinor` when the
field is absent — so **grid prices are mock data**, violating the "backend computes
all money" rule. The detail side already solved this pattern elsewhere; the list just
never got it.

**Solution (backend dev):** add to `EventListSerializer`:

```ruby
attribute :price_from_minor do
  object.event_products.flat_map { |p| p.prices.select(&:active?).map(&:amount_minor) }.min
end
```

(or the same min-active-price projection the products endpoint uses via
`Catalog::Public::ProductAvailability`) + ensure `event_products`/`prices` are in the
index eager-load. **The data is already seeded** (`Catalog::ProductPrice` rows, integer
cents) — serializer-only. The frontend adapter already handles the field when present
(`typeof be.price_from_minor === "number"` branch) — zero frontend changes needed.
