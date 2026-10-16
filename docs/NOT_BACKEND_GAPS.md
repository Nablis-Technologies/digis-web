# Not Backend Gaps — reclassified, setup, and informational

> Companion to **`docs/BACKEND_GAPS.md`**, which is the backend dev's worklist:
> confirmed deficiencies in the backend's **code / API / contract**. This file
> holds the items that *look* like gaps but are **not**, so that:
>
> - they are **not re-filed as backend gaps** on the next sweep, and
> - `BACKEND_GAPS.md` stays **backend-only**.
>
> Nothing here needs backend product work. Each entry says why it is not a gap
> and which existing surface (or setup step) covers it. Split out of
> `BACKEND_GAPS.md` 2026-10-15.

## Kinds of "not a gap"

| Kind | Meaning |
|---|---|
| **reclassified** | the frontend can satisfy this from an existing backend surface — no backend change is owed |
| **setup** | seeds, dev-env config, provider/dashboard registration, keys, tunnels, deploys — excluded from the gap rules by definition |
| **superseded / re-scoped** | it was a gap under an older contract; the ask is moot now |
| **informational** | a note on backend correctness with no frontend impact (or the frontend is already honest) |
| **false positive** | reported as a defect but the behaviour is correct (verified against the live provider/contract) — withdrawn |
| **deferred** | a product decision, not a bug |

## At a glance

