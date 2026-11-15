# Plan — Adopt the Composable Admission Selection backend

- **Date:** 2026-09-30
- **Backend ref:** `origin/feat/launch-hardening-telemetry` @ `326f6a3` (41 commits ahead of our local `a470c76`)
- **Frontend:** `feat/frontend-backend-integration` (uncommitted glass/fixes on the tree)
- **Source of truth:** the Rails serializers/controllers/services at `326f6a3` (verified by reading the
  upstream tree, not the handoff doc). Where the handoff guide disagrees with the code, **the code wins**
  (see “Guide review” below).

## 1. Why

The backend replaced event-level “RSVP vs Ticketed” modes with an **offer-driven** model:
an event is a container of ticket offers (`Catalog::EventProduct` + `Ticketing::TicketType`), and
the attendee submits a **selection** (`POST /public/events/:slug/admission_selections`) that the
server turns into 1 registration set + 1 quote + 1 order + 1 payment decision, returning a
`next_action`. The old `/public/events/:slug/rsvps` family is **deleted**, and the public
`event_setting.config` projection was gutted. Our frontend is consequently broken against this API.

## 2. What the backend changed (verified against the code)

### 2.1 Routes

**Retired (deleted):**

- `POST /public/events/:slug/rsvps`
- `POST /public/events/:slug/rsvps/request_otp`
- `POST /public/registrations/:id/waitlist/enqueue`
- `POST /public/registrations/:id/waitlist/accept`

**New / canonical:**

- `POST /public/events/:event_slug/admission_selections` → `Orders::AdmissionSelections#create`
- `POST /public/events/:event_slug/admission_selections/request_otp` → `#request_otp`
- `POST /public/events/:event_slug/admission_offers/:event_product_id/waitlist`
- `POST /public/events/:event_slug/admission_offers/:event_product_id/waitlist/request_otp`

**Unchanged (still exist):**

- `GET /public/events/:event_slug/products`
- `GET /public/events/:event_slug/ticket_types/:tt/consent_requirements`
- `GET /public/events/:event_slug/ticket_types/:tt/registration_schema`
- `POST /ticketing/audience_authorizations` (the pre-check gate still exists)
- `POST /ticket_types/:tt/registrations`, `POST /guest/ticket_types/:tt/registrations`
- `POST /order_quotes`, `POST /guest/events/:id/order_quotes`, `POST /guest/orders/:id/payment_attempts`,
  `POST /guest/payments/:id/refresh`

### 2.2 Public event payload — the big break

`Events::Public::EventSettingSerializer` at `326f6a3` is now:

```ruby
PUBLIC_CONFIG_KEYS = %w[public_guest_limit].freeze
```

**Only `public_guest_limit` survives.** The handoff guide says only `allow_waitlist`/`event_type` were
removed — that is wrong. Gone from the public surface (confirmed: the key strings appear nowhere under
`app/` except one private waitlist helper):

`event_type, sold_out, tickets_left, featured, rating, price_foreign_from_minor, foreign_currency,
seat_map, answer_edit_window_hours, rsvp_going, rsvp_capacity, allows_plus_one, max_guests,
rsvp_requirements, access_mode, invite_only_paid, on_guest_list, age_restriction, lineup, organizers,
invite_waitlist_only, waitlist_ahead`.

`EventListSerializer` attributes: `id, slug, title, description, visibility, timezone, currency,
published_at, price_from_minor` + `categories, event_dates, event_media, event_organizations,
event_setting, organization`.
`EventDetailSerializer`: same **minus `price_from_minor`** (detail must compute “from” price from products).

### 2.3 Offers (`Catalog::Public::EventProductSerializer`)

```
id, event_id, name, description, type, allow_custom_price, sales_start_at, sales_end_at,
min_per_order, max_per_order, schedule_change_refund_policy, sort_order, price_options,
available (boolean), requires_ticket
ticket_type: { id, event_product_id, approval_mode, audience, date_selection,
               admissions_per_unit, waitlist_enabled }
price_options[]: { currency, amount_minor, active_from, active_to }
```

- `available` is a **boolean**, not a count.
- `min_per_order`/`max_per_order` live on the **product**, not the ticket_type.
- `approval_mode ∈ {automatic, manual}`; `audience ∈ {public, access_code, invitation, code_or_invitation}`;
  `date_selection ∈ {fixed, choose_one}`; `waitlist_enabled` boolean.

