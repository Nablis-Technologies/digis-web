# Plan: digis-web ↔ digis_backend Integration

**Goal:** Replace the frontend's 100% mock data with the real Rails backend
(`digis_backend`, running at `http://localhost:3000`), adapting the frontend to the
backend's existing contract.

**HARD CONSTRAINT:** The user is a **frontend developer**, not a backend developer.
**NO backend schema changes.** The backend is fixed; the frontend adapts. Backend
features that don't exist are disabled/deferred in the UI and flagged for the backend dev.

**Status:** PLANNING (approved decisions below; not yet implemented)

---

## Approved decisions (from user)

1. **Grid data source:** Backend dev has agreed to **expand the list serializer**
   (`GET /public/events`) so it includes `event_setting`, `price_from_minor`,
   `event_media`, and other fields the discovery grid needs. The frontend will build
   its adapter to consume the *expanded* list shape (with graceful fallback if not
   yet live).
2. **Money:** **Adopt integer cents everywhere.** All frontend money is internally
   stored/handled as integer `*_minor` cents; converted to Birr units ONLY at render
   time. Refactor the mock data + types accordingly.
3. **Payment:** Frontend **calls `POST /orders/:id/payment_attempts` then polls**
   the order/attempt status. No direct provider SDK.

---

## Backend contract summary (verified against live container + code)

| Aspect | Reality |
|---|---|
| Base path | No `/api` / `/api/v1`. Host-root: `/auth/login`, `/public/events`, ... |
| Envelope | `{ success, message, data, pagination }` — read `data` |
| Errors | `{ success:false, error, errors?, code }` — `code` is flat/top-level |
| Auth | `Authorization: Bearer <access_token>`; refresh token sent in **body** |
| Money | Integer **cents** (`*_minor` suffix) |
| IDs | UUID strings (uuidv7) |
| Dates | ISO 8601 timestamps |
| Mutations | Require `Idempotency-Key` header (else `400 missing_idempotency_key`) |
| CORS | `origins "*"` — dev cross-origin calls work as-is |

---

## Money handling (mirror the backend — decision 2)

Backend uses `Core::Money` (`app/lib/core/money.rb`): integer `amount_minor` +
ISO-4217 `currency`, rejects non-integers/bad codes, refuses cross-currency math,
all DB columns + wire fields are `*_minor` cents. The frontend replicates this as a
value object so both sides enforce the same invariants.

- [ ] Create `src/lib/money.ts` with an immutable `Money` class:
  - `readonly amountMinor: number` (integer cents) + `readonly currency: string`
  - `static fromMinor(amountMinor, currency)` — **default entry point** (wire format,
    near no-op pass-through)
  - `static fromMajor(amount, currency)` — authoring mocks/seed input only (`600` → `60000`)
  - `static zero(currency)`
  - `plus / minus / times(integerFactor)` — cross-currency throws `CurrencyMismatchError`
  - `equals / assertSameCurrency`
  - `toMajor()` / `format()` — the ONLY places cents become display units; `format()`
    uses `Intl.NumberFormat` (e.g. `"2,500 ETB"`, `"5.5 USD"`)
- [ ] **Two-layer rule:**
  - Domain types / state / services → `Money` (integer cents internally)
  - Wire-facing types → keep `*_minor` + `currency` verbatim (no conversion at boundary)
  - Render → `money.format()` only; never `price / 100` in components
- [ ] Convert existing types to `Money`:
  - `Event.priceFrom` → `Money` (adapter: `Money.fromMinor(be.price_from_minor, be.currency)`)
  - `EventProduct.price`, `TicketTier.price/originalPrice`, `SelectedEventProduct.unitPrice`
  - `ResaleListing.originalPrice/askingPrice`
  - `CheckoutOrder` money fields (subtotal/discount/serviceFee/total)
- [ ] Convert the mock dataset to cents via `Money.fromMajor` semantics
  (`priceFrom: 2500` → `250000`; every product `price`; `priceForeignFrom: 5` → `500`)
