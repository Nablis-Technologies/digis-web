# Confirmed Backend Gaps (digis_backend)

Local setup update 2026-11-01: user-authorized development reset ran the existing
migrations from scratch. `orders_gift_purchases.client_line_id` now exists in this
fresh local database. **#76 stays open for existing databases** because no forward
migration was supplied; this setup action is not a backend fix or gift acceptance.

## Targeted recheck 2026-11-01 — #71 and #72 still open

Fresh `git fetch origin` found no newer launch-hardening commit than `c15d6ff3`.
Compared fetched source with local `5c2890c7`: #71 still maps provider fees through
`minor_amount`, which multiplies by 100; #72 detail serializer still omits
`event_lifecycle` and `ticket_availability`. Neither fix has landed on the tracked
backend branch. Existing frontend lifecycle mitigation remains; no backend edits.

## Re-verification 2026-11-01 — latest backend pulled and wired

Fetched remote `c15d6ff3` and merged six commits into local `5c2890c7`.
Existing uncommitted seed/catalog changes preserved with autostash/reapply;
no local backend product edits. Full gap/consumer sweep:
`.scratch/backend-wireup-2026-11-01/gap-sweep.md`.

**#75 resolved:** real sandbox payment acceptance passed after restarting old
Rails/worker processes onto pulled code. **#74 partial:** committed line-ID batch
contract is frontend-wired and tested; **new #76 blocks existing-database gift
rollout** (no forward migration for client_line_id). No other incoming consumer
contract changes; existing resolved/partial consumers checked and retained.

Current open blocking: **#53 seat_map / #57 / #73 / #76**. Partial **#74**.
Degrading unchanged: **#44 / #46 / #48 / #67 / #71 / #72**.
55 frontend browser/API tests, 259 units, typecheck and build pass; live ordinary
payment acceptance passes. Live gift checkout is not certified until #76 is fixed.
Historical sweep sections below describe their respective dates.

## Re-verification 2026-10-24 — fetched backend unchanged

Fetched `origin`: tracked remote `feat/launch-hardening-telemetry` remains
`8419aaaf`. Local HEAD `55f535dd` is ahead 10 / behind 0, with identical committed
`app/`, routes and database structure. Existing backend setup changes preserved;
no backend product edits or merge performed.

All ten previously open entries rechecked. **No newly resolved backend contract**
and no new frontend wiring owed. #44 narrowed to inert `public_guest_limit`;
obsolete admission config is superseded. #65 reclassified to provider-recipient /
settlement verification (NOT_BACKEND_GAPS), **not** declared fixed. #72 remains
open with its existing frontend schedule mitigation now documented. #73 remains
a requested backend contract dependency, not an existing broken achievement engine.

Current open: blocking **#53 seat_map / #57 / #73 / #74 / #75**; degrading
**#44 / #46 / #48 / #67 / #71 / #72**. All resolved/partial surfaces were checked
for incoming contract changes; existing consumers remain wired. Unsupported
Settings claims under #48 are tracked as a frontend follow-up.

Evidence and per-gap wiring sweep:
`.scratch/backend-gap-audit-2026-10-24/spec.md`.
Source-only verification: Docker Desktop launched but engine remained unavailable;
localhost:3000 refused connection. No new live/provider/settlement claims.

> **Backend defects only — this is the backend dev's worklist.** Every confirmed
> deficiency in the backend's **code / API / contract** that the backend dev must
> fix, **verified against the actual backend code** (serializers, policies,
> controllers, routes). The frontend does NOT work around these (ADR-0002) — it
> disables/hides until the backend resolves them.
>
> **Not a backend defect → not here.** Reclassified (frontend-fixable) items,
> setup chores, superseded halves, informational notes, and deferred product ideas
> live in **`docs/NOT_BACKEND_GAPS.md`**, each with the reason it is not a backend
> gap, so it is never re-filed. (The dated sweep logs below are historical records
> and may name items that have since moved there.)
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
>
> **Re-verified 2026-10-16 against `feat/launch-hardening-telemetry`** — the branch
> behind backend **PR #37** (`origin` at `67e3a281`; local `HEAD` is origin + dev-only
> `chore(dev)` seed commits, so every `app/` fix below is the backend dev's own
> committed work). Every open item re-checked by code read **and** live HTTP against
> the running `:3000`.
>
> **Newly resolved — 8 items (verified; most already frontend-wired):**
> - **#17** `Orders::Payment::PAYMENT_METHODS` now includes `cbebirr`
>   (`app/models/orders/payment.rb`); the CBE Birr option is enabled and sends
>   `cbebirr` (`PaymentStep.tsx`). Residual: `Commercial::FeeComponent::PAYMENT_METHODS`
>   is still `%w[telebirr card bank]`, so a fee component cannot be *scoped* to
>   `cbebirr` (the default nil-scoped component applies) — no live impact.
> - **#8** `Core::CurrentUserSerializer` serves `profile.first_name/last_name/full_name/
>   avatar_url` (`aad3a903`); signup creates the profile. Frontend maps `full_name`.
> - **#9** `resource :user, only: %i[show update]` → `GET`/`PATCH /user`
>   (`config/routes.rb:11`). Frontend `me()`/`updateProfile()` wired.
> - **#56** `Core::Signups::Complete` OTP-verifies the phone and **upgrades the shadow
>   user** (`aad3a903`). Frontend `requestSignupOtp`/`verifySignupOtp`/`signUp` wired.
> - **#47** gift purchase flow (`e5e3dc8d`, 2026-10-07): public
>   `POST /public/gift_purchases/:id/resolve|claim`, `GET /orders/:order_id/gift_purchases`,
>   resend, and a checkout gift intent. Frontend `gifts.ts`/`GiftTicketDialog`/`ClaimGiftPage`
>   wired.
> - **#58** the `active_checkout_exists` 409 now carries
>   `meta.active_checkout { order_id, expires_at, payment, order_access_token }`
>   (`Orders::ActiveCheckoutRecovery`, `b1d6e86f`).
> - **#61** an **in-app `transfer_incoming`** notification now fires on transfer
>   initiation for `to_user` (`Messaging::OutboxHandlers::PublishTransactionalNotification`
>   `EVENT_TYPES` + `notification_types.rb:121`). Residual: no incoming-transfers list
>   endpoint (the notification + the authenticated `POST /ticket_transfers/:id/accept`
>   cover discovery).
> - **#62** `Ticketing::TicketWalletSerializer` serves
>   `pending_transfer { id, status, expires_at }`.
>
> **Still open after the 2026-10-16d re-check:** blocking — #53, #57, #65.
> Degrading — #36, #44, #46, #48, #49, #50, #68, #69, #70, #71. (Superseded by the
> 2026-10-16e pull below: #49/#50/#68/#69/#70 are now resolved.)
>
> **Corrections to open entries:** ~~**#49** pagination is served now …~~
> (superseded — #49 is fully resolved by the 2026-10-16e pull). **#46** follows to
> venues/artists/organizations **do** exist (`config/routes.rb:81`) — only
> saved/feed/reviews are missing. **#50** `GET /registrations/:id` exists
> (`resources :registrations, only: :show`).
>
> **Frontend-wiring sweep:** #17/#8/#9/#56/#47 are **already consumed** by the app
> (no work owed). #58, #61 and #62 have a status change the frontend should consume →
> tracked in `.scratch/gap-wiring-2026-10-16/`.
>
> **Correction 2026-10-16b (live Chapa sandbox probe) — #60 is a FALSE POSITIVE,
> withdrawn; #71 filed.** #60 claimed the Chapa request `amount` is posted in minor
> units and is therefore **100× too large**. That is **wrong**: Chapa V2 is
> **minor-unit on both sides**. Decisive live probe (dev test key, `2026-10-16`):
> `POST /v2/payments/hosted` with `amount: 100` made Chapa render **“Amount to Pay
> 1.03 ETB”** (sub-total `1.00` + `charge 0.03`); completing the payment gave a
> receipt **Sub Total 1.00 ETB / Charge 0.03 ETB / Total 1.03 ETB**, and
> `GET /v2/payments/:ref/verify` returned `"amount":100, "service_fee":3`. So
> `integer_amount(amount_minor)` is **correct**, and the original “153,750 ETB order →
> props `amount: 15375000`” evidence actually *confirmed* it (15,375,000 minor =
> 153,750.00 ETB; it tripped Chapa's **max-amount** check only because the order was
> large). The **same adapter** has the real, opposite defect: the **response** fee
> conversion (`minor_amount(...) * 100`, `chapa_client.rb:230`) inflates the real
> minor-unit `service_fee`/`charge` by 100× → filed as **#71** (degrading).
>
> **Correction 2026-10-16d — false-positive re-check of every remaining open gap:
> no additional whole-gap false positives; #53 re-scoped.** Every open item
> (blocking **#53/#57/#65**; degrading **#36/#44/#46/#48/#49/#50/#67/#68/#69/#70/#71**)
> was re-tested by **direct live observation** (the discipline #60 taught): HTTP
> probes on `:3000` for payload/param claims, route greps + live status codes for
> endpoint claims, and code/DB reads where the claim is about code. **All reproduce
> — none is a second #60.** The one correction is **#53**, whose "lost field" list
> overcounted: re-scoped to **`age_restriction` + `seat_map`** (both consumed and
> genuinely absent); `rating` / `answer_edit_window_hours` / `price_foreign_from_minor`
> were dropped as **unconsumed** (`price_foreign` is additionally derivable from the
> served per-currency `price_options`) → recorded in `NOT_BACKEND_GAPS.md`. **#51 was
> also re-scoped:** venue stats are frontend-hydratable from public `GET /venues/:id`
> and profile gamification is a product decision (both → `NOT_BACKEND_GAPS.md`),
> leaving only events-by-followable, already tracked under **#49** — so **#51 merges
> into #49.**
>
> **Re-verified 2026-10-16e against `feat/launch-hardening-telemetry` (merged 10
> commits, base `67e3a281` → `0741c53b`, PR #37) — the "wire the fixes" pull.**
> Live-verified on `:3000` by HTTP probes + serializer/route reads. **Newly
> resolved and frontend-wired in this run:**
> - **#49** — `GET /public/events` now supports `q` (min 2 chars), `category`
>   (slug), `city`, `date_from`/`date_to`, `organization_id`/`venue_id`/`artist_id`,
>   `sort` (`newest|soonest|price_asc|price_desc`), `currency` (required for price
>   sorts), `min_price_minor`/`max_price_minor`; invalid → **422
>   `invalid_public_event_filter`**. Probes: `?q=jazz`→1, `?category=music`→30,
>   `?sort=soonest`→33, `?sort=price_asc&currency=ETB`→30, `?q=x`→422 (baseline 33).
>   This also supplies **events-by-followable**. Frontend: `eventsModule.fetchAll`
>   sends the params + drains every page; discovery drives `q` server-side.
> - **#68** — `is_recurring` on list + detail; every materialised date carries
>   `series_id` (from `source_key` `\Arecurrence-([0-9a-f-]{36})-\d+\z`). Frontend:
>   adapter maps `is_recurring` → the recurring detail UI lights up (verified live:
>   `thursday-jazz-sessions` renders the session rail).
> - **#69** — `Catalog::Public::EventProductSerializer` serves
>   `covered_event_date_ids` (ticket products only). Frontend: mapped to
>   `TicketTier.coveredEventDateIds` → `resolveFestivalSchedule` assigns real days.
> - **#70** — list serves a single `next_event_date`; detail serves
>   `event_dates_preview` (≤7 upcoming, non-cancelled) + `event_dates_url`; new
>   `GET /public/events/:slug/dates` (`from`/`to`, paginated; 7 for
>   `thursday-jazz-sessions`). **Breaking**: the detail/list no longer ship the full
>   `event_dates` array — the adapter now reads the new fields. Frontend also fetches
>   the full schedule for multi-session events.
> - **#50** — wallet serves `registration_answers` (respondent only) + `GET
>   /registrations/:id/answers` (`EditableRegistrationAnswerSerializer.editable`).
>   Frontend: mapped to `registrationAnswersUrl`/`answersEditableUntil`.
> - **#58 / #62** — two of the three owed wiring items were wired in this run
>   (resume-or-degrade conflict sheet; `pendingTransfer` banner + action gate).
>   **Correction (2026-10-17):** the third, **#61**, was *not* fully wired here —
>   only the notification's labelling shipped; the card's **accept action** was left
>   tracked in `.scratch/gap-wiring-2026-10-16/issues/03-transfer-incoming-accept.md`
>   and completed **2026-10-17** (so this sweep directory is closed only as of that
>   date, not 2026-10-16e).
>
> **New gap filed: #72** — the **detail** serializer omits `event_lifecycle` +
> `ticket_availability` (only the list carries them). Previously `eventEnded` used
> the full `event_dates` array to detect an ended event on the detail page; the
> 2026-10-16 reshape replaced it with an upcoming-only preview, so a fully past
> (but publicly visible) event's detail can no longer gate purchase. 4 ended events
> are live on `:3000`.
>
> **Still open after this pull:** blocking — #53, #57, #65. Degrading — **#72**,
> #36, #44, #46, #48, #67, #71. (#49/#50/#68/#69/#70 resolved; #51 absorbed into #49.)
>
> **Tracked frontend follow-ups (not gaps):** server-side consumption of the
> remaining #49 filters/sorts (category/price/date/org/venue/artist + server sort) —
> the module already supports them and the params are verified live; today the
> discovery pipeline still filters client-side over the fully-paged set. Tracked in
> `.scratch/gap-wiring-2026-10-16/`.
>
> **Re-verified 2026-10-17 against `feat/launch-hardening-telemetry` (merged
> `0741c53b` → `8419aaaf`, 6 commits — the **age-restriction** work: `0f41f883`
> public event participants + `785be164`/`eeb17175`/`6f8e3e3c`/`f591ed80`/`8419aaaf`
> age restriction). Live-verified on `:3000` by HTTP probes + serializer/model
> reads. **Two status changes, both frontend-wired this run:**
> - **#53 → partial (RESOLVED `age_restriction`; `seat_map` still open).** The public
>   **detail** now serves `event_setting.config.age_restriction { has_restriction,
>   min_age?, max_age? }` (`Events::Public::EventDetailSettingSerializer` →
>   `EventSetting#safe_age_restriction`); the **list** still omits it. Live probe:
>   organizer `PATCH /events/:id` nests the write at
>   `event.event_setting.config.age_restriction`; the public detail echoes it back;
>   a misplaced key, `has_restriction:true` with no bounds, bounds with `false`,
>   `min_age > max_age`, and out-of-range → **422 `invalid_age_restriction`**.
>   Frontend: `events-adapter` maps it via a new pure `formatAgeRestriction`
>   (min+max → `"21–65"`, min-only → `"18+"`, max-only → `"Up to 12"`) into
>   `Event.ageRestriction`, so the Age card renders the real value; absent/malformed
>   stays absent (ADR-0002). `seat_map` unchanged — still no seating model.
> - **#36 → RESOLVED (participants/lineup).** `EventDetailSerializer` now
>   `has_many :event_participants` (`EventParticipantSerializer`, ordered by
>   `[display_order, id]`) serving `{ id, artist_id, event_date_id, name, type,
>   description, display_order }`. Live probe:
>   `GET /public/events/addis-sound-festival-2026` → 4 participants (3 day-pinned
>   performers + 1 event-level host). **Detail-only** — the list still omits them.
>   Frontend: the adapter (which already mapped `event_participants`) was **aligned to
>   the real wire shape** — `name`; `event_date_id` → `eventDateId`; `description` →
>   the display `role`; the speculative profile fields (image/handle/genre/…) it
>   never received were dropped. Drives `LineupSection` + the festival per-day bill
>   (the `hasPinnedDays` path — no more client round-robin).
>
> **Still open after this pull:** blocking — **#53 (`seat_map` only)**, #57, #65.
> Degrading — #36→resolved, **#72**, #44, #46, #48, #67, #71.
>
> **Dev-env note (not a gap):** the `:3000` container can run **stale code** after a
> host-side merge (Windows→Docker bind mount) — `digis_backend-web-1` must be
> restarted after a pull (it was serving pre-merge `EventSetting` here). The pazimo
> catalog seed (`db/seeds/preview_pazimo_catalog.rb`, now writing structured
> `age_restriction`) was re-run so the age card has real data (`chore(dev)`).
>
> **Out of scope of this sweep:** the handoff's organizer-side sections (the write
> nesting, the `0..120` / `min ≤ max` validation rules, and organizer `GET /events/:id`
> pre-population) are **backend + organizer-app** concerns — `digis-web` is the
> consumer app with no organizer event editor, so only the two consumer-facing rows
> (detail age card, public lineup) were wired.

