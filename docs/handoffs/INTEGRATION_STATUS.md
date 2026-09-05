# Integration Status — digis-web ↔ digis_backend

> **Living document.** Update this file as work progresses so any new session can
> continue exactly where this one left off. Read the plan first:
> `docs/superpowers/plans/2026-08-28-frontend-backend-integration.md`.
>
> **Hard constraint:** user is the FRONTEND dev. NO backend schema changes.
> Backend gaps are flagged for the backend dev, not worked around by changing the API.

## Session 2026-09-05 (pm) — price-rank tier accents + live Chapa

### Tier colors are now rank-based and theme-aware (no longer all blue)

The four semantic flags (`isEarlyBird/isCouples/isElite/isPremium`) drive
badges/shimmer/countdown/pair-suffix UI **and** color. Live tiers never set
those flags, so every tier rendered the standard blue. Fixed by separating the
two concerns:

- **New `src/lib/tierAccents.ts`** — shared palette + `resolveTierAccent(type)`
  (explicit `accent` first, legacy flags fallback) and
  `applyRankAccents(tiers)` (pure, unit-tested). Each accent carries `bright`
  (dark mode) + adjacent `ink`/`inkRgb` (light mode) + `rgb`/`bg`.
- **`src/lib/products.ts`** — after the price sort, `applyRankAccents`: cheapest
  → **emerald**, priciest → **gold**, middles alternate **blue/violet**;
  single-tier events stay unaccented (no false "deal"). Presentation only —
  money/behavior still come from the backend.
- **`src/types/event.ts`** — `TicketTier.accent?: 'emerald'|'rose'|'violet'|'gold'|'blue'`.
- **`TicketTypeCard.tsx`** — uses `resolveTierAccent`; `isDark = pageIsDark`
  (was hardcoded `true`), so light mode renders the ink shades.
- **`useTicketPricing.ts`** — same resolver for the purchase-bar accent
  (`rgb`/`inkRgb`), guarded for null `selectedTicket`.

Verified: `tsc` clean, build ok, unit tests 18/18 (8 new tier-accent tests),
e2e **14/14**. Runtime probe on `/events/on-on` (Early Bird/Regular/VIP):
dark `rgb(52,211,153)/rgb(96,165,250)/rgb(250,200,60)` (emerald/blue/gold),
light the adjacent inks `rgb(4,120,87)/rgb(29,78,216)/rgb(154,106,0)`. Semantic
badges still only trigger on their explicit flags (live tiers never set them).

### Live Chapa enabled in dev

Backend `compose.yaml` now loads `.env.chapa` via `env_file` (see
`digis_backend/docs/guides/chapa-integration.md` §5). `docker compose up -d`
registers Chapa automatically (`Registry.available == ["chapa"]`). The old
workaround note below ("`CHAPA_ENABLED=false` in the current compose") is
**obsolete** — Chapa is live. A real/test-mode Chapa payment is now the
remaining wallet-proof item.

## Phase progress

| Phase | Description | Status |
|---|---|---|
| 0 | Foundation + Money refactor | **COMPLETE** |
| 1 | Events / Discovery / Event Detail | **COMPLETE** (detail-by-slug live, 2026-09-03) |
| 2 | Auth | **COMPLETE** |
| 3 | Checkout / Resale / Transfers | in progress (A/B/C-fixes shipped 2026-09-04 — see Phase 3 notes below) |
| — | Architecture review | **COMPLETE (all 7)** |
| — | Deferred (backend gaps) | My Tickets, notifications, payouts, consumer promos |

## Phase 1 COMPLETE (2026-09-03) — detail-by-slug live

**Products wired into the purchase path (2026-09-03):** `src/lib/products.ts` fetches
`GET /public/events/:slug/products` and maps `price_options` (lowest active, cents)
→ `TicketTier[]` + `EventProduct[]` extras; EventDetailPage prefers live tiers/extras
with mock fallback. The quote line now carries the **real backend product UUID**
(`ticketProductId` threaded EventDetail → Checkout → `useCheckoutFlow`, replacing the
synthetic `ticket:<name>` id). GiftTicket extras `price` bug fixed (now `priceMinor`).
e2e: detail page asserts the products request fires (11/11 suite green).