- [ ] Kill float-money math:
  - `ListingDetailSheet.tsx` `askingPrice * 0.05` (5% fee) → integer: `amountMinor * 5 / 100`
  - `AddExtrasDialog.tsx` `unitPrice * quantity` → `money.times(quantity)`
  - `ResalePage.tsx` `Math.round(... / originalPrice * 100)` (delta %) → integer math
- [ ] Replace `formatETB(value)` in `src/lib/utils/format.ts` with `money.format()` (keeps ETB style)
- [ ] Add `formatPrice(money)` display helper (cents → `"600"` / `"600.50"`) for non-currency contexts

## Phase 0 — Foundation

Already ~90% implemented in `src/lib/api.ts` and `src/lib/mappers.ts`. Remaining:

- [ ] Create `.env` + `.env.example` with `VITE_API_BASE_URL=http://localhost:3000`
- [ ] Confirm `api.ts` reads `access_token` (not `.token`) from `digis_session` after Phase 2 changes session shape
- [ ] Remove/deprecate `apiOrSeed` once discovery goes live (transitional crutch only)
- [ ] Apply the Money refactor above (new `src/lib/money.ts`, type conversions, mock→cents,
      render-only formatting, remove float math)

## Phase 1 — Events / Discovery / Event Detail

**Endpoints:** `GET /public/events` (list, expanded), `GET /public/events/:slug`
(detail — **by slug, NOT id**), `GET /public/events/:slug/products`.

- [ ] Fix `events.service.fetchById` → call `public/events/${slug}`
- [ ] Rewrite `backendEventToEvent` to read **expanded list** + **detail** shapes:
  - list: `id, slug, title, description, price_from_minor, currency, categories[],
    event_dates[0].starts_at, event_media[] (cover+gallery), event_setting.config`
  - config JSONB → `rating`, `tickets_left`, `featured`, `event_type`,
    `seat_map`, `access_codes`, `invite_tickets`, `rsvp_*`, `answer_edit_window_hours`
  - `starts_at` → `date`/`time` display strings (via `isoToDisplayDate/Time`)
- [ ] Wire products: `GET public/events/:slug/products` → `EventProduct[]` +
  `TicketTier[]` (from `ticket_type` nested shape)
- [ ] Derive `soldOut = tickets_left <= 0` OR trust backend `config.sold_out`
- [ ] Decide venue/organizer: NOT serialized by backend → keep from local mock data
  (flag to backend dev for a future `venue { name, city }` include)
- [ ] Remove `initialData`/`EVENTS` fallback from discovery once list is expanded & live
- [ ] Verify grid renders with real data; verify detail page (products, seat map, RSVP,
  invite-only gate) against backend config

## Phase 2 — Auth

**Endpoints:** `POST /auth/login`, `POST /auth/signup`, `POST /auth/refresh`,
`POST /auth/logout`, `GET /auth/me`.

- [ ] Change session storage shape: `{ access_token, refresh_token, user }` in `digis_session`
- [ ] Update `api.ts` `getToken()` to read `access_token`
- [ ] Rewrite `authService` internals with real calls (keep signatures):
  - `signIn({ identifier, password })` → `/auth/login` → `{ user, access_token, refresh_token }`
  - `signUp` → `/auth/signup` with `{ user: { email?, phone?, password, password_confirmation } }`
  - `me` → `GET /auth/me`
  - `refresh` → `POST /auth/refresh` body `{ refresh_token }` (rotation: revokes old,
    returns new pair)
  - `logout` → `POST /auth/logout` body `{ refresh_token }`
- [ ] Implement **serialized silent refresh**: single in-flight refresh promise;
  on 401 → refresh once → retry original request → else force logout
- [ ] Update `AuthUser` type: backend user has `email, phone, verified_at, permissions,
  roles` — **no `name`, no `provider`, no `photo`**. Add `name` (derived from email) client-side
- [ ] **Remove** OTP / check-account / Google / password-reset flows from UI and types
  (backend has none) — simplify `AuthModal` to identifier+password + direct signup
- [ ] Handle error codes: `invalid_credentials`, `token_expired`, `token_revoked`,
  `account_deactivated`, `invalid_device`

## Phase 3 — Checkout, Resale, Transfers

### 3a. Checkout (`checkout.service.ts`)