## Status key

| Status | Meaning |
|---|---|
| **open — blocking** | frontend feature cannot ship until fixed |
| **open — degrading** | works but suboptimal; frontend has a mitigation |
| **superseded** | it was a gap under an older contract; the ask is moot now (detail in `NOT_BACKEND_GAPS.md`) |
| **resolved** | fixed; detail in the Resolved archive |
| **false positive** | reported as a defect but the behaviour is correct — withdrawn (detail in `NOT_BACKEND_GAPS.md`) |

## At a glance

Open items are listed first; resolved items below (sections keep an in-place
`— RESOLVED <date>` marker further down).

| # | Status | Summary |
|---|---|---|
| 38 | reopened 2026-11-02 — degrading | `requires_ticket:true` extras still receive quotes without admission entitlement; moved back from NOT_BACKEND_GAPS after a live no-charge probe |
| 53 | open — blocking (**`seat_map`** only) | **`age_restriction` resolved 2026-10-17** — the public **detail** now serves `event_setting.config.age_restriction { has_restriction, min_age?, max_age? }` (validated server-side; the **list** still omits it) and the frontend maps it to the Age card. **`seat_map` remains** — there is no `seat`/`seat_map` model at all, so the checkout Seat step stays skipped. Re-scoped 2026-10-16: `rating` / `answer_edit_window_hours` / `price_foreign_from_minor` dropped as **unconsumed**; lineup → #36. (`featured` and the `rsvp_*`/`event_type`/`access_mode` keys are superseded — see `NOT_BACKEND_GAPS.md`) |
| 57 | open — blocking | no password reset / forgot-password endpoint (phone-first reset would reuse the existing OTP infra) |
| 73 | open — blocking | consumer achievement detail sheet has no backend contract; backend developer owns the behavior and API design |
| 74 | partial — frontend wired | unique gift-line contract available; existing database upgrades blocked by #76 |
| 75 | resolved 2026-11-01 | new-purchase real sandbox acceptance passed after restarting pulled Rails/workers; historical expired orders not repaired |
| 76 | open — blocking for existing databases | gift line column was added to a historical migration without a forward migration; fresh local reset has the column |
| 77 | open — degrading | discovery list has no authoritative multi-day signal; only one next date is served, so genuine multi-day events cannot show their format badge |
| 78 | open — degrading | a published parking product crashes the public products endpoint; its availability path dereferences a missing ticket type |
| 79 | open — degrading | public event/date projections do not identify online or hybrid attendance, despite backend stream support |
| 44 | open — degrading (narrowed 2026-10-24) | public `public_guest_limit` is exposed but unenforced; obsolete event-level RSVP/access-mode keys are superseded by offer-driven admission, not missing features |
| 46 | open — degrading | no saved-events/favourites, home feed (`GET /feed` route has no controller), or reviews/ratings. Follows to **venues/artists/organizations** *do* exist (`config/routes.rb:81`, `GET /users/:id/following`) |
| 48 | open — degrading | no consumer account preferences (language/currency/region), 2FA, or password change (notification-channel prefs exist; account prefs do not) |
| 67 | open — degrading | `Core::UserProfile` enforces mandatory `last_name` (`null: false`, `validates :last_name, presence: true`) → single-name signups require client-side fallback/duplication |
| 71 | open — degrading | Chapa `provider_fee_minor` is inflated 100× — the adapter converts the provider's **minor-unit** `service_fee`/`charge` as if it were major (`minor_amount` × 100), so a real 0.03 ETB fee is recorded as 3.00 ETB → overstates platform provider cost and reconciliation variance |
| 72 | open — degrading | detail still omits `event_lifecycle` / `ticket_availability`; the frontend already mitigates ended-event display via a schedule probe. Authoritative detail projection remains owed |
| 36 | resolved 2026-10-17 | public **detail** now serves `event_participants` (`{ id, artist_id, event_date_id, name, type, description, display_order }`, server-ordered) → the Lineup section **and** the per-day festival bill render real data (no more round-robin). Frontend wired: adapter maps the roster (`name`; `event_date_id` → `eventDateId`; `description` → display `role`) and drops the never-served profile guesses. The venue media/coords half was a **seed** task — fixed 2026-10-15 (`NOT_BACKEND_GAPS.md`). |
| 17 | resolved 2026-10-16 | `Orders::Payment::PAYMENT_METHODS` now includes `cbebirr`; the CBE Birr option is enabled and sends `cbebirr`. (Residual: `Commercial::FeeComponent::PAYMENT_METHODS` still omits it — no live impact.) |
| 8 | resolved 2026-10-16 | auth payload serves `profile.full_name` (`Core::CurrentUserSerializer`); signup creates the profile |
| 9 | resolved 2026-10-16 | `GET/PATCH /user` self-service profile (`resource :user, only: %i[show update]`) |
| 47 | resolved 2026-10-16 | gift purchase flow — `POST /public/gift_purchases/:id/resolve\|claim`, checkout gift intent, `GET /orders/:order_id/gift_purchases` + resend |
| 56 | resolved 2026-10-16 | signup OTP-verifies the phone and **upgrades** an existing shadow user (`Core::Signups::Complete`) |
| 49 | resolved 2026-10-16 | `GET /public/events` now supports `q`, `category`, `city`, `date_from`, `date_to`, `organization_id`, `venue_id`, `artist_id`, `sort`, `currency`, `min_price_minor`, `max_price_minor` (invalid → 422 `invalid_public_event_filter`); this also serves **events-by-followable** (organization/venue/artist filters). Frontend wired: `eventsModule.fetchAll(query)` + discovery search `?q=`. |
| 50 | resolved 2026-10-16 | wallet serves `registration_answers { registration_id, url, answers_editable_until }` (respondent only) and `GET /registrations/:id/answers` (`EditableRegistrationAnswerSerializer.editable` = retained ∧ `Ticketing::Answers::CorrectionWindow` open). Frontend wired: `mapWalletTicket` → `registrationAnswersUrl`/`answersEditableUntil`. |
| 58 | resolved 2026-10-16 | the `active_checkout_exists` 409 now carries `meta.active_checkout { order_id, expires_at, payment, order_access_token }` — frontend wired (resume hosted payment / honest degrade) |
| 61 | resolved 2026-10-16 | in-app `transfer_incoming` notification fires on initiation for `to_user` (carries `transfer_id`). (Residual: no incoming-transfers list endpoint.) |
| 62 | resolved 2026-10-16 | wallet ticket serves `pending_transfer { id, status, expires_at }` — frontend wired (`pendingTransfer` + banner/action gate) |
| 68 | resolved 2026-10-16 | `is_recurring` on the list + detail serializers; every materialised date carries `series_id` (matched from `source_key`) → the recurring consumer UI lights up. Frontend wired: adapter maps `is_recurring`; detail rail fetches the full schedule. |
| 69 | resolved 2026-10-16 | `Catalog::Public::EventProductSerializer` serves `covered_event_date_ids` (ticket products only) → multi-day tier assignment is real, not name-heuristic. Frontend wired: `TicketTier.coveredEventDateIds` → `resolveFestivalSchedule`. |
| 70 | resolved 2026-10-16 | list serves a single `next_event_date`; detail serves `event_dates_preview` (bounded ≤7 upcoming, non-cancelled) + `event_dates_url`; new `GET /public/events/:slug/dates` (paginated). Frontend wired: adapter reads the new fields + `eventsModule.fetchDates`. |
| 42 | resolved 2026-10-01 | wallet resale policy now serves `resale_price_cap_minor` (percentage resolved to an amount) |
| 54 | resolved 2026-10-15 | discovery availability served — `GET /public/events` carries `ticket_availability` + `event_lifecycle` per event; frontend wired (`eventAvailability` → SOLD OUT badge, verified live) |
| 63 | resolved 2026-10-05 | G-41 mixed ticket + add-on checkout implemented (backend commits `b157e36`, `d5a8320`); frontend wired in `admissionModule` & `useCheckoutFlow` |
| 64 | resolved 2026-10-01 | resale default now uses the served resale cap (exact for the standard 100% policy); the acquisition field isn't needed |
| 66 | resolved 2026-10-05 | `ticket_id` added to `Marketplace::ResaleListingSerializer` and policy `SELLER_FIELDS` (commit `360f9c7`); frontend wired in `resaleModule` |
| 33 | resolved 2026-09-30 | guest payment resolves via `order_access_token` (`ResolveGuestOrderAccess`) |
| 34 | resolved 2026-09-30 | `Orders::EventDateEligibility` gates `BuildQuote` + `CreateCheckout` |
| 37 | resolved 2026-09-30 | offer-scoped public waitlist endpoint exists |
| 39 | resolved 2026-09-30 | `GET .../payout_accounts/destinations` + `TYPES = %w[bank mobile_money]` |
| 40 | resolved 2026-09-30 | `ExpireCheckout` reconciles grace instead of aborting the sweep |
| 41 | resolved 2026-09-30 | `idx_one_order_item_per_registration` is now `(registration_id, order_id)` |
| 43 | resolved 2026-09-30 | `admission_selections` accepts `access_code` / `invitation_token` as `audience_proof` |
| 45 | resolved 2026-09-30 | per-offer sold-out → `waitlist_available` + offer waitlist |
| 60 | false positive — withdrawn 2026-10-16 | "Chapa amount sent 100× too large" is **wrong**: Chapa V2 is minor-unit on both request and response (live probe: `amount: 100` → **1.00 ETB**), so `integer_amount(amount_minor)` is correct (the real defect is **#71**; see `NOT_BACKEND_GAPS.md`) |
| 16 | resolved | Chapa API V2 (`CHAPA_TEST_`/`CHAPA_LIVE_` keys, `api.chapa.global`) — the dev tunnel/config is setup (`NOT_BACKEND_GAPS.md`) |
| 26 | resolved | payout destination create works (Chapa V2 direct-transfer registration) |
| 27 | superseded 2026-09-30 | Public RSVP routes deleted → free admission now goes through `admission_selections` |
| 51 | re-scoped 2026-10-16 → merged into #49 | events-by-followable is tracked under #49; **venue stats are hydratable** from public `GET /venues/:id` and **profile gamification was deferred** — historical context → `NOT_BACKEND_GAPS.md`; the newly requested achievement contract is tracked in **#73** |
| 65 | superseded — reclassified 2026-10-24 | no confirmed payout request-shape defect; synthetic sandbox beneficiary was rejected. Successful provider settlement remains unverified → NOT_BACKEND_GAPS.md #65 |

---

## Open — blocking

These items block a frontend feature. Each entry: what's missing (file + fields),
why it matters, and a concrete fix. (Resolved entries are retained in place with a
`— RESOLVED <date>` heading marker for history; the table above is authoritative.)

### #76. Batch gift line column has no upgrade migration for existing databases

**Status:** open — blocking (gift checkout after latest pull).
**Verified:** 2026-11-01, remote `c15d6ff3`, merged `5c2890c7`.
`ca280c1b` adds `client_line_id` to the already-existing migration
`20261005090000_create_orders_gift_purchases.rb`; no new migration adds it to
existing installations. `Orders::GiftPurchase` now validates/accesses the column
and `Orders::CreateCheckout` writes it. Read-only local runtime probe returns
`Orders::GiftPurchase.column_names.include?("client_line_id") == false`.
Previously migrated databases will not gain this field from ordinary migration
runs. Fresh database behavior does not establish upgrade compatibility.

**Impact:** real gift checkout and delivery status cannot be certified on the
existing database. The frontend can wire the committed line-ID contract, but
must not patch the database to make acceptance pass.

**Backend engineer action:** provide a forward migration adding the nullable
UUID column to existing databases and verify upgrade from the previous schema.
No local backend migration/schema repair performed. Existing uncommitted seed /
structure work was preserved during the pull.

---

### #75. Successful Chapa payment ignored as unmatched; paid Jazz order expires without ticket

**Status:** resolved 2026-11-01 — committed payment matching fix, live sandbox
payment → exact ticket → decoded QR → persisted wallet acceptance passed.

**2026-11-01 resolution:** remote `efa245fa` / `2d69d63c` (merged as `5c2890c7`)
verify an unmatched Chapa success by its provider reference, require complete
merchant/reference/amount/currency evidence and match it to the immutable local
attempt. Existing frontend POST refresh consumes the result; no frontend provider
verification or success bypass added. After restarting Rails/background workers
onto pulled code, `pnpm test:acceptance` passed in 30.2s with a separate seeded
buyer. New-purchase behavior is verified; this does **not** claim the historical
expired Jazz orders were recovered or refunded. No manual replay/issuance used.

The first run used pre-pull worker processes and recorded
`provider_verification_incomplete`; a fresh read-only verification had complete
matching fields. Worker restart removed that runtime version mismatch. Keep the
prior failure evidence below as historical incident context.
**Verified:** 2026-10-26, committed backend `55f535dd`, live provider read-only
verification, durable payment/event rows and scrubbed webhook diagnostics.

**Reproduction/evidence:** user supplied receipt `HCGyXsbvSn5r` after paying for
`thursday-jazz-sessions`. GET `/v2/payments/HCGyXsbvSn5r/verify` returns HTTP 200,
`data.status=SUCCESS`, `amount=41000`, `currency=ETB`, and merchant reference
`a56f9293bcda312e8c26`. That merchant reference exactly matches local payment
`01a1788c-8c1d-7ee7-bd56-f08a0abb407f` for order
`01a1788c-8b1f-7cd6-b552-073eab701011` (amount_minor=41000, ETB).

- Payment created 2026-10-26 14:10:39 UTC. Its stored `provider_reference` is null.
- Success webhook received/processed 14:11:28 UTC as event
  `01a1788d-4b5a-72b5-a67e-3ddf5d46dd7e`: `event_type=payment.success`,
  `status=ignored`, `payment_id=null`. Payload has `chapa_reference=HCGyXsbvSn5r`
  and `merchant_reference=null`; provider signature was accepted and HTTP 200
  acknowledged. No signature values or customer contacts copied here.
- The webhook reports amount=42179 whereas the verify response/order principal
  is 41000. Preserve this distinction; do not infer provider fee/acceptance rules
  from these amounts in the frontend.
- Local payment later became `failed`, failure_code=`not_found`,
  raw_status=`provider_rejected` (14:25:39 UTC); order expired, no tickets.
  Read-only verify with stored merchant reference returns `not_found`, while
  verify with the actual Chapa receipt reference returns SUCCESS.

**Second live reproduction — 2026-10-26 16:26 UTC (19:26 Nairobi):** fresh Jazz
order `01a17908-cbd3-7330-a76c-32718d3759f5`, payment
`01a17908-ccf4-75de-96c3-282ee9c02eda`, total_minor=41000 ETB. Success webhook
`01a17908-eaf4-7b87-bef5-7eaec2d67801` arrived 16:26:30 UTC, eight seconds
after order creation, but is ignored/payment_id null. Receipt `HCCePSUoB7pn`
verify HTTP200 SUCCESS amount41000 ETB; returned merchant reference exactly
matches this new payment. Local payment remains processing/order pending_payment.
Both configured frontend return and public API callback-host health HTTP200;
both managed tunnels running. This reproduction proves the success webhook
crossed the tunnel; restarting tunnels will not repair the correlation defect.
No payment/ticket/backend product changes performed.

**Automated sandbox reproduction — 2026-10-28 08:08–08:13 UTC:**
`pnpm test:acceptance` drove real UI login → On & On Regular checkout → hosted
Chapa `/test/` bank payment. The test failed after 240 seconds waiting for the
confirmed purchase screen; no ticket/QR outcome was accepted as success. Latest
payment was `processing`, created 08:08:54 UTC. Durable inbox evidence:
`payment.pending` at 08:08:57 was `processed`/matched; `payment.success` at
08:09:02 was `ignored`/unmatched. Both managed payment tunnels and Rails were
healthy before payment. This reproduces the known correlation failure through
an automated browser acceptance test, beyond the earlier manual Jazz report.
No force-issued tickets, simulated webhooks, payment mutations or backend
product changes were used. Frontend test source: `e2e/live/paid-ticket.spec.ts`.

**Code path:** `orders/process_payment_event.rb:53–75` only matches incoming
reference values to stored merchant/provider/idempotency references; unmatched
success calls `finish_ignored!`. `payments/providers/chapa_client.rb` hosted
response mapping can leave provider_reference absent, and `verify` prioritizes
that value then merchant reference. The observed webhook lacks the stored
merchant reference, so it never associates the receipt reference with the order.
Frontend POST refresh using the local attempt cannot discover this receipt.

**Impact:** provider-confirmed paid order is never accepted/fulfilled; frontend
correctly has no issued ticket to show. This is distinct from fixed frontend
reload/timeout/ticket-opening bugs and restored local tunnel setup.

**Broader audit:** current runtime settings match the env file; container payment
source hashes match host/committed product files, and latest fetched origin has
no newer product changes. Authenticated webhook processing/outbox completed in
the same second, so no queue stall or pre-webhook expiry caused the ignored event.
The September30 committed Render verification documents a previously successful
checkout. Current reference extraction predates that success; a new code
regression or Chapa response-format change is **not proved**. Current merchant
lookup yields HTTP400/not_found, although official Chapa verification docs allow
merchant references; receipt lookup succeeds and returns the expected merchant.
The hosted URL suffix differs from final receipt reference, so do not prescribe
suffix extraction as an evidenced fix. Compare earlier successful payloads and
provider behavior as part of the backend engineer's investigation.
Audit matrix: `.scratch/payment-return-diagnosis/spec.md`.
Official source: https://docs.chapa.global/docs/v2/integrations/verify-payment.

**Test coverage gap confirmed 2026-10-27:** passing frontend browser tests are
not a live payment-to-ticket acceptance check. `e2e/checkout.spec.ts` returns
success after reaching a hosted payment URL (or a handled initialization error/
conflict); it does not settle payment or require an issued credential. Payment
return tests mock `ready` plus tickets. Backend hosted-client tests permit
checkout_url-only initialization; the webhook persistence test supplies the
merchant reference that is null in both failed real purchases. Those tests do
not catch this observed combination. Required regression: actual observed
initialization + authenticated webhook shape + provider verification response
must retain safe correlation and reach expected order/ticket outcome; a Chapa
test-mode end-to-end acceptance must require success, fulfilled order and usable
credential, not merely opening checkout. Backend engineer owns implementation
and backend regression; no backend tests/code patched by frontend team.

**Backend engineer action:** safely reconcile this specific paid order and
provide a durable, verified correlation/reconciliation path for hosted responses
and success webhooks with this shape. Backend owns the approach, amount/fee
validation, expired-order/inventory handling and idempotency. Add regression
coverage for missing merchant reference/provider reference and retry/replay.
Do not correlate by amount/contact alone. No backend product patch, state
mutation, webhook replay, refund or manual ticket issuance performed by frontend.

### #74. Batch gifts cannot repeat a ticket product for different recipients

**Status:** partial — committed batch contract available 2026-11-01; frontend
wired. Existing-database rollout blocked by #76.

**2026-11-01 update:** remote `c15d6ff3` adds unique UUID `line_id` per gift line,
line-keyed registration/intent/quote mapping, aggregate per-product quantity
limits and `line_id` on gift responses. Frontend now submits one quantity-one
line per recipient, preserves line IDs across retries/reloads, and correlates
per-gift delivery results. Browser/API regressions verify the new contract.
Historical defect below is fixed in committed code; no live gift completion
claim until the missing upgrade migration (#76) is supplied.
**Verified:** 2026-10-26 against committed backend HEAD `55f535dd`; code evidence,
not a live multi-recipient purchase.

The attached `Gifting flow.md` requires three gifts to be three separate
quantity-one items with independent recipients/notes. The API accepts an items
array, but rejects repeated product IDs before preparing those gifts:

- `app/services/orders/admission_selections/create.rb:107` returns
  `duplicate_product` when `event_product_id` repeats; guest OTP preparation has
  the same guard in `admission_selections/request_otp.rb:62`.
- `app/services/orders/build_quote.rb:93` independently rejects repeated products.
- `admission_selections/registration_assembler.rb:26–35` keys registration and gift
  intents by product ID; `checkout_dispatcher.rb` and `create_checkout.rb` consume
  those maps. Removing only the duplicate guard would not preserve each recipient.

**Impact:** two recipients cannot each receive the same ticket product in one
order. The current one-recipient frontend remains supported. Separate orders are
not equivalent to the documented single-order batch and are not implemented as
an automatic workaround. Different-product support does not close this gap.

**Backend action:** provide and document support for distinct recipient gift
lines of the same product through selection, guest proof, quote, order creation
and replay. The backend engineer owns the line identity/API design. Preserve
quantity one per gift, recipient association, server totals, inventory and
idempotent replay. No backend implementation or API choice made by this audit.

Frontend continuation: `.scratch/handoff-wireup-2026-10-26/issues/01-multi-recipient-gift-checkout.md`.

### #73. Consumer achievements have no backend contract

**Status:** open — blocking (achievement detail sheet only).
**Verified:** 2026-10-24, checked-out backend code and Markdown documentation;
no live API verification (local backend unavailable).

**Evidence:** no achievement/gamification implementation or plan found in
`digis_backend/app`, `config/routes.rb`, or the backend Markdown documents.
`src/features/profile/pages/ProfilePage.tsx` previously defined achievement labels
and unlocked flags locally (removed in the frontend cleanup on 2026-10-24). `.scratch/web2-ui-import/issues/02-achievement-detail-sheet.md`
records an exported detail sheet whose progress, perks and earned-date content
has no server source. The previous #51 gamification note deferred this feature;
the user requested tracking the missing backend surface on 2026-10-24.

**Impact:** the frontend cannot truthfully show earned status, progress, earned
dates or rewards, or implement the achievement detail sheet from real data.
Existing demo values are not a backend contract.

**Backend developer action:** confirm the intended achievement behavior and
publish the supported read contract and example payloads for the consumer
profile/detail UI. Specify which status/progress/date/reward information is
actually supported and its semantics. Earning rules, thresholds, eligibility,
rewards, models, endpoint paths and payload design belong to the backend
developer; no frontend proposal for them is approved by this entry.

**Frontend follow-up:** consume the committed contract once available; omit
unsupported fields and keep the new detail sheet unimplemented meanwhile.
Do not derive achievements from wallet contents or hardcode earning rules.
No backend code changes were made for this entry.


### #17. `cbe` is not a valid backend payment method — RESOLVED 2026-10-16

Frontend `PaymentMethod = 'telebirr' | 'cbebirr' | 'card'`; the persisted enum
`Orders::Payment::PAYMENT_METHODS` now reads `%w[telebirr card bank cbebirr]`
(`app/models/orders/payment.rb`), so the payment-method gate at
`app/services/orders/payment_attempt_support.rb:28`
(`Payment::PAYMENT_METHODS.include?(payment_method)`) accepts `cbebirr`, which the
Chapa adapter already advertises. The CBE Birr option is enabled in the UI and
sends the canonical `cbebirr` (`PaymentStep.tsx:25`).

**Residual (no live impact):** `Commercial::FeeComponent::PAYMENT_METHODS`
(`app/models/commercial/fee_component.rb`) is still `%w[telebirr card bank]`, so a
*fee component* cannot be scoped to `cbebirr` (the default `payment_method: nil`
component applies to all methods).

**History:** the original filing cited the persisted enum
`%w[telebirr card bank]` rejecting `cbe`/`cbebirr`.

**Correction 2026-10-02 (retained):** the earlier claim that the Chapa adapter
capabilities are `%w[telebirr card bank]` was **stale** —
`app/services/payments/providers/registration.rb:33` advertises
`%w[telebirr cbebirr mpesa awashbirr ebirr enat_bank card bank]` (direct charge:
`telebirr cbebirr mpesa awashbirr`). The fix was indeed a one-line enum widening,
not an adapter change — now landed.

**Status: resolved 2026-10-16** — `Orders::Payment::PAYMENT_METHODS` includes
`cbebirr` and the frontend sends it (CBE Birr enabled). Original filing 2026-10-02
(enum confirmed; adapter evidence corrected).

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

### #43. RSVP rejects `access_code` / `invitation_token` → audience-gated RSVP is impossible — RESOLVED 2026-09-30

> **Resolved.** The `Ticketing::PublicRsvpsController` this entry describes was
> **deleted** in the composable-admission release; free gated admission now goes
> through `POST /public/events/:slug/admission_selections`, which accepts
> `audience_proof { access_code, invitation_token }` (`config/routes.rb:148-149`,
> `Orders::AdmissionSelections::Create`). Kept below as history.

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

**Status: resolved 2026-09-30** — superseded by the composable admission selection;
`admission_selections` accepts `audience_proof`. Original filing 2026-09-30.

---

### #53. Public event payload no longer exposes the non-admission detail fields — `age_restriction` RESOLVED 2026-10-17 (`seat_map` still open)

`Events::Public::EventSettingSerializer` now whitelists **only**
`%w[public_guest_limit]` (`app/serializers/events/public/event_setting_serializer.rb:8`),
and `EventDetailSerializer` carries no replacement attributes, so the
previously-public config keys have no source in the public API (grep of `app/`
confirms the strings are gone).

**Re-scoped 2026-10-16 — the lost, *frontend-consumed* fields are
`age_restriction` + `seat_map` only.** A live re-check of the five fields the
2026-10-02 re-scope listed found the other three have **no frontend consumer**
(the public payload exposes none of them — verified live 2026-10-16):

- **`age_restriction`** — consumed by the event-detail Age card
  (`EventDetailPage.tsx:237`, `EventInfoRail.tsx:50`). **RESOLVED 2026-10-17**: the
  public **detail** serves `event_setting.config.age_restriction`
  (`Events::Public::EventDetailSettingSerializer` → `EventSetting#safe_age_restriction`;
  validation in `app/models/events/event_setting.rb`), and the frontend maps it
  (`events-adapter.ts` `formatAgeRestriction` → the Age card). The **list** still
  omits it (the card settings projection is unchanged).
- **`seat_map`** — consumed by the checkout Seat step (`EventDetailPage.tsx:459`
  → `CheckoutPage` → `useCheckoutFlow#sectionsForTier`); the step is skipped when
  absent. **Real — but** there is **no `seat`/`seat_map` column or model** anywhere
  in the backend (grep of `db/structure.sql` + `app/`), so this is a missing
  *feature*, not merely a serializer projection.
- **`rating`** — **unconsumed**. The only `.rating` reader is the *artist* rating
  (`LineupSection.tsx:29`), which comes from the lineup and is **#36**'s gap; no
  event-level rating surface exists (`EventCard`/discovery render none).
- **`answer_edit_window_hours`** — **unconsumed**: threaded `EventDetailPage` →
  `CheckoutPage` → `useCheckoutFlow`, but never read in the hook body. The backend's
  real correction rule is per-ticket-type
  (`Ticketing::Answers::Revise#correction_window_closed?` →
  `ticket_type.transfer_cutoff_seconds_before_start`), not a per-event hours value.
- **`price_foreign_from_minor`** — **unconsumed**, and **derivable**: the public
  products payload already serves per-currency `price_options[]`
  (`{ currency, amount_minor, … }`, `Catalog::Public::EventProductSerializer`), so a
  foreign price is just a non-event-currency option.

The three dropped fields are recorded in `NOT_BACKEND_GAPS.md` (2026-10-16).
`lineup` is tracked under #36.

The other two groups are **not** gaps and live in `NOT_BACKEND_GAPS.md`: the
`rsvp_*` / `event_type` / `access_mode` keys are superseded by the per-offer model
(see #44), and `featured` is superseded by its own paid endpoint (2026-10-15).

**Why it blocks:** the SeatMap step can only render absent/fallback. ADR-0002
forbids fabricating it. (The Age card is now served — see the `age_restriction`
bullet above.)

**Fix:** add a real assigned-seating model for `seat_map` (none exists today) — or
decide the SeatMap step is out of scope. `lineup` → #36 (resolved 2026-10-17).

**Status: `age_restriction` resolved 2026-10-17; `seat_map` still open — blocking.**
`age_restriction`: the public detail serves
`event_setting.config.age_restriction { has_restriction, min_age?, max_age? }`
(`app/serializers/events/public/event_detail_setting_serializer.rb`), validated in
`Events::EventSetting` (allowlisted keys, integer bounds 0..120, `min_age ≤
max_age`, bounds stripped when `has_restriction: false`); the organizer create/update
path nests it at `event.event_setting.config.age_restriction` (a key anywhere else →
422 `invalid_age_restriction`). Verified live 2026-10-17 (organizer PATCH → public
GET round-trip for min-only and bounded; 422 on misplaced / no-bound / bad-order /
out-of-range). `seat_map`: still no seating model. Re-scoped 2026-10-16
(`rating` / `answer_edit_window_hours` / `price_foreign_from_minor` dropped as
unconsumed; `featured` superseded 2026-10-15). Filed 2026-09-30 (verified against
`326f6a3` by code read + live `GET /public/events/:slug` →
`event_setting.config == {}`).

### #56. Signup cannot take over an existing (shadow) phone — RESOLVED 2026-10-16

**Resolved by `Core::Signups::Complete` (`aad3a903`, 2026-10-11).** Signup is now
**phone-OTP-verified** (`POST /auth/signup/request_otp` →
`POST /phone_verifications/:id/verify` → `POST /auth/signup` with
`verification_token`) and, on a proven phone that already owns a **shadow** user,
**upgrades it** ("Claims the phone identity proven by a signup-purpose OTP and
upgrades its shadow user without changing the identity referenced by guest
purchases") rather than failing uniqueness. The frontend is wired
(`src/lib/auth.ts` `requestSignupOtp`/`verifySignupOtp`/`signUp`). The original
description is kept below as history.

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

**Status: resolved 2026-10-16** — signup OTP-verifies the phone and upgrades the
shadow user (`Core::Signups::Complete`, `aad3a903`); frontend wired. Original
filing 2026-09-30 (code read + reported UX).

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

### #60. Chapa payment amount is sent 100× too large — FALSE POSITIVE, WITHDRAWN 2026-10-16

**This claim is the wrong way round; there is no such defect.** `payment_payload`
sends `amount: integer_amount(request.fetch(:amount_minor))` — the **raw minor
integer** (`app/services/payments/providers/chapa_client.rb:142`) — and that is
**correct**: Chapa V2 expresses `amount` in the currency's **minor** unit, matching
the backend's `*_minor` convention. The mistaken half is the adapter's **response**
parsing (`minor_amount` × 100 at `:230`/`:324-328`), tracked separately as **#71**.

**Decisive live probe (2026-10-16, sandbox test key):**
- `POST /v2/payments/hosted` `{ amount: 100, currency: "ETB" }` → the Chapa hosted
  page rendered **“Amount to Pay 1.03 ETB”**; its `data-page` props read
  `"amount":100, …, "payment_methods":{"test":{…,"charge":3,"amount":103}}`.
- Completing the test payment (test phone `0900123456`) → receipt **Sub Total
  1.00 ETB / Charge 0.03 ETB / Total 1.03 ETB** (`chapa_reference HC50DSRDqACO`).
- `GET /v2/payments/HC50DSRDqACO/verify` → `"amount":100, "service_fee":3`.

So `100` = **1.00 ETB** and the fee `3` = **0.03 ETB** — both minor. Chapa is
minor-unit on **both** the request and the response.

**The original 2026-10-01 evidence actually proved correctness.** A 153,750.00 ETB
order (`amount_minor = 15_375_000`) posted `amount: 15375000` = **153,750.00 ETB**;
the `data-page` props echoing `"amount":15375000` is exactly what a minor-unit
provider returns for that order (the raw minor integer). The failure — *"amount is
greater than the maximum amount supported by the currency"* — was Chapa's real
**per-transaction maximum** being exceeded by a large order, **not** a unit bug.
(The old test-mode claim — “small orders appear to work while still being inflated”
— is also false: the sandbox rendered the correct 1.00 ETB for `amount: 100`.)

**Status: false positive — withdrawn 2026-10-16 (live sandbox probe). Moved to
`docs/NOT_BACKEND_GAPS.md`.**

### #65. Seller payout — reclassified as provider verification (2026-10-24)

**Status: superseded — reclassified, not resolved.** The earlier filing inferred
that Chapa `invalid_format` proved a malformed backend payout payload. The
backend's committed `docs/operations/frontend-backend-gap-tracker-2026-09-08.md`
(G-03) records the more precise provider response: **Invalid account number for
the selected bank**, using a synthetic local test recipient that was not a
Chapa-published sandbox beneficiary. `ChapaPayoutClient#payout` already sends the
documented top-level and nested-account fields. No request-shape defect is
established by that response; changing fields or units by guess is unwarranted.

Successful end-to-end provider settlement is **still unverified**. Obtaining a
provider-approved sandbox beneficiary and confirming settlement is provider
setup/verification, not an established backend code deficiency. The evidence,
remaining verification and re-entry condition now live in
`docs/NOT_BACKEND_GAPS.md` #65. Do not equate this reclassification with a payout
fix or successful transfer. No payout was attempted in the 2026-10-24 audit.

## Open — degrading

### #38. Ticket-required extras are quoted without admission entitlement — REOPENED 2026-11-02

Public products expose `requires_ticket:true`, and the attendee UI displays
“Requires a ticket,” but `Orders::BuildQuote` does not check that requirement.
A live authenticated extras-only quote for a supported digital add-on returned
success and a quote token (10250 ETB minor total), with no ticket line or event
ticket in the buyer's wallet. No order, hold, payment or charge was created.

The earlier “informational/feature ask” classification hid an enforcement gap
behind a served requirement flag. Backend engineer must define/enforce admission
entitlement consistently at quote/checkout; frontend gating cannot enforce API
invariants. No backend product changes made. This is distinct from parking #78.

### #80. Ticket activation accepts empty admission coverage — OPEN, 2026-11-02

**Availability reason.** Public discovery returns "unavailable" for incomplete admission coverage without a reason. Expose a machine-readable reason so clients can distinguish setup problems from scheduled sales. Reserve "coming_soon" for confirmed future sales. Until the API distinguishes the cause, discovery shows **Unavailable** with a **View** action.

Also confirmed for non-recurring event `bbbbb`: one scheduled date, GA product
`01a19c50-0d75-7b28-a0e8-94bd8f2102d1`, `available:false` and zero covered dates.
This is a general ticket-readiness defect, not a recurring-event-only issue.

Organizer implementation handoff: [O-01 — published tickets have no admission
coverage](ORGANIZER_GAPS.md#o-01-published-tickets-have-no-admission-coverage).

Bozo (`01a19acd-98b5-724b-996d-092a9f8f6edf`) and Mozooo
(`01a19ac8-8557-7cbc-a584-a20dc6b7efff`) were created from the organizer UI.
Authenticated product responses show active public ticket products, a current
50000-minor ETB price and four per-date inventory pools, but product_accesses:[]
and public covered_event_date_ids:[]. Public products return available:false;
public discovery returns ticket_availability:unavailable.

Primary frontend cause: organizer creation omitted access/date-allocation setup.
Organizer flow changes were reverted at the user's direction: organizer product
development is outside our scope. Organizer engineers need to wire the existing
access/allocation contracts before activation and surface setup errors. The
attendee Check Availability mapping correctly follows the server state and is
unchanged. A read-only recheck after reversion confirms both offers remain
unavailable with no covered dates; no operational data repair was performed.

Backend defense remains absent: Catalog::Products::Activate validates stock,
price, mappings for existing access rows and allocations for existing multi-date
grants, but permits a credential-bearing ticket with no grants at all. Backend
publication readiness also checks organization verification, categories, dates,
media and streaming readiness without checking admission completeness of active
ticket offers. The observed published/active invalid tickets therefore represent
a backend guard gap as well as the organizer's omitted setup request. This does
not imply every published event must sell tickets; readiness rules must respect
the supported event/offer types.

Backend engineer should own readiness enforcement and its validation/error contract.
No backend product patch made. Active products cannot have access/allocation rows
replaced and retirement is permanent, so repairing these existing offers requires
the intended date coverage and a controlled operational replacement; neither
product has sold or held inventory at diagnosis time.

Work but suboptimal; the frontend mitigates. Fixing these improves correctness.

### #79. Public event projections cannot identify online/hybrid attendance

**Verified 2026-11-02:** backend `Events::EventStream` and ticket stream-session
routes exist, but `Events::Public::EventDateSerializer` only exposes date/venue/
series fields and public event serializers expose no attendance-format signal.
A missing physical venue does not prove an event is online. The frontend cannot
honestly label an online/hybrid event from the public catalog or display the
appropriate attendance context. Frontend watch/session consumption is also not
implemented and remains frontend follow-up, separate from this projection gap.

Backend engineer owns a safe public attendance description/signal. This does
not request public playback credentials. No stream/payment outcomes or invented
format flags were seeded to simulate a working consumer experience.

**Status: open — degrading.** Parking #78, multi-day discovery #77 and this gap
are explicit limits of the public showcase, rather than missing seed rows.

### #78. Public products endpoint crashes on a parking product

**Verified 2026-11-01:** a valid model-level parking fixture in
`addis-tech-forum` caused `GET /public/events/addis-tech-forum/products` to return
500 `undefined method 'date_selection' for nil`, at
`Catalog::Public::OfferAvailability#candidate_date_sets:54`.
`EventProduct::CREDENTIAL_PRODUCT_TYPES` includes parking, while ticket-type
presence validation permits ticket types only for ticket products. The public
availability evaluator assumes every credential-bearing product has a ticket type.

The generic add-on fulfillment service explicitly rejects parking pending its
own workflow. The unsupported local showcase parking example was replaced with
a supported digital add-on; no product-code patch, dummy ticket type or forced
availability was added. Public seed verification now exercises real products HTTP
responses and checks supported add-on fulfillment types.

Backend engineer owns the projection/workflow handling for parking; published
products should not crash the whole event product list. **Status: open — degrading.**

### #77. Discovery cannot identify multi-day events from the list projection

**Verified 2026-11-01** against current local backend `5c2890c7` / remote `c15d6ff3`.
`GET /public/events` serves `next_event_date` plus `is_recurring`, but no complete
date set or authoritative multi-day indicator. `addis-sound-festival-2026` and
`camping-to-coast` each have three dates on detail/products, while their list
projection maps to one frontend date. `EventCard.cardFormat` therefore cannot
show MULTI-DAY without inventing information. Recurring badges work from the
explicit `is_recurring` flag; detail day/pass selection works from served dates.

Backend engineer should define/expose an authoritative list-level schedule-format
signal. Frontend will consume that contract; no new backend field was added and
no per-card schedule fan-out or title-based inference was introduced.

**Status: open — degrading.** Seeded multi-day content exists; this is discovery
projection/discoverability, not missing fixture data.

### #66. Seller listing wire omits `ticket_id` — the wallet can't tell which tickets are already listed — RESOLVED 2026-10-05

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


### #68. Public event payload exposes no recurrence / series signal — the recurring consumer UI is unbuildable — RESOLVED 2026-10-16

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
session grouping, per-session waitlists, the `recurring` `FormatTag`) is now
wired but **inert**: `resolveSeries` (`src/lib/recurring.ts`) returns `null`
without a series signal, so the detail page renders nothing rather than invent
the series (ADR-0002). The adapter reads a **provisional** shape
(`recurrence` / `is_recurring`, `src/lib/events-adapter.ts`) that the payload
does not carry yet. The consumer can only flatten a series into a plain list of
dates, and `EventCard.cardFormat()` never returns `recurring`. **Visible live now
that the seed carries a real materialised series** (`thursday-jazz-sessions`,
2026-10-15 — 7 materialised Thursday sessions): `GET /public/events/thursday-jazz-sessions`
renders as a **7-day multi-day event** with an "All 7 days" ticket scope — the
documented fallback — instead of a session rail, because nothing in the payload
says the dates came from one rule.

**Fix (backend):** expose a series signal on the public payload — e.g.
`recurrence: { rule_id, rrule, active }` (or `is_recurring`) on
`EventListSerializer` / `EventDetailSerializer`, and surface `source_key` (or a
`series_id`) on the public `event_dates[]` so the client can group sessions.

**Status: open — degrading (filed 2026-10-15; frontend renders multi-day as a flat day list — no invented series. 2026-10-15: recurring UI ported + wired behind the signal, so it lights up with no further frontend change once this resolves).**

**Frontend follow-up (tracked):** `.scratch/recurring-ui/` — spec + ticket
`01-recurring-session-wireup.md`. Steps 2–5 (card `FormatTag` + `cardFormat`,
port + `lib/recurring` view-model + inert `EventDetailPage` wiring, guarded by
`e2e/recurring.spec.ts` and `src/components/EventCard.test.ts`) are **done**;
step 1 exists against a **provisional** shape isolated to the adapter. Only
step 6 (`OccurrenceStrip`/`SessionPill` on cards) remains, gated on the
confirmed wire shape.


### #69. Public product payload omits date allocations — a whole-festival pass is indistinguishable from a single-day offer — RESOLVED 2026-10-16

The backend **models per-date offer scope**: `Catalog::ProductDateAllocation`
(`app/models/catalog/product_date_allocation.rb`; table
`catalog_product_date_allocations` — `event_product_id`, `event_date_id`,
`allocation_basis_points`) ties a product to specific event dates, and
`Catalog::ProductDateAllocationSerializer` already serializes it. The **public**
product surface never exposes it:

- `Catalog::PublicProductsController#index`
  (`app/controllers/catalog/public_products_controller.rb:16-18`) eager-loads
  `:ticket_type, :prices, :inventories, :product_accesses` — **not
  `:date_allocations`**.
- `Catalog::Public::EventProductSerializer`
  (`app/serializers/catalog/public/event_product_serializer.rb:8-14`) exposes no
  `date_allocations` / `event_date_id`.
- `ticketing_ticket_types.date_selection` is only `fixed | choose_one` (check
  constraint in `db/structure.sql`) — neither value states which dates an offer
  covers; `choose_one` is the *buyer* picking a date at registration.

**Why it degrades:** a multi-day event's offers are indistinguishable in the
public payload, so the client guesses. `resolveFestivalSchedule`
(`src/lib/festival.ts:153-157`) calls a tier a festival pass when its **name**
contains `pass`/`full`/`weekend` (or `admissionsPerUnit > 1`), and renders every
other tier as a single-day offer. A day pass not named "pass" — or a full pass
named "Gold" — lands in the wrong group, so the "From …" pass price and the day
tier list are wrong. That is an invented classification (ADR-0002).

**Fix:** eager-load `:date_allocations` in the public products controller and add
`date_allocations` (or a flattened `event_date_ids`) to
`Catalog::Public::EventProductSerializer`. A product with no allocation covers
every date (today's implicit behaviour).

**Status: open — degrading (filed 2026-10-15; controller + serializer + `structure.sql` code read).**


### #70. Public `event_dates` is unbounded and unfiltered (no upcoming window) — a recurring series ships its whole set — RESOLVED 2026-10-16

`Events::Event` has an unscoped `has_many :event_dates`
(`app/models/events/event.rb:32-33`) and the public show action includes every one
of them (`app/controllers/events/public_events_controller.rb:38-56`): no
upcoming-only window, no `limit`, no date pagination, no `from`/`to` param.
`EventDateSerializer` serves them all.

**Why it degrades:** a recurring event materialises a date per occurrence
(`MaterializeRecurrenceJob`), so a long-running weekly series returns every
materialised date on every detail request — the payload grows without bound and
the recurring session rail / `choose_one` date step must discard what they cannot
show. Verified live 2026-10-16: `GET /public/events/thursday-jazz-sessions` → all
**7** materialised dates, with no way to ask for a window. (Purchase is gated by
`Orders::EventDateEligibility`, so a past date cannot be *bought* — the harm is
the listing/UX, not a sale. The seeded series happens to be all-future, so the
past-date half is inferred from the missing filter, not demonstrated on this
fixture.) The frontend filters client-side (`isDatePast` in `src/lib/festival.ts`)
but receives data it must discard.

**Fix:** scope the public projection to upcoming dates (`starts_at >= now` /
`ends_at >= now`, with an organizer escape hatch), or add
`GET /public/events/:slug/dates?from=&limit=`. Decide whether the count is capped
independently of pagination.

**Status: open — degrading (filed 2026-10-15; model + controller code read;
re-verified live 2026-10-16).**


### #71. Chapa provider fee is recorded 100× too large (a minor-unit value converted as if it were major)

`Payments::Providers::ChapaClient` converts the provider's fee major → minor:

```ruby
# app/services/payments/providers/chapa_client.rb:230
provider_fee_minor: minor_amount(data[:service_fee].presence || data[:charge]),
# :324-328
def minor_amount(amount)
  (BigDecimal(amount.to_s) * 100).round(0).to_i
end
```

But Chapa V2 already reports `service_fee` (and `charge`) in the currency's **minor**
unit — the **same unit as `amount`** — so the ×100 is spurious.

**Evidence (live sandbox, 2026-10-16):** a completed payment of `amount: 100`
(**1.00 ETB**) returned `GET /v2/payments/HC50DSRDqACO/verify` →
`"amount":100, "service_fee":3`, and the Chapa receipt read **Charge 0.03 ETB**. The
adapter computes `minor_amount(3) = 300` and stores `provider_fee_minor = 300`
(**3.00 ETB**) for a real **0.03 ETB** fee — 100× too large. The in-repo test that
“proves” the conversion uses a fixture Chapa never emits —
`service_fee: "1.25"` (a major-unit decimal) → expects `125`
(`test/services/payments/providers/chapa_client_test.rb:277-291`) — which is why the
bug slipped through.

**Why it matters:** `provider_fee_minor` is persisted on `Orders::Payment`
(`orders_payments.provider_fee_minor`) and drives **platform provider cost** —
`Finance::PostPlatformBillingEntry` books a `provider_fee` entry of
`-payment.provider_fee_minor`
(`app/services/finance/post_platform_billing_entry.rb:69-72`) — and the
projected-vs-actual **payment-cost variance** in `Commercial::Reconciliation::Run`
(`:100-109`). Every verified/paid Chapa payment records 100× the real gateway cost
(the refund paths inherit it through `ApplyRefundResult`).

**Fix:** stop converting — the provider's value is already minor:

```ruby
# service_fee / charge are ALREADY minor units — do NOT multiply by 100
fee = data[:service_fee].presence || data[:charge]
provider_fee_minor: fee && Integer(fee)
```

Replace the test fixture with a real minor-unit value (`service_fee: 3` →
`provider_fee_minor: 3`), add a response-shaping test, and confirm the refund path
(`refund`/`verify_refund`) uses the same unit.

**Status: open — degrading (filed 2026-10-16; live sandbox verify + code read).**

### #72. Public **detail** payload omits `event_lifecycle` / `ticket_availability` — an ended event's detail page can no longer gate purchase

The 2026-10-16 release (PR #37) moved `event_lifecycle` + `ticket_availability`
onto the **list** serializer (`Events::Public::EventListSerializer`, #54 resolved)
but the **detail** serializer does not carry them:

```ruby
# app/serializers/events/public/event_detail_serializer.rb
attributes :id, :slug, :title, :description, :visibility,
           :timezone, :currency, :published_at, :created_at,
           :is_recurring, :event_dates_preview, :event_dates_url
# no :event_lifecycle, no :ticket_availability
```

**Why it matters (corrected 2026-10-24):** the authoritative detail projection
is still absent, but the frontend already mitigates it. `EventDetailPage.tsx:100-138`
probes the full schedule from the epoch when the preview is empty and derives
ended state. The old claim that every ended detail can no longer gate purchase
is therefore stale. The adapter already supports both eventual server fields.

The preview predicate is `ends_at > at`
(`app/services/events/public/dates_query.rb:24-26`), covering ongoing as well as
upcoming dates; `starts_at >= from` belongs to the separate schedule endpoint.
The client probe is an extra request/heuristic rather than the missing
server-evaluated lifecycle/availability contract. No new detail projection has
landed in the fetched backend; retain the mitigation meanwhile.

**Fix:** add `:event_lifecycle` (and `:ticket_availability`, for consistency with
the list) to `EventDetailSerializer`, sourced from the same
availability-summary projection the list uses, so the frontend can gate the
detail from a server-evaluated signal instead of a client heuristic.

**Status: open — degrading (filed 2026-10-16; live probe + serializer read).**


### #54. Discovery availability has no backend source — RESOLVED 2026-10-15

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

**Status: RESOLVED 2026-10-15** — the batched projection asked for is served:
`Events::Public::EventListSerializer` exposes `ticket_availability`
(`available` / `coming_soon` / `sold_out` / `sales_closed` /
`no_public_tickets` / `no_eligible_dates` / `unavailable`) and
`event_lifecycle` (`upcoming` / `ongoing` / `ended` / `unscheduled`) per event,
computed by `Catalog::Public::EventAvailabilitySummary.call`. Verified live
2026-10-15: `GET /public/events` carries both keys on every row, and the
discovery grid renders real **SOLD OUT** badges (`jubilation-africa`,
`musical-karaoke`). The frontend was already wired
(`events-adapter` → `Event.ticketAvailability`/`eventLifecycle` →
`lib/eventAvailability` → `EventCard`). Original filing: 2026-09-30
(`326f6a3`).

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

### #39. No public endpoint exposing payout `bank_slug`s — RESOLVED 2026-09-30

**Resolved** — `GET /marketplace/seller/payout_accounts/destinations`
(`config/routes.rb:348-349`, `get :destinations, on: :collection`) serves the
provider's destinations, and `Marketplace::SellerPayoutAccount::TYPES` was widened
to `%w[bank mobile_money]`. The frontend fetches the list instead of hardcoding
slugs (`src/lib/payout.ts`). Kept below as history.

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

**Status: resolved 2026-09-30** — the `destinations` collection endpoint exists and
`TYPES = %w[bank mobile_money]`; frontend wired. Original filing 2026-09-18 (live
422/201 pair + serializer read).

**Needed from the backend dev:**
- `GET /marketplace/seller/payout_accounts/banks` (seller-scoped) returning the
  provider's destinations (`bank_slug`, `bank_name`, `type`, …).
- Widen `Marketplace::SellerPayoutAccount::TYPES` to the provider's own rail
  types (`bank`, `mobile_money`, `store_value`), keeping
  `marketplace_payout_accounts_type_check` in sync.

**Frontend state:** currently wired to that endpoint (`src/lib/payout.ts` fetches
the list instead of hardcoding slugs) — the payout-methods flow therefore depends
on this gap landing.

### #8. `UserAuthSerializer` lacks `name`; no `Core::User.name` column — RESOLVED 2026-10-16

**Resolved by `aad3a903` (2026-10-11).** `Core::UserAuthSerializer` was renamed to
`Core::CurrentUserSerializer` and now embeds a profile:
`has_one :profile, serializer: Core::UserProfileSerializer` exposing `first_name`,
`last_name`, **`full_name`** and `avatar_url`; `Core::Signups::Complete` creates the
`Core::UserProfile` from the signup names. The frontend maps `profile.full_name`
(`src/lib/auth.ts`) and no longer fabricates a display name. The original
description is kept below as history.

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

**Status: resolved 2026-10-16** — the auth payload serves `profile.full_name`
(`Core::CurrentUserSerializer`) and signup creates the profile; frontend wired.
Original filing 2026-09-09.

### #9. No self-service `PATCH /auth/me` or `PATCH /users/me` — RESOLVED 2026-10-16

**Resolved by `resource :user, only: %i[show update], controller: "users"`
(`config/routes.rb:11`, `scope module: :core`)** → `GET /user` (read) and
`PATCH /user` (update first_name/last_name), plus `PUT/DELETE /user/avatar`. Note
`GET /auth/me` itself was **retired** (replaced by `GET /user`). The frontend is
wired (`src/lib/auth.ts` `me()` → `GET /user`, `updateProfile()` → `PATCH /user`).
The original text is kept below as history.

Original text (history): *"Routes expose only `GET auth/me` — no update endpoint."*
That is stale — `GET /auth/me` has been retired and `GET`/`PATCH /user` now exist.

**Status: resolved 2026-10-16** — `GET/PATCH /user` exists; frontend wired.
Original filing 2026-09-09.

### #33. Guest payment-refresh re-validates the quote token even for accepted payments — RESOLVED 2026-09-30

**Resolved** — `Orders::ResolveGuestOrderAccess` prefers an `order_access_token`
(`GuestOrderAccessToken`, purpose `orders.guest_order_access`) and only falls back
to the quote token. Kept below as history.

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

**Status: resolved 2026-09-30** — `ResolveGuestOrderAccess` accepts an
`order_access_token`; the guest return screen correlates creds per payment.
Original filing 2026-09-09.

### #34. Past events remain purchasable — no date / sales-window enforcement — RESOLVED 2026-09-30

**Resolved** — `Orders::EventDateEligibility.error_for` now gates both
`Orders::BuildQuote` (quote) and `Orders::CreateCheckout#validate_event_date_eligibility!`
(order), and the product sales window is enforced at
`Catalog::Inventory::Reserve#validate_sales_window!`. Kept below as history.

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

**Status: resolved 2026-09-30** — the event-date gate now runs in `BuildQuote` +
`CreateCheckout` (`Orders::EventDateEligibility`); the product sales window is
enforced online. Original filing 2026-09-09 (re-verified partial 2026-09-21).

### #44. Public `public_guest_limit` remains exposed but inert (narrowed 2026-10-24)

**Status: open — degrading.** `Events::Public::EventSettingSerializer` exposes
`public_guest_limit` (`app/serializers/events/public/event_setting_serializer.rb:8`),
but there is no application reader or enforcing rule for that value. Backend
ownership is needed to define and enforce its intended semantics or remove it
from the public contract. The frontend must not invent a guest-limit rule.

The original event-level `event_type` / `access_mode` / `rsvp_*` / plus-one ask is
superseded by the implemented **offer-scoped** `audience`, `approval_mode`,
`waitlist_enabled` and served product prices. Seeds have stopped writing the dead
vocabulary. Public serializer tests expressly exclude `event_type` and
`allow_waitlist`. Restoring these old modes would be a new backend/product
choice, not a missing frontend integration.

The old assertion that no config can be written is also stale: age restriction
writes are supported by `app/controllers/events/events_controller.rb:147-170`
and `app/services/events/create.rb:25-27`; that portion is already frontend-wired
under #53. It does not revive obsolete admission keys.

**Frontend:** existing offer-driven admission wiring remains correct. No new
surface to wire. Historical superseded portion → `docs/NOT_BACKEND_GAPS.md` #44.
Verification: source/tests/schema read on 2026-10-24; no live API claim.

### #45. RSVP has no sold-out signal or waitlist fallback; `rsvp_capacity` ignored — RESOLVED 2026-09-30

**Resolved** — a sold-out selection now returns
`next_action.type: "waitlist_available"` (+ `event_product_ids`), and the
offer-scoped public waitlist exists
(`POST /public/events/:slug/admission_offers/:product_id/waitlist` +
`/request_otp`, `config/routes.rb:150-153`). Kept below as history.

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

### #46. No saved-events / favourites, home feed, or reviews/ratings

`POST/DELETE /events/:id/save` + `GET /saved_events` do not exist (no
saved/wishlist/favourite table). The **`GET /feed` route is declared but broken**:
`config/routes.rb:527` points it at `feed#index`, yet there is **no
`app/controllers/feed_controller.rb`**. There is no consumer review/rating
endpoint (`core_reviews` is the organizer-verification workflow).

**Correction 2026-10-16:** a user social graph **does** exist — follows target
`venues|artists|organizations` (`config/routes.rb:81`) with
`GET /users/:id/following`, consumed by `src/lib/follows.ts`. What is missing is
only a *follows-based feed* (see `GET /feed` above) and a *user-to-user* graph.

**Frontend today:** the event hero heart is local-only (`EventDetailPage.tsx`),
and Profile/RSVP render fabricated "suggested friends" (now removed) — nothing
persists.

**Fix:** a saved-events table + routes; implement `Core::FeedController` (or drop
the route); a consumer reviews endpoint; optional social graph.

### #47. No gift-ticket endpoint — RESOLVED 2026-10-16

**Resolved by `e5e3dc8d` (2026-10-07, "Implement gift purchase management").** A
full gift flow exists:

- buyer: a checkout **gift intent** (`Orders::CreateCheckout` →
  `invalid_gift_intent` guard) creates a gift purchase, listed via
  `GET /orders/:order_id/gift_purchases` with `POST .../:id/resend`;
- recipient: `POST /public/gift_purchases/:id/resolve` (peek) and
  `POST /public/gift_purchases/:id/claim` (bearer token in the body; every
  response private/non-cacheable).

**Frontend correction 2026-10-26:** the core single-recipient flow now consumes
these endpoints: documented fragment links, scoped questions and consents, claimed
active-ticket QR, payment confirmation, and purchaser delivery tracking/resend.
Eleven browser/API tests cover it. Multi-recipient batch checkout remains frontend
work in `.scratch/handoff-wireup-2026-10-26/issues/01-multi-recipient-gift-checkout.md`;
this resolved backend gap does not mean the entire gifting document is complete.

**Status: resolved 2026-10-16** — gift purchase + claim flow served (`e5e3dc8d`,
2026-10-07); frontend wired. Original filing 2026-09-30.



### #48. No consumer account preferences, 2FA, or password change/reset

No user-preference surface (language/currency/region), no 2FA (enroll/verify/
disable, recovery codes), and no password change/forgot/reset. `GET`/`PATCH /user`
(#9, resolved) cover first/last name + avatar only — `Core::User` still has no
language/currency/region/preferences columns. Settings renders language/currency/
region pickers, a "Public profile" toggle, a 2FA sheet, and a disabled "Change
password · Coming soon" row — the pickers/2FA/change-password are local-only.

**Fix:** a preferences surface (extend `PATCH /user` or a new endpoint with
language/currency/region), password-change + reset endpoints (#57), and a 2FA
surface if required.

### #49. `GET /public/events` has no search/filter/sort (pagination now exists) — RESOLVED 2026-10-16

**Correction 2026-10-16:** pagination **is** served — the index returns the
`Core::Pagination` envelope (`page`/`per_page` params; `pagination` meta with
`current_page`/`per_page`/`total_count`/`total_pages`/`links`). Verified live:
`GET /public/events` → `total_count: 33`, 25/page, and `?per_page=5` honours it.

What remains missing: `Events::PublicEventsController#index` applies **no**
query/category/city/date/price filter and **no** sort — `?q=`, `?city=` and
`?sort=` are silently ignored (verified live: `?q=jazz` → same `total_count`).
There is also no `GET /organizations/:id/events`, `/artists/:id/events`, or
`/venues/:id/events` (all 404).

**Frontend today:** discovery search/filter/sort runs client-side over a single
page (`useEventFilter.ts`); it now pages via the meta but still cannot search
server-side.

**Fix:** server-side query/category/city/date/price/sort on the public events
index; events-by-followable endpoints.

### #50. Wallet & history gaps — RESOLVED 2026-10-16 (registration answers + edit window)

**Frontend follow-up 2026-10-26:** served answer metadata is mapped, but wallet
answer viewing/revision UI remains frontend work (handoff issue 02). The backend
resolution does not establish that this UI is implemented.


`TicketWalletSerializer` omits the ticket's **registration answers and edit
window**, so `EditTicketAnswersDialog` can never open for a live ticket (the
backend *does* expose `POST /registration_answers/:id/revise`, but the wallet
carries no answer ids/window). It also has no per-ticket `can_transfer` /
`can_resell` / `can_cancel`. Separately there is no `GET /orders`,
`GET /registrations` (list), `GET /tickets/:id`, `GET /ticket_transfers`
(incoming), or `GET /credential_claims` (pending), and no
`GET /notifications/unread_count` / `POST /notifications/read_all`.

**Correction 2026-10-16:** a single `GET /registrations/:id` **does** exist
(`config/routes.rb:266`, `resources :registrations, only: :show`) — but a
buyer-scoped *list* does not.

**Fix:** project answers + `answers_editable_until` + capability flags on the
wallet serializer; add buyer-scoped list endpoints; add unread-count/mark-all.

### #51. No events-by-followable; no profile stats — RE-SCOPED 2026-10-16 (merged into #49)

**Corrected 2026-09-21.** The public DETAIL endpoints *do* carry stats/socials —
`GET /organizations/:id` exposes `description`, `social_links`, `events_count`,
`follower_count`, `verified`, `is_following`; `/venues/:id` and `/artists/:id`
expose `is_following` too. The event payload's organization summary is minimal by
design. The frontend now fetches the organization profile and wires follow/unfollow
(`src/lib/organizations.ts`, `src/lib/follows.ts`).

**Re-scoped 2026-10-16 — two of the three "missing" items are not backend gaps, and
the third is already tracked under #49:**
- **venue stats/amenities** → **reclassified (frontend-hydratable).** The venue is
  fully hydratable from public `GET /venues/:id` (media + coords; the venue
  *media/coords* seed task is done, 2026-10-15). `VenueSummarySerializer` carrying
  media/coords would be a convenience, not a gap. See `NOT_BACKEND_GAPS.md`.
- **profile gamification** → **deferred (product decision).** Tier / XP /
  events-attended / total-spent / achievements were never a backend feature. See
  `NOT_BACKEND_GAPS.md`.
- **event history per followable** — the one genuine ask,
  `GET /organizations|venues|artists/:id/events` — was **already tracked under #49**
  (whose at-a-glance row names events-by-organizer/artist/venue). Nothing unique is
  left here.

**Status: re-scoped 2026-10-16 — merged into #49 (venue stats hydratable;
gamification a product decision).** Original filing 2026-09-21.

### #58. `active_checkout_exists` 409 carries no order id → the client can't resume or discard the open checkout — RESOLVED 2026-10-16

**Resolved by `Orders::ActiveCheckoutRecovery` (`b1d6e86f`).** When
`Orders::CreateCheckout#active_checkout_conflict!` fires, the 409 now includes
`meta: { active_checkout: recovery }` where `recovery` is
`{ order_id, expires_at, payment?, order_access_token? }` (the token only for a
verified guest context) — enough for the client to offer **Continue checkout** /
**Restart**. The original text is kept below as history. **Frontend follow-up:**
`ConflictSheet.tsx` still only offers "View Tickets" — tracked in
`.scratch/gap-wiring-2026-10-16/01-active-checkout-resume.md`.

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

**Status: resolved 2026-10-16** — the 409 carries `meta.active_checkout`
(`Orders::ActiveCheckoutRecovery`, `b1d6e86f`). Original filing 2026-09-30
(frontend does not change backend code).

### #61. A pending ticket transfer is invisible to the recipient in-app — RESOLVED 2026-10-16

**Resolved** — `ticketing.ticket_transfer.initiated` is now in
`Messaging::OutboxHandlers::PublishTransactionalNotification::EVENT_TYPES`
(→ `transfer_incoming`) and a definition exists in
`app/services/messaging/notification_types.rb:121`:
`channels: %w[in_app]`, `recipients: ->(source:, **) { source.to_user }`,
projecting `transfer_id, ticket_id, event_id, event_title, ticket_label,
expires_at`. So a pending transfer is now visible in-app to the recipient (the
frontend already labels `transfer_incoming` — `src/lib/notifications.ts`).

**Residual (non-blocking):** there is still no `GET /ticket_transfers` index
scoped to `to_user`; discovery is via the notification, and the authenticated
`POST /ticket_transfers/:id/accept` path exists. The original text is below as
history. **Frontend follow-up:** offer the accept action straight from the
notification — tracked in `.scratch/gap-wiring-2026-10-16/03-transfer-incoming-accept.md`.

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

**Status: resolved 2026-10-16** — the in-app `transfer_incoming` notification now
fires on initiation for `to_user` (carries `transfer_id`). Original filing
2026-10-01 (dev-DB audit). **Frontend wiring completed 2026-10-17:** the
`transfer_incoming` card now offers an **Accept** action → tokenless
`POST /ticket_transfers/:id/accept` with `data.transfer_id`, wallet refreshed on
success (`e2e/transfer-accept.spec.ts`). Residual (unchanged): there is still no
incoming-transfers **list** endpoint, so the notification is the only in-app
accept surface — the wallet cannot show a *pending* incoming transfer.

### #62. A pending (unaccepted) outgoing transfer is invisible on the sender's wallet ticket — RESOLVED 2026-10-16

**Resolved** — `Ticketing::TicketWalletSerializer` now projects the pending
transfer: `pending_transfer` returns
`{ id: transfer.id, status: transfer.status, expires_at: transfer.expires_at }`
(or `nil`), from `object.pending_ticket_transfer`. The original text is kept
below as history. **Frontend follow-up:** `src/lib/tickets.ts` does not yet map
`pending_transfer` to a "Transfer pending" badge / gate — tracked in
`.scratch/gap-wiring-2026-10-16/02-wallet-pending-transfer.md`.

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

**Status: resolved 2026-10-16** — the wallet ticket serves
`pending_transfer { id, status, expires_at }`. Original filing 2026-10-01
(reported by the user; code read).

### #63. `admission_selections` is ticket-only → a ticket + extra cart is rejected — RESOLVED 2026-10-05

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

### #36. Public event payload lacks lineup/participants (lineup only) — RESOLVED 2026-10-17

`EventDetailSerializer` / `EventListSerializer` exposed only categories,
event_dates, event_media, event_organizations, event_setting, organization —
**no event participants/artists** (`events_event_participants` was auth-gated),
so the Lineup section rendered **absent** even with seed data present. This was a
backend SERIALIZER gap.

**Resolved 2026-10-17:** `EventDetailSerializer` now `has_many :event_participants`
(`app/serializers/events/public/event_participant_serializer.rb`, ordered by
`[display_order, id]`) serving `{ id, artist_id, event_date_id, name, type,
description, display_order }`. Verified live:
`GET /public/events/addis-sound-festival-2026` → 4 participants (3 day-pinned
performers + 1 event-level host). It is **detail-only** — the list serializer still
omits it (cards don't need it). Frontend wired: `events-adapter` maps the roster to
`Event.lineup` (`name`; `event_date_id` → `eventDateId`; `description` → the display
`role`), which drives `LineupSection` and the festival per-day bill; the adapter's
previously speculative profile fields (image/handle/genre/…) were dropped as
never-served. (`type` is the machine enum performer/host/…; the UI has no slot for
it.)

**Fix (landed):** add `participants` to the public detail serializer. See the
**#36 addendum** for the participant→date link (also landed).

**Status: resolved 2026-10-17.** (The venue-media/coords half split out of #36 was a
**seed** task, not a gap — fixed in the seed 2026-10-15; see
`NOT_BACKEND_GAPS.md`.)

### #36 addendum — expose the participant→date link when the lineup goes public — RESOLVED 2026-10-17

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

**Status: resolved 2026-10-17 (filed 2026-10-15; broadened #36, no separate
number).** The detail serializer now serves each participant's `event_date_id`, so
`resolveFestivalSchedule` takes its `hasPinnedDays` path (a pinned roster is
distributed by the backend link, not round-robin) and event-level participants fall
back to every day. The round-robin remains only as the fallback for an unpinned
roster.

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
| 54 | Discovery availability — `EventListSerializer` serves `ticket_availability` + `event_lifecycle` per event; frontend already wired (`events-adapter` → `lib/eventAvailability` → `EventCard`) | live HTTP 2026-10-15 (SOLD OUT badges on `jubilation-africa` / `musical-karaoke`) |
| 17 | Payment method — `Orders::Payment::PAYMENT_METHODS` now includes `cbebirr`; the payment-method gate (`payment_attempt_support.rb:28`) accepts it. Frontend CBE Birr enabled + sends `cbebirr` | code read + route/live probe 2026-10-16 (residual: `Commercial::FeeComponent::PAYMENT_METHODS` still omits it) |
| 8 | Display name — `Core::UserAuthSerializer` → `Core::CurrentUserSerializer` embeds `Core::UserProfileSerializer` (`first_name`/`last_name`/`full_name`/`avatar_url`); signup creates the profile. Frontend maps `profile.full_name` | code read 2026-10-16 (`aad3a903`) |
| 9 | Self-service profile — `resource :user, only: %i[show update]` → `GET`/`PATCH /user` (`GET /auth/me` retired). Frontend `me()`/`updateProfile()` wired | route grep + frontend 2026-10-16 |
| 47 | Gifting — public `POST /public/gift_purchases/:id/resolve\|claim`, buyer `GET /orders/:order_id/gift_purchases` + `resend`, checkout gift intent. Frontend `gifts.ts`/`GiftTicketDialog`/`ClaimGiftPage` wired | code read 2026-10-16 (`e5e3dc8d`, 2026-10-07) |
| 56 | Shadow-phone signup — signup OTP-verifies the phone and **upgrades** an existing shadow user (`Core::Signups::Complete`). Frontend `requestSignupOtp`/`verifySignupOtp`/`signUp` wired | code read 2026-10-16 (`aad3a903`) |
| 58 | Active-checkout recovery — the `active_checkout_exists` 409 now carries `meta.active_checkout { order_id, expires_at, payment, order_access_token }` (`Orders::ActiveCheckoutRecovery`) | code read 2026-10-16 (`b1d6e86f`) |
| 61 | Incoming transfer signal — `ticketing.ticket_transfer.initiated` → `transfer_incoming` (in-app, recipient `to_user`, projects `transfer_id`) in the outbox notification handler + `notification_types.rb:121`. Frontend labels it | code read 2026-10-16 (residual: no incoming-list endpoint) |
| 62 | Sender wallet pending transfer — `Ticketing::TicketWalletSerializer` serves `pending_transfer { id, status, expires_at }` | code read 2026-10-16; **frontend wired 2026-10-16e** (badge + action gate) |
| 49 | Discovery search/filter/sort — `Events::Public::Search` on `GET /public/events` (`q`≥2, `category`, `city`, `date_from`/`date_to`, `organization_id`/`venue_id`/`artist_id`, `sort`, `currency`, `min_price_minor`/`max_price_minor`; 422 `invalid_public_event_filter`). Also supplies events-by-followable. Frontend `eventsModule.fetchAll(query)` + discovery `?q=` wired | live HTTP 2026-10-16e (`?q=jazz`→1, `?category=music`→30, `?sort=soonest`→33, `?q=x`→422; baseline 33) |
| 50 | Wallet registration answers — `registration_answers { registration_id, url, answers_editable_until }` on the wallet ticket + `GET /registrations/:id/answers` (`EditableRegistrationAnswerSerializer`, `editable` via `Ticketing::Answers::CorrectionWindow`). Frontend maps `registrationAnswersUrl`/`answersEditableUntil` | code read 2026-10-16e; mapped |
| 68 | Recurrence signal — `is_recurring` on list + detail; every materialised date carries `series_id` (from `source_key`). Frontend recurring UI lights up (`resolveSeries`) | live HTTP + browser 2026-10-16e (`thursday-jazz-sessions` session rail) |
| 69 | Product date coverage — `EventProductSerializer#covered_event_date_ids` (ticket products). Frontend `TicketTier.coveredEventDateIds` → `resolveFestivalSchedule` real day assignment | live HTTP 2026-10-16e (7 ids for the GA product) + unit |
| 70 | Bounded dates — list `next_event_date`; detail `event_dates_preview` (≤7) + `event_dates_url`; new `GET /public/events/:slug/dates` (paginated). Frontend adapter + `fetchDates` wired | live HTTP 2026-10-16e (schedule total 7) |
| 53 (`featured`) | Discovery Featured — superseded by the paid **Featured endpoint** (`GET /public/featured_events`, `GET /public/events?featured=true`), not the removed `event_setting.config.featured`. Wired: `events-adapter` maps `placement_label` → `Event.featured`; `eventsModule.fetchAll` overlays the Featured set on the list; `fetchFeatured` reads the endpoint | live HTTP + browser 2026-10-15 (HEADLINERS · 2 EVENTS) |

---

## Discovered endpoints

Recorded for knowledge; most are now consumed (see the relevant gap/archive row).

### Public Featured discovery — paid placements (verified live 2026-10-15; wired)

- `GET /public/featured_events` → `Public::EventsController#featured`; renders the
  currently-serving paid placements (`Marketing::FeaturedPlacements::PublicQuery`)
  with `Marketing::FeaturedEventSerializer` (an `EventListSerializer` subclass
  that adds `placement_label: "featured"`). Unpaginated. Answers **503
  `featured_events_unavailable`** when placement resolution fails — there is no
  organic fallback.
- `GET /public/events?featured=true` → the same placement set, paginated, still
  serialized with the Featured serializer.
- Serving rule (why a fixture is needed to see anything): a placement must be
  `scheduled`/`active`, its event published + public with a future scheduled date
  and `ticket_availability == "available"`, and it must be backed by a **paid**
  `orders_billing_purchases` row and a **succeeded, accepted** `orders_payments`
  row. The dev fixture lives in `db/seeds/dev_demo.rb` §5.
- New on the branch but organizer/admin-facing (no consumer surface owed):
  `events/:event_id/featured_placements` CRUD, `admin/marketing/placement_offers`,
  `admin/marketing/placement_capacity_policies`,
  `admin/orders/refunds/:id/resolve_manual`.

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

### Guest waitlist enrollment should accept a phone number without SMS verification

The public offer waitlist currently requires guests to request and verify an SMS code before joining. Allow guests to submit their phone number and join without an OTP or verification token. Keep existing offer eligibility and any invitation or event access-code requirements. Once the endpoint accepts the phone-only request, the attendee app can remove the OTP step from guest waitlist enrollment.

### Discovery cannot distinguish RSVP offers from other free admission

The public event list exposes a starting price, but it does not identify which events have an RSVP admission offer. A zero starting price alone is insufficient for a dedicated RSVP filter. Expose a filter or list signal based on the current offer-driven admission model so discovery can match RSVP events without fetching every event's offers.


### #81. Guest RSVP requires SMS verification — OPEN, 2026-11-04

The admission checkout dispatcher rejects a signed-out guest's zero-total submission with `phone_verification_required` unless the guest has verified by SMS. A standard public RSVP should accept the guest's contact details and required answers without an SMS challenge. Confirm the policy for other zero-total flows separately, including discounted purchases. Keep ticket claiming and restricted-offer access checks separate. Once the admission endpoint accepts a standard public RSVP without proof, the attendee flow can complete without opening the OTP fallback.