**Wallet de-mocked (2026-09-03):** `ticketsService.fetchUserTickets` now calls the real
`GET /tickets` (branch ships `Ticketing::TicketsController#index` +
`TicketWalletSerializer`) and maps the wire → `UserTicket` (`mapWalletTicket`; QR token
only for active tickets). The router's wallet query is auth-aware (keyed on
`isAuthenticated`, `enabled` while signed in) — the mock fixture store ("Ethio Jsssazz
Night") no longer renders anywhere. The mock write-path (`issueTicketsForOrder` etc.)
remains for Phase 3 checkout. Runtime audit e2e (`mock-audit.spec.ts`) proves:
discovery = 1 API call (`GET /public/events`), 87/87 images backend-served, 0 mock-host;
detail = `GET /public/events/:slug`, cover+gallery backend-served (mock-host images
remaining are lineup/organizer avatars — backend gap).

**Gap #1b is resolved on `feat/launch-hardening-telemetry`** (new `public_show`
action skips the policy filter and serves the full detail shape), so the last
Phase 1 blocker is gone. Wired:

- **`eventPath` prefers the backend slug** (`event.slug`) — fixes the duplicate-title
  case ("…-2") where name-derived slugs 404'd. `Event` gained `slug?: string`.
- **Deep links / refreshes now fetch by slug** — `router.tsx` parses `/events/:slug`
  and runs `eventsModule.fetchById` via React Query when `location.state` is absent
  (in-app clicks still ship the event through state for an instant paint). Loading
  shows a spinner (never the mock feed); unknown slugs redirect to `/`.
- **Adapter reads the real nested data** — `venue`/`city` from
  `event_dates[0].venue {name, city}`, `organizer` from `organization.name`, images
  from Active Storage variants (`file.medium ?? thumbnail ?? url` — the backend never
  served `file.url`). Mock remains only for what the backend doesn't serve
  (config flags, rich products/seat maps, `price_from_minor` on list).
- **e2e added (`e2e/event-detail.spec.ts`, 3 tests):** deep-link-by-slug, card click
  → `/events/:slug`, unknown-slug redirect. Full suite: **8/8 passing**.
- **e2e stability fixes:** `workers: 2` (single-container backend saturates above
  that), `server.watch.ignored` for `test-results/`+`playwright-report/` (Playwright
  writes were triggering HMR reloads mid-test), and an AnimatePresence transition race
  documented in the card-click test.

## Session 2026-09-03 — backend branch switch + auth e2e suite (all green)

### Backend switched to `feat/launch-hardening-telemetry`
- Old AI serializer/controller workarounds **reverted**; seed + dev config kept
  (`compose.yaml`, `Dockerfile` dev stage, `db/seeds_events.rb`, `.gitattributes` LF fix).
  Old `db/seeds.rb` require edit is in `git stash` (superseded by branch seed profiles).
- The branch fixes all serializer gaps: `public_show` detail (no policy gutting),
  products `price_options`+`available`, `GET /tickets`, buyer-facing resale serializer,
  free-order fulfillment, `EventDateSerializer` with `venue {name,city}`.
- `db/seeds_events.rb` (28-event mock mirror) wired into the dev profile via
  `db/seeds/dev_extensions.rb`; org lookups made `find_or_create_by!`; cleanup scoped
  to the seed's own slugs so branch preview fixtures survive.
- `DIGIS_SEED_PROFILE: dev` set in `compose.yaml`; Dockerfile dev stage installs
  `postgresql-client-18` (base image ships client 15, incompatible with the PG18 server).
- **Dev perf fix:** dev-mode code reloading stats ~900 app files per request across the
  Windows↔WSL2 bind mount (~5ms/stat) = ~4s added to EVERY request. Disabled via
  `config.enable_reloading = false` in `config/environments/development.rb` (local change).
  Backend code edits now need `docker compose restart web`. Requests ~0.3-0.4s.

### Auth verified end-to-end + e2e suite created (`e2e/auth.spec.ts`, 5/5 passing)
- Live-verified: login, me, refresh (rotation), signup, logout+revocation.
- **Fixed:** `authService.logout()` sent no `Authorization` header — backend requires it
  (`authentication_required`) → refresh token was never revoked server-side. Header now
  attached (still plain axios, bypassing the refresh interceptor).
- e2e covers: login, session persistence across reload, invalid credentials,
  logout + **refresh-token revocation regression** (asserts the header + replays the
  captured token → rejected), signup with a throwaway phone. Run:
  `npx playwright test e2e/auth.spec.ts --headed` (+ `npx playwright show-report`).
- **Fixed (api.ts):** `crypto.randomUUID()` is undefined in non-secure contexts
  (phone via LAN http) — every mutation threw in the interceptor. Added a v4 fallback
  built from `getRandomValues`.
- **Fixed (TopBar):** avatar aria-label "Profile" → **"Account menu"** — it collided with
  Navigation's "Profile" pill (same accessible name, different actions). e2e updated.

### Known selector quirks (explained, deliberate — not changed)
- **TopBar renders `triggers` twice** (desktop bar + mobile cluster). Both stay in the
  DOM across breakpoints (CSS-hidden), so CSS/attribute locators match 2 — use
  `.first()`. Standard responsive pattern; not worth restructuring.