### 2.4 `admission_selections` request/response

Request (`admission_selection`):

```json
{
  "admission_selection": {
    "charge_currency": "ETB",
    "promotion_code": "OPTIONAL",
    "phone": "+251...",
    "phone_confirmation": true,
    "verification_token": "signed-otp-proof",
    "email": "optional@x.com",
    "full_name": "Optional Name",
    "items": [
      {
        "event_product_id": "…",
        "registration_id": "…(only for an accepted-waitlist offer)",
        "quantity": 1,
        "selected_event_date_id": "…(required when date_selection=choose_one)",
        "audience_proof": { "access_code": "…" },
        "answers": [{ "form_version_id": "…", "question_key": "…", "value": … }],
        "consents": [{ "consent_document_version_id": "…", "request_uuid": "…",
                       "acceptance_method": "checkbox", "content_sha256": "…" }]
      }
    ]
  }
}
```

Rules enforced by `Create`:

- `Idempotency-Key` header **required**; bearer optional (must be valid if present).
- A **manual-approval** offer must be submitted **alone** (`admission_selection_manual_approval_mixed`).
- Each item must carry `answers` and `consents` arrays (may be empty).
- Guest (`guest: true`) requires either a valid `verification_token` (`purpose: "guest_admission"`) or
  `phone_confirmation: true`; a free guest selection with neither returns the
  `phone_verification_required` **error** (422), not a next_action.

Response `201`:

```json
{ "data": {
  "order": { … },                     // present when a checkout is created
  "registration": { … },              // present for the single manual/free-registration path
  "registrations": [{ "id", "status", "next_action" }],
  "next_action": { "type": …, "order_id"?, "charge_currency"?, "amount_minor"?, "expires_at"?, "registration_id"?, "event_product_ids"? },
  "guest_order_token": "…"            // guests + pending_payment + phone only
} }
```

`next_action.type` values actually produced:

| Source | Values |
| --- | --- |
| `result_for_order` | `checkout_required` (pending_payment), `issuing` (paid/fulfilled, tickets < expected), `confirmed` (fully issued), else the order status |
| `result_for_registration` | `Ticketing::RegistrationNextAction` → `awaiting_approval` (pending_approval), `requires_order` (pending_payment/offered), `waitlisted`, `confirmed`, `rejected`, `cancelled`, `expired` |
| sold-out cart | `waitlist_available` + `next_action.event_product_ids` |

> The guide’s `phone_verification_required` is an **error code**, not a `next_action.type`. A waitlisted
> registration reads `waitlisted`; the cart-level sold-out reads `waitlist_available`.

### 2.5 Guest payment

`guest_order_token` (issued by selection) is passed as **`order_access_token`** to
`POST /guest/orders/:id/payment_attempts` and `POST /guest/payments/:id/refresh`
(see `Orders::ResolveGuestOrderAccess`). Legacy `quote_token` also accepted.

### 2.6 Waitlist (offer-scoped)

`POST /public/events/:slug/admission_offers/:event_product_id/waitlist` body
`{ "waitlist": { "phone", "verification_token"?, "quantity"?, "selected_event_date_id"?, "access_code"?, "invitation_token"?, "email"?, "full_name"?, "answers"?, "consents"? } }`
→ `{ data: { registration, next_action: { type: "waitlisted" } } }`.
Guest OTP via `…/waitlist/request_otp` body `{ "waitlist": { "phone", … } }`.
A supplied bearer token is **mandatory to validate** (not silently downgraded).

## 3. Guide review (accuracy)

| Guide claim | Verdict | Reality (code) |
| --- | --- | --- |
| Route names for selection/OTP/waitlist | ✅ | match |
| Item keys `event_product_id/quantity/selected_event_date_id/audience_proof/answers/consents` | ✅ | also `registration_id` for accepted waitlist offers |
| `ticket_type.audience_type` | ❌ | key is **`audience`** |
| `min_per_order`/`max_per_order` on ticket_type | ❌ | on the **product** |
| `event_setting` drops only `allow_waitlist`/`event_type` | ❌ | drops **everything except `public_guest_limit`** |
| `phone_verification_required` as a `next_action.type` | ❌ | it is a 422 **error code** |
| `awaiting_approval` next_action | ✅ | via `RegistrationNextAction` |
| `guest_order_token` → `order_access_token` | ✅ | match |
| Unified `next_action` switch | ✅ | plus `requires_order`, `waitlisted`, `rejected`, `cancelled`, `expired`, `issuing` |
| “Manual offer submitted alone” | ✅ | server rejects mixing |
| `EventDetailSerializer` has `price_from_minor` | ➖ | only the **list** serializer has it |