| # | Kind | Summary |
|---|---|---|
| 55 | reclassified | detail `price_from_minor` — derivable from `GET /public/events/:slug/products`; done 2026-10-03 |
| 52 | reclassified | venue/artist `is_following` — derivable from `GET /users/:id/following` (self-scoped) |
| 59 | reclassified + setup | invitation link is frontend-constructible; the unset dev sender is **setup** |
| 60 | false positive | "Chapa `amount` sent 100× too large" — Chapa V2 is **minor-unit on both request and response**, so the request is correct (the real unit defect is `BACKEND_GAPS.md` **#71**) |
| 1 | re-scoped | public config is `%w[public_guest_limit]`; the "widen to 17 keys" ask is moot (lost fields → #53) |
| 53 (superseded half) | superseded | `event_type` / `access_mode` / `rsvp_*` are per-offer now (#44) |
| 53 (unconsumed half) | reclassified / informational | `rating` (event-level) / `answer_edit_window_hours` / `price_foreign_from_minor` have **no frontend consumer**; `price_foreign` is derivable from served per-currency `price_options` — dropped from #53 2026-10-16 |
| 51 (venue stats) | reclassified | venue media/coords are hydratable from public `GET /venues/:id` (seed done 2026-10-15); `VenueSummarySerializer` carrying them is convenience only |
| 51 (gamification) | deferred | profile tier/XP/events-attended/total-spent/achievements are a product decision, never a backend feature |
| 44 (seed note) | setup | the inert keys were only ever written by the seeds — a seed cleanup, not the gap |
| 36 (venue half) | setup/seed | venue geo/media was a **seed** omission — fixed in the seed 2026-10-15 |
| 11 | informational | event-slug `slug_history` 301 table missing (no frontend impact) |
| 16 | informational (resolved) | Chapa v1→v2 migrated 2026-09-15; the tunnel/`config.hosts`/dashboard work is **setup** |
| 37 | informational | residual: a public/guest waitlist-join + invite-request endpoint (a feature ask, not a defect) |
| 38 | informational | `requires_ticket` exposed but unenforced at quote/order time (a feature ask) |
| 8-deferred | deferred | Google / check-account / password-reset auth |
| — | deferred | consumer promos — the quote path already accepts `promotion_code` |
| — | setup | seed-side review + the frontend-owned seed TODOs |

---

## False positives — withdrawn

Items filed as backend defects that turned out **not** to be defects. Each was
re-checked against the **live** provider/contract; they must not be re-filed.

### #60. Chapa payment amount is sent 100× too large — FALSE POSITIVE (withdrawn 2026-10-16)

Filed 2026-10-01, arguing `integer_amount(request.fetch(:amount_minor))` posts the
amount in minor units while "Chapa expects the major unit", i.e. every payment is
100× too large and large orders fail Chapa's max-amount check. **The claim is the
wrong way round.**

Chapa V2 is **minor-unit on both sides**:

- Live sandbox probe 2026-10-16: `POST /v2/payments/hosted { amount: 100, currency:
  "ETB" }` → the hosted page rendered **“Amount to Pay 1.03 ETB”** (sub-total `1.00` +
  `charge 0.03`); completing the payment (test phone `0900123456`) gave a receipt
  **Sub Total 1.00 ETB / Charge 0.03 ETB / Total 1.03 ETB**; and
  `GET /v2/payments/HC50DSRDqACO/verify` returned `"amount":100, "service_fee":3`.
- So `amount_minor = 100` → **1.00 ETB** ✓. The original “153,750 ETB order → props
  `amount: 15375000`” evidence actually *confirmed* correctness (15,375,000 minor =
  153,750.00 ETB); the *"amount is greater than the maximum amount supported by the
  currency"* error was Chapa's per-transaction cap on a large order — not a unit bug.

No backend change is owed for the **request** the way #60 described. The genuine unit
defect is on the **response** side (`minor_amount(...) × 100` inflating
`provider_fee_minor`) — filed separately as **`BACKEND_GAPS.md` #71**.

## Reclassified — the frontend can satisfy this itself

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

### #53 (unconsumed half) — `rating` / `answer_edit_window_hours` / `price_foreign_from_minor`

**Not frontend needs (dropped from the `BACKEND_GAPS.md` #53 field list
2026-10-16).** #53 was filed for the non-admission detail fields the public event
payload stopped exposing. A live re-check of the five fields the 2026-10-02
re-scope listed found only `age_restriction` + `seat_map` are actually consumed by
the app; the rest are **not needs**:

- **`rating` (event-level)** — **no consumer**. The only `.rating` reader is the
  *artist* rating from the lineup (`LineupSection.tsx:29`), which is #36's gap; no
  event-level rating surface exists (discovery/`EventCard` render none).
- **`answer_edit_window_hours`** — **no consumer**: passed through the checkout
  props into `useCheckoutFlow`, but never read in the hook body. The backend models
  the correction window as the per-ticket-type
  `transfer_cutoff_seconds_before_start` (`Ticketing::Answers::Revise`), not a
  per-event hours value.
- **`price_foreign_from_minor`** — **no consumer**, and **derivable**: the public
  products payload already serves per-currency `price_options[]`
  (`currency`, `amount_minor`, `active_from`, `active_to`,
  `Catalog::Public::EventProductSerializer#price_options`), so an
  international/foreign price is simply a non-event-currency price option.

**Status: dropped from #53 2026-10-16 (no consumer / derivable).** #53's remaining,
real part is `age_restriction` + `seat_map`.

### #51 (venue stats half) — venue media/coords are hydratable from `GET /venues/:id`

**Reclassified 2026-10-16 (was bundled in `BACKEND_GAPS.md` #51).** The venue sheet
needs media + coordinates; `VenueSummarySerializer` (the minimal nested summary on
the event payload) carries neither. But the venue is **fully hydratable from the
public detail endpoint** `GET /venues/:id` (serves `latitude`/`longitude` + the
ActiveStorage `profile`/photos), and the venue *media/coords* **seed** task is done
(2026-10-15). So the summary omitting them is a convenience gap, not a defect — the
frontend can fetch the venue detail for the sheet and drop the fabricated
followers/amenities.

**Status: reclassified 2026-10-16 — hydrate from `GET /venues/:id`; no backend change
owed.** (Venue geo/media was already recorded as the "#36 seed half" — fixed in the
seed 2026-10-15.)

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

---

## Setup — not a gap

### #16. Chapa v1 vs v2 (RESOLVED — V2 migrated 2026-09-15) + the dev tunnel setup

Backend now implements **Chapa API V2 only** (`api.chapa.global`, `POST
/v2/payments/hosted` + `/v2/payments/direct`). V1 `CHASECK_*` validation is
removed; `ChapaClient`/`ChapaPayoutClient` require `CHAPA_TEST_`/`CHAPA_LIVE_`
key prefixes matching `CHAPA_MODE` (`chapa_client.rb:388-394`,
`chapa_payout_client.rb:174-175`). The `PaymentSerializer` shape is unchanged,
so no consumer wiring was needed beyond the dev `.env.chapa` key-format fix.
Direct charge and `cbebirr`/`mpesa`/`awashbirr` are adapter capabilities; the
domain `Orders::Payment::PAYMENT_METHODS` enum now includes `cbebirr` (resolved
2026-10-16 — see `BACKEND_GAPS.md` #17).

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

### Venue geo/media — the "#36 seed half" (fixed 2026-10-15)

The "venue media/coords" half of #36 was **never a backend gap**. It was split
out 2026-10-02 (public `GET /venues/:id` already serves `latitude`/`longitude` +
ActiveStorage `profile`/`photos`, and `event_dates[].venue.id` is public), then
found SEED-BLOCKED 2026-10-03 (every seed venue returned blank coords /
`profile_url: null` / `gallery_urls: []`). It was a **seed task, not a gap** and is
now **fixed in the seed (2026-10-15)** — see `docs/handoffs/DATA_INTEGRITY_AUDIT.md`
→ "Seed-side fixes (2026-10-15)". Nothing about the venue is tracked as a gap.
(#36's remaining **lineup** half is a real backend serializer gap and stays in
`BACKEND_GAPS.md`.)

### Seed-side review (2026-09-04)

The dev seeds (`db/seeds_events.rb` — the frontend-owned mock-mirror;
`db/seeds/preview.rb`) exist so the UI has data. **Seed-side issues are fixed in
the seed, not tracked as backend gaps.** Past seed fixes: **#30** (parking
`product_access` + `PARKING` zone per parking add-on) and **#35**
(`max_packages_per_user: 10` on the free-RSVP fixture) — see the Resolved
archive in `BACKEND_GAPS.md`.

Every open gap in `BACKEND_GAPS.md` is backend serializer/code-level, not a seed
problem. The mock-mirror seed writes everything the backend can possibly consume
(full `event_setting.config` JSONB, `price_from_minor` via `Catalog::ProductPrice`,
`requires_ticket` via product metadata). **Venue geo/media was the one real seed
omission — fixed 2026-10-15** (see `DATA_INTEGRITY_AUDIT.md`). The remaining
seed-side TODO is populating `event_participants` once the backend exposes the
lineup (#36) — a fixture with no public projection is invisible, so it waits.

**Seed-side TODO (frontend-owned):** a genuinely **multi-day** event and a
**recurring** series (the mock-mirror has neither — `festival.spec.ts` and
`recurring.spec.ts` are route-mocked because of it). Design + status in
`DATA_INTEGRITY_AUDIT.md` → "Seed-side fixes (2026-10-15)".

**Seed-side TODO (frontend-owned, Phase 3):** ~~add a promotion + promo code
fixture so `order_quotes.promotion_code` can be integration-tested.~~
**DONE 2026-09-05** — active 10% promotion + `LAUNCH10` code on `on-on`;
verified live (quote applies `discount_minor`, unknown codes →
`invalid_promotion_code`).

---

## Superseded / re-scoped — was a gap, no longer filed

### #1. Public `event_setting.config` projection truncated to 2 keys

`Events::Public::EventSettingSerializer` whitelists only
`%w[public_guest_limit]`
(`app/serializers/events/public/event_setting_serializer.rb`). This is
**re-scoped, not widened** (2026-09-30): the "widen to 17 keys" ask is moot. The
frontend no longer reads `event_setting.config` for discovery at all — the
adapter maps only what the public serializers actually serve, and the genuinely
lost non-admission fields are tracked under **#53**. The superseded
type/access/rsvp keys are per-offer now (#44), and discovery **Featured** has its
own surface as of 2026-10-15 (the Featured endpoint — see the Resolved archive).

**Status: resolved 2026-09-30 (re-scoped).** It had briefly been recorded
resolved on the strength of a **local-only commit of ours** (`648d21d`, which
widened the whitelist to 19 keys); that patch is not on the backend branch and
was reverted. The gap as originally written is moot: `%w[public_guest_limit]`
remains the whole public projection.

### #53 (superseded half) — the `rsvp_*` / `event_type` / `access_mode` keys

**Superseded by the per-offer model (NOT a gap).** `event_type`, `access_mode`,
`invite_only_paid`, `on_guest_list`, `invite_waitlist_only`, `waitlist_ahead`,
`rsvp_going`, `rsvp_capacity`, `allows_plus_one`, `max_guests`,
`rsvp_requirements`. The real admission contract is per-offer
(`ticket_type.approval_mode` / `audience` / `waitlist_enabled` + `price_options`);
the frontend must source gating from the offer, not from event config (see #44).
(#53's other half — `age_restriction`, `seat_map`, `rating` genuinely lost — is a
real gap and stays in `BACKEND_GAPS.md`.)

### #44 (seed note) — the inert keys were only ever written by the seeds

**Seed note (not part of the gap):** these keys were only ever *written* by the
dev seeds — and since the Composable Admission Selection release the mock-mirror
has written a non-admission whitelist instead, so they never even reached the DB.
`pazimo_seed.rb` still computed them until 2026-10-15; that dead computation is
removed (a **seed cleanup**, recorded in `DATA_INTEGRITY_AUDIT.md` — a seed that
writes inert keys is not a gap). The gap itself (#44) is entirely backend: the
config is inert and unwritable.

---

## Informational — no frontend impact (or the frontend is already honest)

### #11. Slug namespace safety + redirects (PARTIALLY ADDRESSED)

A `RESERVED_SLUGS` denylist exists on the short-link model
(`app/models/links/short_link.rb:12`, validated at `short_link.rb:58`) guarding
the branded-link space. What remains: an event-slug `slug_history` 301 table so
renamed event slugs keep their old URLs. Frontend needs zero changes.

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
invite-request endpoint. This is a **feature ask**, not a defect — the
authenticated waitlist works.

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
when the buyer has no ticket (or no ticket in the order) for the event. A
**hardening ask**, not a defect the frontend is blocked on.

---

## Deferred by design

Product decisions, not bugs. Re-open only if requirements change.

### Auth: no Google / check-account (deferred by design)

*(Formerly labelled `#8-deferred` — #8 itself is resolved 2026-10-16; `#57` now
carries the missing password-reset endpoint.)*

Phone-OTP verification now EXISTS (guest claim flow, #14; signup OTP, #56); Google
and check-account remain removed from the UI. Add only if the product spec demands
these flows. Password **reset** is a real gap (`BACKEND_GAPS.md` #57), not a
product deferral.

### Consumer promos

`/catalog/promotions` is organizer CRUD. `order_quotes` accepts `promotion_code`
server-side (`Orders::BuildQuote` + `order_quotes_controller.rb`, verified
2026-09-09) so the consumer path runs through the quote. Confirm and drop the
standalone UI validate when wiring.

### Profile gamification (deferred by design)

**Reclassified 2026-10-16 (was bundled in `BACKEND_GAPS.md` #51).** ProfilePage's
tier / XP / events-attended / total-spent / achievements have no backend surface at
all — but that was never a backend *feature*, it's a product decision the backend
hasn't made. Not a defect to fix; re-open only if the product spec demands
gamification. (The backend does serve the organization/artist/venue profile stats it
models: `events_count`, `follower_count`, `verified`.)

**Status: deferred 2026-10-16 — product decision, not a gap.** Remove the fabricated
profile widgets (frontend housekeeping) until/unless gamification is specified.