- **Two "Log in" buttons** (TopBar pill + AuthModal submit) — intentional copy; e2e
  scopes the modal submit with `.last()`.
- **Navigation's mobile "Log in" item** duplicates the TopBar pill's copy on desktop
  (DOM-present, CSS-hidden) — same treatment: `.first()`.
- **AuthModal success screen shows ~1.4s** before self-closing (`finishAuthed`) — e2e
  waits with a 10s window, no fixed sleeps.

### New backend asks (this branch) — update BACKEND_GAPS.md next
1. `event_setting.config` returns `{}` — `EventSettingSerializer` whitelists only
   `allow_waitlist`/`public_guest_limit`; frontend needs featured/rating/tickets_left/
   seat_map/rsvp_* (grid silently falls back to mock).
2. List serializer still lacks `price_from_minor` (detail-side has it).
3. **Checkout blocker (updated 2026-09-04):** registration is now PROVEN with the
    seeded verified attendee (`identifier` login → consent_requirements →
    `POST /ticket_types/:id/registrations` → 201 `pending_payment`/`requires_order`;
    repeat submits → `422 active_registration_conflict`, expected). The wall moved
    one step down: `POST /events/:id/order_quotes` → `422
    commercial_terms_unavailable` — mock-mirror orgs have no commercial
    program/assignment (see BACKEND_GAPS.md #15). The `verified_at`/guest-checkout
    design question (#14) still stands for real new users.

## Phase 2 — Auth (complete, 2026-08-31)

Frontend auth is now wired to the real Rails backend. No mock auth remains.

- **`src/lib/auth.ts` is now a real deep module** (was the mock) — owns the `/auth/*`
  contract via `apiFetch`:
  - `signIn({ identifier, password })` → `POST /auth/login` → `{ user, access_token, refresh_token }`
  - `signUp({ phone, password })` → `POST /auth/signup` → user (no tokens) — `AuthContext`
    then auto-signs-in with the same credentials (phone-first, direct signup)
  - `me()` → `GET /auth/me` (mount-time session revalidation in `AuthContext`)
  - `logout()` → `POST /auth/logout` via plain axios (NOT `apiFetch`) so an expired
    access token can't trigger the refresh interceptor and rotate the refresh token
    before revocation; best-effort — the session is cleared locally regardless
- **Session store unified** — `src/lib/session.ts` is the single owner of
  `{ access_token, refresh_token, user }` (shape already matched by `api.ts`).
  `AuthContext` now reads it via `useSyncExternalStore(subscribe, getSnapshot)`
  instead of a second local React state + mock `digis_session` storage. The mock
  `getStoredSession`/`setStoredSession` (which collided on the same localStorage key
  with the wrong shape) are deleted.
- **`AuthUser` maps the backend wire** — `Core::UserAuthSerializer` has
  `id, email, phone, verified_at, permissions, roles` and NO `name`/`photo`/`provider`
  (BACKEND_GAPS.md #8). `toAuthUser()` derives `name` from email local-part / phone
  suffix client-side. `UserAvatar` no longer branches on `photo`.
- **UI simplified to the backend surface** — `AuthModal` is now identifier+password
  (log in) and phone+password (create account) only. OTP, Google sign-in,
  check-account, and password-reset flows are removed (backend has none).
- **Profile editing deferred** — `updateProfile` had no backend endpoint (only
  `admin/users` CRUD exists). Removed from `AuthContext`; `SettingsAccountCard` is
  now display-only (name/email/phone), edit/photo/OTP flows stripped, and flagged
  as "coming soon". See BACKEND_GAPS.md.
- `types/auth.ts` + `types/index.ts` rewritten to the wire contract; `src/types`
  no longer exports the removed OTP/Google/check-account/reset types.
- Error codes map via `src/lib/errors.ts` (`invalid_credentials`, `token_expired`,
  `token_revoked`, `account_deactivated`, `invalid_device`).
- Verified: `npx vite build` exit 0; `npx tsc --noEmit` clean for all touched files
  (remaining tsc output is the pre-existing `React` namespace / `key` prop baseline).

**Backend gaps flagged (still open):** consumer profile-update endpoint (edit UI
deferred); login rate-limiting/lockout; `name` field on `UserAuthSerializer`.

## Phase 1 — Events / Discovery / Event Detail (in progress)

### Recent fixes (2026-08-31)

- **Discovery now loads from the backend** — root cause found: `DiscoveryPage.tsx` had
  `initialData: eventsService.initialData` + `staleTime: Infinity` on the events query.
  React Query treated the mock `EVENTS` as always-fresh, so `queryFn`
  (`eventsService.fetchAll`) NEVER ran → mock shown, zero backend logs. Fixed by removing
  `initialData`/`staleTime` — query now always calls the backend.
  **User rule: mock must NEVER appear while loading** (no placeholderData either).
- **Fonts reverted to original** — all self-hosted font work reverted via git checkout.
  `src/styles/fonts.css` is back to Google Fonts `@import url(...)`. Suspected cause of
  fonts not rendering in Zen browser = Zen setting/browser-level, not code. Do not
  re-attempt self-hosting unless the user asks.
- **Router switched to `createBrowserRouter`** (was `createHashRouter`) — clean URLs.
  Note: production hosting needs SPA fallback config.
- **`.gitignore` added** for digis-web (node_modules, dist, .env, logs, vite.log).
- **Backend running**: `docker compose up -d` in `digis_backend`; frontend on `:5173`,
  backend on `:3000`.

### Architecture cleanup (2026-08-31) — service shims deleted

Executing ADR 0005 ("service shims are deleted; components import the module
directly") on the two modules that already own their deep seam:

- [x] **`services/resale.service.ts` deleted** — was a pure pass-through to
  `resaleModule`. `ResalePage` mutations + `ticketsService.listForResale` now call
  `resaleModule` directly. Birr→cents conversion for `createListing` moved to the
  `ResalePage` call site (`Math.round(price * 100)`); keys via `resaleModule.keys`.
- [x] **`services/events.service.ts` deleted; `src/lib/events.ts` created** — the
  events deep module now owns HTTP (`apiFetch`) AND backend→domain mapping (the
  events-adapter is its internal seam), closing the "service-owns-HTTP" anti-pattern
  ADR 0005 named. `DiscoveryPage` uses `eventsModule.keys.all` + `eventsModule.fetchAll`.
  The router's `eventsService.initialData` fallback was an empty array (never populated
  at runtime per ADR 0005), so dropping it changes no behaviour — event detail still
  ships via `location.state` (blocked by gap #1b).
- [x] `TicketsPage` extras lookups against `eventsService.initialData` were always
  empty (extras deferred per BACKEND_GAPS.md #3); removed the dead reads.
- [x] **Candidate #3 complete — `src/services/` deleted.** All remaining mock domain
  owners moved into `src/lib/` as deep modules (`git mv`, history preserved):
  `auth.ts`, `tickets.ts`, `transfer.ts`, `payout.ts`, `promo.ts`, `notifications.ts`.
  Cross-imports (`transfer` → `notifications`/`tickets`) and all ~10 consumers updated
  to import from `@/lib/*`. `services/` no longer exists. Naming is now uniform:
  one deep module per backend domain in `lib/` (order, resale, events, auth, tickets,
  transfer, payout, promo, notifications, session).

### Phase 1 — next steps

1. Verify discovery grid loads 28 live backend events (watch `docker compose logs -f web`).
2. Event detail still renders from router state / mock (`router.tsx:89` `eventsService.initialData.find`)
   — detail-by-slug is BLOCKED by backend gap #1b (detail endpoint heavily policy-filtered).
3. Backend dev needs to expand `EventPolicy::VISIBILITY[:show]` for detail-by-slug to work.

### Candidate #2 — Order intake pipeline (DONE)

- [x] Created `src/lib/order.ts` — deep Order module mirroring the backend's 3-step
  pipeline (quote → order → payment), with types from the actual backend serializers
- [x] Refactored `useCheckoutFlow` to route ALL money through `orderModule.quote()`
  (subtotal, discount, buyer fee, total come from the quote, not inline math)
- [x] Removed inline `SERVICE_FEE_BPS = 500` from the hook (fee lives in the order module)
- [x] Fixed `SellTicketSheet` 8% float → BPS integer math (`Math.round(price * 800 / 10000)`)
- [x] Added `quoteToken` to `CheckoutOrderInput` (backend-sent token, not client money)
- [x] Added Vitest (`vitest.config.ts`) + 4 tests for `orderModule.quote()`
- [x] Build verified: `npx vite build` + `npx vitest run` pass

### Candidate #3 — ResaleListing lifecycle (DONE)

- [x] Created `docs/BACKEND_GAPS.md` — every confirmed backend gap with explanation + solution
- [x] Created `src/lib/resale.ts` — deep Resale module mirroring the backend's marketplace
  endpoints (create → browse → cancel), types from `ResaleListingSerializer`:
  - `ResaleListingWire` = backend wire shape (FKs + `asking_amount_minor`, `fee_terms`)
  - `ResaleListing` = wire + display enrichment (BACKEND_GAPS.md #4, mocked)
  - `createListing(ticket, askingAmountMinor)` → POST /tickets/:ticket_id/resale
  - `fetchListings()` → GET /resale_listings (active only)
  - `cancelListing(id, reason)` → POST /resale_listings/:id/cancel
  - `purchaseListing(id)` → POST /resale_listings/:id/purchase → delegates to orderModule
    (backend returns an Order; buyer pays via orderModule.startPayment)
- [x] `resale.service.ts` now a thin facade over `resaleModule` (single source of truth);
  Birr→cents conversion at the facade boundary
- [x] `ListingDetailSheet` buy-total now uses `listing.fee_terms.rate_bps` (backend shape),
  not hardcoded 5%
- [x] Renamed `askingPrice`→`askingPriceMinor`, `originalPrice`→`originalPriceMinor`
  in resale types + consumers
- [x] Added 4 tests for `resaleModule` (active filter, create cents, cancel, purchase→order)
- [x] Build verified: `npx vite build` + `npx vitest run` (8 tests) pass

### Candidate #4 — Events adapter consolidation (DONE)

- [x] Created `src/lib/events-adapter.ts` — single seam for backend→domain mapping:
  - Wire types defined from the actual Rails serializers (EventListSerializer,
    EventDetailSerializer, EventSettingSerializer)
  - `backendEventToEvent()` maps backend → `Event` (uses `isoToDisplayDate`/
    `isoToDisplayTime` from `mappers.ts`, making them no longer dead)
  - Reads `event_setting.config` for featured/rating/tickets_left
  - Mock fallback for display gaps (venue/city, products — BACKEND_GAPS.md)
- [x] Refactored `events.service.ts` to use the adapter, removed inline mapper
  (`formatDate`/`formatTime` helpers deleted)
- [x] `fetchById` now falls back to slug match in mock (honours backend routing by slug)
- [x] `mappers.ts` is no longer dead (adapter uses it); remaining unused exports
  (`snakeToCamel`, `minorToNumber`, `formatRelativeTime`) kept for Phase 3
- [x] Build verified

### Candidate #5 — Stateful mock singletons (DONE)

- [x] Backend check: no repository layer, state is 100% Postgres-backed (wipable),
  reads are ownership-scoped via Pundit `Scope` classes, writes are per-aggregate
  command services. Frontend mirrors this with:
  - wipable state (`resetToSeed()`) — mirrors "re-seed the DB"
  - ownership-scoped queries (`fetchMyListings(sellerUserId)`) — mirrors Pundit `Scope`
  - No injectable repository layer (backend doesn't have one)
- [x] `resaleModule`: added `resetToSeed()`, `fetchMyListings(sellerUserId)`,
  `sellerUserId` field on listings, `fetchListings(sellerUserId?)` scoped to active+own
- [x] `ticketsService`: added `resetToSeed()` (wipes to seed array)
- [x] 2 new tests for reset + ownership scoping (10 total)
- [x] ResalePage's `myListings` duplicate state NOT rewired this pass — the page
  uses a different render shape (`{ticket, price, id}` vs `ResaleListing`); page
  rewiring is a follow-up when the mock is replaced by the real API call.

### Candidate #6 — Money-display convention (DONE)

- [x] Added `Money.formatNumber()` — display number without currency, for split
  layouts that render the currency in a separate span
- [x] Replaced all 6 ad-hoc `.toMajor().toLocaleString()` render sites with
  `.formatNumber()` (TransferTicketDialog, CheckoutPage, SeatMapStep,
  InviteOnlySection, PurchaseBar, TicketTypeCard)
- [x] Convention now collapses onto the Money module: `format()` (with currency) or
  `formatNumber()` (without) — no more ad-hoc calls
- [x] Build + tests pass

### Candidate #7 — Promo tier-ordering leak (DONE)

- [x] Backend check: `Catalog::Promotion` has NO tier concept — promotions are
  `percentage|fixed`, scoped to event products (`promotion_products`), no tier rank
- [x] The frontend's `tierOrder = ['Standard Access', ...]` is a MOCK-ONLY invention.
  Added a note in `promoService.validate` marking it as mock-only, to be replaced by
  backend per-event_product_id validation when the consumer promo endpoint arrives
- [x] Build + tests pass

## Architecture review — COMPLETE (all 7 candidates)

### Run #1 — deepened the data layer (done 2026-08-28)

1. ✅ Money at the domain seam (`*Minor` rename, live price wins)
2. ✅ Order intake pipeline (orderModule mirrors backend quote→order→payment)
3. ✅ ResaleListing lifecycle (resaleModule mirrors marketplace endpoints)
4. ✅ Events adapter consolidation (events-adapter.ts single seam)
5. ✅ Stateful mock singletons (resetToSeed + ownership scoping, mirrors Pundit Scope)
6. ✅ Money-display convention (formatNumber() sanctioned)
7. ✅ Promo tier leak (documented as mock-only; backend has no tier concept)

Report: `%TEMP%/architecture-review-20260828-182200.html`

### Run #2 — wire the deep modules into the features (done 2026-08-29)

Grilled and implemented candidates #1–#3 (the "decorative module" pattern — modules built,
features still used old seams):

1. ✅ **Resale read path** — `ResalePage` uses `resaleModule.fetchListings`/`fetchMyListings`
   via React Query. Deleted static `MOCK_LISTINGS` + `myListings` local state. Reactivated
   browse grouping. Fixed `priceFrom` → `priceFromMinor` NaN bug.
2. ✅ **Order pipelines collapsed** — deleted `checkout.service.ts`. `useCheckoutFlow`
   completion → `orderModule.createOrder(quoteToken)` → `orderModule.startPayment(...)`.
   `IssuableOrder` type in tickets.service (no more `as never`).
3. ✅ **Resale purchase + fee** — `ListingDetailSheet` buy → `resaleModule.purchaseListing`
   → `orderModule.startPayment` (replaced 2s timer). `SellTicketSheet` fee uses shared
   `RESALE_FEE_BPS` constant (was triplicated literal 800).

Remaining (not yet implemented):
- #4 Route event detail through adapter's `fetchById` (router ships merged Event in state)
- #5 Remaining money annotations (`SelectedEventProduct.unitPrice`, duplicate `CheckoutOrder`)
- #7 Move hardcoded `defaultTicketTypes` into events module

Report: `%TEMP%/architecture-review-20260829-010541.html`

## Key decisions (locked)

1. **List serializer expansion** — backend dev agreed to expand `GET /public/events`;
   adapter consumes the expanded shape (graceful fallback if not yet live).
2. **Money = integer cents everywhere** — mirror backend `Core::Money` via a
   frontend `Money` value object (`src/lib/money.ts`); convert to units only at render.
3. **Payment** — frontend calls `POST /orders/:id/payment_attempts` then polls status.

## Phase 0 — Complete (2026-08-28)

### What was done

- [x] `AGENTS.md` — project rules at `digis-web/AGENTS.md`
- [x] `docs/handoffs/INTEGRATION_STATUS.md` — this tracking file
- [x] `src/lib/money.ts` — `Money` value object (mirrors `Core::Money`):
  `fromMinor`, `fromMajor`, `plus`, `minus`, `times`, `equals`, `toMajor`, `format`
- [x] `src/lib/utils/format.ts` — `formatPrice(money)` added, `formatETB` deprecated
- [x] `src/lib/mock/events.ts` — all 73 price values converted Birr→cents (×100)
- [x] `src/services/resale.service.ts` — seedListings converted to cents;
  `createListing` converts Birr user input→cents at boundary
- [x] `src/services/tickets.service.ts` — addOns `unitPrice` values converted to cents
- [x] `src/features/event-detail/pages/EventDetailPage.tsx` — hardcoded demo ticket
  prices converted to cents
- [x] Fixed float-money bugs:
  - `ListingDetailSheet.tsx` — `askingPrice * 0.05` → `Math.round(askingPrice * 5 / 100)`
  - `useCheckoutFlow.ts` — `SERVICE_FEE_RATE = 0.05` → `SERVICE_FEE_BPS = 500`
  - `SeatMapStep.tsx`, `ReviewStep.tsx`, `ExtrasStep.tsx`, `AddExtrasDialog.tsx` —
    `total.toLocaleString()` → `Money.fromMinor(total, "ETB").format()`
  - `EventCard.tsx`, `FeaturedEventCard.tsx`, `PurchaseBar.tsx` — `formatETB` → `Money`
  - `OrderSummary.tsx`, `PaymentStep.tsx`, `SuccessView.tsx`, `PromoCodeField.tsx`,
    `CheckoutPage.tsx` — same
  - `ResalePage.tsx` browse listings — `Money.fromMinor` for browse (cents),
    `ETB {price.toLocaleString()}` for myListings (user-entered Birr)
- [x] Build verified: `npx vite build` passes (pre-existing ts errors from React
  namespace / key props are unrelated to this work)

### Files created

| File | Purpose |
|---|---|
| `AGENTS.md` | Project rules for AI sessions |
| `docs/handoffs/INTEGRATION_STATUS.md` | Living tracking doc |
| `docs/superpowers/plans/2026-08-28-frontend-backend-integration.md` | The plan |
| `src/lib/money.ts` | Money value object (mirrors `Core::Money`) |

### Files modified

21 files:
- `src/lib/mock/events.ts` (144 lines changed — price conversion)
- `src/services/resale.service.ts` (seedListings + createListing conversion)
- `src/services/tickets.service.ts` (unitPrice conversion)
- `src/components/EventCard.tsx`
- `src/features/discovery/components/FeaturedEventCard.tsx`
- `src/features/event-detail/pages/EventDetailPage.tsx`
- `src/features/event-detail/components/PurchaseBar.tsx`
- `src/features/event-detail/components/InviteOnlySection.tsx`
- `src/features/event-detail/components/TicketTypeCard.tsx`
- `src/features/resale/pages/ResalePage.tsx`
- `src/features/resale/components/ListingDetailSheet.tsx`
- `src/features/resale/components/ListingSuccessOverlay.tsx`
- `src/features/resale/components/RemoveListingSheet.tsx`
- `src/features/checkout/hooks/useCheckoutFlow.ts`
- `src/features/checkout/pages/CheckoutPage.tsx`
- `src/features/checkout/components/ReviewStep.tsx`
- `src/features/checkout/components/SeatMapStep.tsx`
- `src/features/checkout/components/ExtrasStep.tsx`
- `src/features/checkout/components/OrderSummary.tsx`
- `src/features/checkout/components/PaymentStep.tsx`
- `src/features/checkout/components/SuccessView.tsx`
- `src/features/checkout/components/PromoCodeField.tsx`
- `src/features/tickets/components/AddExtrasDialog.tsx`
- `src/features/tickets/components/TransferTicketDialog.tsx`
- `src/lib/utils/format.ts`
- `src/lib/money.ts`

### Known remaining formatETB import

`src/features/tickets/components/ShareCardParts.tsx` imports `formatETB` but never
calls it (pre-existing dead import — harmless).

## Phase 1 — next

See `docs/superpowers/plans/2026-08-28-frontend-backend-integration.md` for details.

## Phase 3 — Checkout / Resale / Transfers (in progress, 2026-09-04)

### A-fixes (unblock real purchases)
- **Free orders skip payment** — `useCheckoutFlow` calls `createOrder` and
  short-circuits on `total_minor === 0` (the backend's `accept_zero_total!`
  fulfills the order server-side; `StartPaymentAttempt` would reject
  `payment_amount_invalid`).
- **CBE Birr option disabled** — backend `PAYMENT_METHODS` is
  `%w[telebirr card bank]`; "cbe" is rejected. Button rendered disabled with
  "Coming soon" tag (BACKEND_GAPS #17).
- **`crypto.randomUUID` fallback** — exported `randomUuid()` from `api.ts`
  (same v4-from-getRandomValues path); used in `registration.ts` for
  `requestUuid` and per-consent idempotency keys. Fixes the LAN-http crash
  already fixed in `api.ts`.

### C-fixes (flow correctness)
- **`next_action` honored** — `awaiting_approval` → terminal "submission
  received" state with no quote/order. `requires_confirmation` → same. Only
  `requires_order` proceeds.
- **Promo via quote** — mock `promoService.validate` removed; the code
  is sent to `order_quotes.promotion_code` and `invalid_promotion_code` /
  `promotion_unavailable` surface on the promo field.
- **Quote-expiry retry** — `quote_expired` triggers one re-quote before
  failing (10-minute `HOLD_DURATION`).
- **Audience proof threaded** — `accessCode` / `invitationToken` flow from
  `InviteOnlySection` → `Checkout` → `registrationModule.register` (top-level
  params per `RegistrationsController`).

### B-fixes (post-redirect confirmation)
- **Chapa return handling** — new `usePaymentReturnConfirmation` polls the
  wallet every 3s on `?status=return` until a ticket for the event appears
  (the truthful buyer-visible completion signal; no `GET /orders/:id`
  exists — BACKEND_GAPS #18).
- **Mock issuance gated** — `ticketsService.issueTicketsForOrder` runs only
  for non-live carts; live orders rely on the wallet poll.

### Open Phase 3 work (separate pass)
- Resale `purchaseListing` is still 100% mock (BACKEND_GAPS #4 is RESOLVED
  on the backend; just needs wiring — note the public serializer now nests
  event/product/ticket_type/event_dates+venue, so the browse read path can
  be mapped; seller identity stays deliberately absent).
- Transfers (`transferService`) are still 100% localStorage.
- Per-slot registration answers + `form_version_id` blocked by #19.
- ~~The `order_quotes.promotion_code` flow needs a seeded promo fixture~~ —
  **DONE 2026-09-05** (see below).

### e2e
`e2e/checkout.spec.ts` proves the chain on the live backend (login → consent
→ registration → quote → order → Chapa redirect OR typed error OR conflict
choice sheet → View Tickets, for the polluted-buyer case — backend gaps
#21/#22 leave fulfilled regs active, so a fresh-context GA re-buy lands on
the sheet by design).

### D-fixes — retry-safety (2026-09-05, overnight session)
Two buyer-facing errors fixed without touching the backend:
- **"Already registered" (`active_registration_conflict`)** — every Pay click
  generated fresh random consent `request_uuid`s, changing the backend's
  request digest so a retry looked like a *different* registration. Fixed with
  a stable per-checkout key (`digis:checkout-key:<event>:<ticketType>` in
  sessionStorage) used as both the `Idempotency-Key` header and the consent
  `request_uuid` — a retried Pay now replays to the SAME registration.
  (Also fixed a `useRef(fn)` bug that sent a non-UUID and tripped the
  backend's "valid request UUID" validation.)
- **"Payment in progress" (`checkout_restart_payment_in_progress`)** — the
  hosted `checkout_url` is now persisted per order
  (`digis:payment-url:<orderId>`); a retry resumes the payment page instead of
  creating a duplicate order. `payment_already_accepted` /
  `payment_succeeded_pending_acceptance` enter the pending-confirmation state
  instead of erroring. A genuinely pre-existing registration from an earlier
  checkout gets a friendly "check My Tickets" message.
- New friendly codes in `errors.ts`: `payment_attempt_unavailable`,
  `payment_idempotency_conflict`, `idempotency_conflict`.
- `e2e/checkout.spec.ts` guest test fixed (placeholder-addressed Details
  fields). Verified: `checkout.spec.ts` 2/2 + `wallet-audit.spec.ts` 1/1 green;
  a temp VIP-tier proof spec (fresh registration, no prior state) ran the full
  chain to payment and was removed afterwards.
- Buyer `+251900123456` now holds active GA + VIP registrations with pending
  Chapa payments — its `GET /tickets` is 0 until a payment is completed on the
  Chapa hosted page. Paid-ticket wallet proof still needs one real or
  test-mode Chapa payment.

### E-fixes — suite hardening + promo fixture (2026-09-05, afternoon session)

**Suite is green again: 14/14** (`npx playwright test`), tsc clean, build ok.

- **Auth e2e was timing-marginal, not broken.** The signup+auto-login chain
  takes ~5-10s under the single backend container (bcrypt + image-heavy
  discovery page saturating the browser's 6-conn/host pool to `:3000`), and
  the "Welcome to Digis" success screen self-closes after 1.4s — so a 10s
  assertion window was flaky. Fixed by widening the event-driven timeouts in
  `e2e/auth.spec.ts` (login 10→20s, invalid-credentials 5→15s, signup
  10→25s). No fixed sleeps added.
- **TEMP `zz-*.spec.ts` proof scripts are gated out of the default run**
  (`playwright.config.ts` `testIgnore`). They are manual verification tools
  that need a live-Chapa env (Chapa is now enabled in dev via `.env.chapa` —
  see the 2026-09-05 (pm) session) and specific seed buyers/events; run them
  explicitly: `npx playwright test e2e/zz-*.spec.ts`.
- **Promo fixture shipped (seed-side TODO #15 DONE).** Added an active 10%
  `Catalog::Promotion` + `LAUNCH10` `PromotionCode` on the checkout e2e event
  (`on-on`, slug `on-on`) in the frontend-owned `db/seeds_events.rb`
  (idempotent; empty product scope = all tiers eligible). Verified live:
  quote without code → `discount_minor 0`, total 102500; with `LAUNCH10` →
  `discount_minor 10000`, total 92500; unknown code → `422
  invalid_promotion_code`. The frontend already sends `promotion_code` at
  quote time (`order.ts`), so the promo field in checkout now has a real
  fixture to validate against.
- **Pre-existing tsc errors fixed (7 → 0):** AuthContext now threads
  `fieldErrors` through `signUp` (the modal already surfaced them);
  `RemoveListingSheet` takes a `ResaleListing` (was a stale `{ticket, price,
  id}` shape — latent `undefined.price.toLocaleString()` crash on delist) and
  renders via `Money`; gift extras typed `priceMinor` end-to-end;
  SegmentedToggle `onValueChange` casts; `TicketTierFeature.icon` typed
  `ReactElement` for `cloneElement`.

---

## Backend gaps to flag to backend dev (snapshot, see BACKEND_GAPS.md for full detail)

Open blocking: #14 (no guest checkout), #17 (cbe method), #18 (no order read).
Open degrading: #1 (config whitelist), #13 (price_from_minor), #3-nuance
(`requires_ticket`), #19 (no public schema), #8 (no name), #9 (no
profile-update), #10 (no signup validation), #12 (no rate-limit), #20
(audience — backend ready, frontend work in progress).
Deferred by design: #7 (consumer notifications/payouts/promos), #8-deferred
(OTP/Google).
Resolved: #1b, #2, #3 (main), #4, #5, #6, #15.