## 4. Backend sync (Phase 0) — needs a decision

Local backend state today:

- Branch `feat/launch-hardening-telemetry` is **41 behind / 7 ahead** of upstream.
  The 7 local commits include dev setup (`feat(dev): log OTP codes`, `fix(dev): kill bind-mount overhead`,
  seed fixes) **and a product change** `648d21d feat(events): expose full public config projection`.
- Uncommitted working-tree changes: `app/serializers/events/public/event_setting_serializer.rb`
  (widens the public projection — a *product* change, superseded by upstream), `config/environments/development.rb`,
  `config/recurring.yml` (dev setup), `db/pazimo_seed.rb`, `db/seeds_events.rb`, `db/pazimo/events_raw.json` (dev seeds).

Because the frontend is the source-of-truth consumer, it must run against **`326f6a3`**.

Recommended (frontend-dev-safe):

1. Save the dev-setup diffs (`config/environments/development.rb`, `config/recurring.yml`, `db/**`) somewhere.
2. **Discard** the `event_setting_serializer.rb` working change (not ours; upstream now governs the projection).
3. Move the local branch onto upstream without the product commit — e.g. create a fresh branch at
   `origin/feat/launch-hardening-telemetry` and drop `648d21d` (the product commit), keeping only dev setup.
   (Do **not** hand-merge `648d21d` — its whole purpose is now reverted upstream.)
4. Re-apply dev setup as a separate `chore(dev)` commit.
5. **Rebuild the dev DB** (migrations/seeds changed; the project edits migrations in place, so
   `db:drop db:create db:migrate` → load `db/queue_schema.rb` → strip the stray schema_migrations version
   → `db:seed`), then re-probe the live API.

> This is destructive git work on the backend. It should be confirmed explicitly before execution, and
> the frontend dev must not “own” backend product commits.

## 5. Frontend work — slices

Each slice is a tracer bullet: wire one surface, verify against the live API, keep tsc/vitest/build green.

### Slice A — De-mode the domain type + adapter
- `src/types/event.ts`: remove the offer-mode/config fields that can no longer be populated
  (`eventType`, `soldOut`, `ticketsLeft`, `featured`, `rating`, `seatMap`, `accessMode`, `inviteOnlyPaid`,
  `onGuestList`, `guestName`, `inviteWaitlistOnly`, `waitlistAhead`, `rsvp*`, `ageRestriction`, `lineup`,
  `answerEditWindowHours`, `priceForeignFromMinor`) — or keep only what a live endpoint still serves.
- `src/lib/events-adapter.ts`: drop the `config.*` reads (all undefined at `326f6a3`); map `organizers`
  from the `event_organizations` association instead of `config.organizers`; keep `price_from_minor`
  (list only) and derive detail from products.
- Update `events-adapter.test.ts`.

### Slice B — Products → admission offers
- `src/lib/products.ts`: **stop dropping free tickets** (`priceMinor <= 0`) — free admission is the point.
- Carry `minPerOrder`, `maxPerOrder`, `approvalMode`, `waitlistEnabled`, `audience`, `dateSelection`,
  `admissionsPerUnit` onto each offer; keep `available` boolean (not a count).
- Expose `price_options` so display uses the selected `charge_currency` (ETB/USD).
- Extend `TicketTier`/introduce an `AdmissionOffer` shape; keep `applyRankAccents` presentation.

### Slice C — Event detail: offer-driven rendering
- `EventDetailPage.tsx`: delete `isRsvp`/`isInvite` branching; render offers from products.
- Replace/retire `RsvpSection`, `InviteOnlySection`, `GatedTierGate` as *event-mode* gates:
  - automatic offer → quantity `[-] n [+]` bounded by `min_per_order`/`max_per_order`;
  - `approval_mode = manual` → “Apply / Request to join” (single-offer basket only);
  - `audience != public` → inline access-code / invitation field (server-validated via
    `ticketing/audience_authorizations`, carried into the selection as `audience_proof`);
  - `available = false` + `waitlist_enabled` → “Join waitlist”;
  - `date_selection = choose_one` → event-date dropdown.