Real flow (all auth'd, `Idempotency-Key`):

1. `POST /events/:event_id/order_quotes`
   - body: `{ charge_currency, provider?, payment_method?, promotion_code?,
     items: [{ event_product_id, quantity, registration_id?, event_date_ids?,
     venue_event_date_ids? }] }`
   - **requires `event_product_id`** → cart must carry product UUIDs from products endpoint
   - returns `quote_token` (JWT) + `*_minor` money + `expires_at`
2. `POST /events/:event_id/orders` — body `{ order: { quote_token } }` → `OrderSerializer`
3. `POST /orders/:order_id/payment_attempts` — body `{ payment_attempt: { provider,
   payment_method, commercial_signature? } }` → `PaymentSerializer`
4. **Poll** order/attempt status until settled (decision 3)

- [ ] Replace client-computed totals with server quote as source of truth (quote screen)
- [ ] Map frontend `PaymentMethod` (`telebirr|cbe|card`) → backend `provider`/`payment_method`
- [ ] Carry `event_product_id`s through the cart (from products endpoint)
- [ ] Map seats/answers/consents into the request (registration answers likely via
  `registration_id` — **flag to backend dev** how registrations are created in this flow)
- [ ] Money in cents throughout (decision 2)

### 3b. Resale (`resale.service.ts`)

- [ ] `GET /resale_listings` (auth'd) → map `asking_amount_minor/100` → `askingPrice`,
  `created_at` → `listedAgo`, cents everywhere
- [ ] Create = `POST /tickets/:ticket_id/resale` body
  `{ resale_listing: { asking_amount_minor } }` — **note: nested under ticket, NOT
  `POST /resale_listings`** (correction vs integration-plan.md)
- [ ] `POST /resale_listings/:id/purchase` → returns `OrderSerializer` (then payment flow)
- [ ] `POST /resale_listings/:id/cancel` → status `cancelled`
- [ ] **Gap:** backend listing lacks event name/image/date display fields
  (`event_id`, `ticket_type_id`, `seller_user_id` only) → enrich from events or flag to backend dev

### 3c. Transfers (`transfer.service.ts`)

- [ ] `POST /tickets/:id/credential_claims` (auth'd) body
  `{ credential_id, phone, expires_at? }` → `{ claim, token }`
- [ ] `POST /credential_claims/:id/accept` (no auth) body `{ token }` → `{ claim, credential }`
- [ ] `POST /ticket_transfers/:id/accept` (no auth, `Idempotency-Key`) body `{ token }`
- [ ] Replace localStorage + `recipientHasAccount` heuristic with real claim tokens

## Deferred (backend gaps — needs backend dev)

| Feature | Gap |
|---|---|
| **My Tickets page** | **No `GET /tickets` / user-ticket-list endpoint exists** (verified: no serializer, no controller). Post-purchase ticket display + `ticketsService.fetchUserTickets` cannot be wired. Show empty-state/placeholder + flag to backend dev. |
| `ticketsService` internals | All depend on ticket list that doesn't exist. `listForResale` (`POST /tickets/:id/resale`) works only if ticket id known — currently impossible to obtain. |
| Notifications | No consumer notification endpoints in routes. Defer. |
| Payouts | Only organizer/admin payout endpoints exist. Defer consumer payout-methods. |
| Promos | Only `/catalog/promotions` (organizer CRUD) exists. **But** `order_quotes` accepts `promotion_code` — verify server-side promo validation works, keep UI promo if so. |
| OTP / check-account / Google auth | Removed from UI (Phase 2). |

---

## Verification

- `npm run build` / `npm run lint` / `npm run typecheck` clean after each phase
- Backend seeded (28 public events); run frontend dev against `http://localhost:3000`
- Discovery grid shows real event data (title, image, price in Birr, date)
- Event detail shows products, seat map, RSVP/invite config from backend
- Login/signup against real backend; token refresh survives 401 without losing session
- Checkout: quote → order → payment_attempt → poll completes
- Rubocop N/A (frontend); backend untouched

## Out of scope

- Any backend schema/serializer/policy change (done only by backend dev)
- My Tickets / notifications / payouts / consumer promos (backend gaps)
- OTP / Google / password-reset auth (backend gaps)