- Purchase/selection bar shows basket + server-derived total (no frontend fee engine).

### Slice D — Unified selection module + `next_action`
- New `src/lib/admission.ts`: `requestOtp()` and `create()` mirroring the contract.
- Branch **only** on `data.next_action.type`: `checkout_required` → open checkout with the returned order
  (+ `guest_order_token`); `confirmed` → confirmation; `issuing` → “securing” + poll; `awaiting_approval`
  → “application submitted”; `waitlist_available` → sold-out prompt with `event_product_ids`;
  `requires_order`/`waitlisted`/`rejected`/`cancelled`/`expired` handled explicitly.
- Treat `phone_verification_required` (+ `phone_confirmation_required`/`phone_verification_invalid`)
  **errors** as “prompt OTP, then resubmit with `verification_token`”.
- Retire `registration.ts`'s `rsvpRequestOtp`/`rsvpSubmit` (deleted routes); keep
  `consent_requirements`/`registration_schema` fetchers.

### Slice E — Waitlist (offer-scoped)
- New `src/lib/waitlist.ts`: `requestOtp()`, `join()`; guest OTP + `audience_proof`; `waitlisted` outcome.

### Slice F — Checkout / guest payment
- Thread `order_access_token` (`guest_order_token`) into `guest_payment_attempts` and `guest_payment_refresh`.
- Verify the legacy register→quote→order path still works for the paid flow, or migrate it to
  `admission_selections` (decide during Slice D — the guide directs to the unified path).
- Consume `admissions_per_unit` for quantity/seat math instead of the removed `isCouples/seats`.

### Slice G — Discovery
- `EventCard.tsx`, `FeaturedEventCard`, `FeaturedMagazine`, `CountdownBadge`, `useEventFilter.ts`:
  remove `soldOut`/`ticketsLeft`/`featured`/`rating`/`eventType` reads.
- `eventActionLabel` → a single “Get tickets”; drop RSVP/Invite labels.
- Availability on the grid is **not** in the list payload → either fetch products per card (N+1, avoid)
  or file a backend gap for a batched availability projection.

### Slice H — Tests + docs
- Update unit tests for every touched module; run tsc / vitest / build / Playwright.
- Update `docs/BACKEND_GAPS.md` and `docs/handoffs/INTEGRATION_STATUS.md`.

## 6. Backend gaps to file (only after probing `326f6a3` live)

1. **Public event payload loses non-admission fields the UI needs** — `age_restriction`, `lineup`,
   `seat_map`, `featured`, `rating`. Confirm intent; if intentional, request dedicated public fields.
2. **Discovery availability** — no `sold_out`/`tickets_left` (or per-offer availability) on the list
   serializer; products are per-event. Request a batched availability projection.
3. **`event_setting.config` reduced to `public_guest_limit`** — confirm this is intended; the frontend
   also loses `answer_edit_window_hours` and the plus-one/guest caps.
4. **`EventDetailSerializer` lacks `price_from_minor`** — detail must compute it; harmless but noted.
5. **Guide mismatches** (`audience_type`→`audience`; min/max on product) — documentation follow-up, not a gap.

## 7. Verification

- Live probes against `326f6a3`: `products`, `admission_selections` (free, paid, mixed, guest OTP,
  manual, sold-out→`waitlist_available`), offer-scoped waitlist, guest payment with `order_access_token`.
- `npx tsc --noEmit`, `npx vitest run`, `pnpm build`, targeted Playwright.
- Keep every backend product change out of our commits; log gaps rather than patching `digis_backend`.

## 8. Open decisions (need the user)

1. **Phase 0 git reconciliation** — approve discarding the local product commit + working serializer patch
   and syncing the backend to `326f6a3` (keeping dev setup)?
2. **Paid checkout** — migrate wholesale to `admission_selections`, or keep the legacy
   register→quote→order path for paid tiers and migrate only free/manual/waitlist now?
3. **Discovery availability** — accept no grid sold-out signal until a backend gap lands, or add per-card
   product fetches (N+1)?
