# digis-web (frontend)

Event ticketing consumer frontend for the Digis platform (Ethiopia market).
Vite + React + TypeScript app. Consumes `digis_backend` (Rails API at
`http://localhost:3000`).

## Key commands

```bash
pnpm install      # install deps
pnpm dev          # start Vite dev server
pnpm build        # production build (vite)
npx tsc --noEmit  # typecheck
npx vitest run    # unit tests (259)
pnpm test:frontend   # deterministic browser/API regressions
pnpm test:browser    # includes live seeded Rails integration
pnpm test:acceptance # real Chapa sandbox payment → exact ticket + usable QR
pnpm test:release    # all checks, including the live acceptance gate
```

Checks are `npx tsc --noEmit` + `npx vitest run` + `pnpm build` (+
`npx playwright test` for the full stack). There is no lint script.

## Integration status (IMPORTANT)

The frontend is being wired from 100% mock data to the real Rails backend.
**The user is the FRONTEND developer — do NOT make backend product changes.**
Our frontend scope is the attendee `digis-web` app. Treat organizer/admin
`digis-apps` product code as read-only; hand off defects in `docs/ORGANIZER_GAPS.md`.
Backend product changes = architecture, schema/migrations, models, controllers,
routes, serializers, policies, services — anything in `digis_backend` that
changes what the API *is* or *returns*. When the frontend needs a backend surface
that does not exist (or is wrong), **file it in `docs/BACKEND_GAPS.md`** for the
backend developer to fix. Never implement it yourself, even when it would unblock
you — an endpoint we wrote is not a resolved gap.

The one exception is **dev-environment setup**: seeds, `config.hosts`, dev jobs,
tunnels, helper scripts. That is setup, not a product change, and it belongs in a
separate `chore(dev)` commit — never bundled with frontend work.

Before doing integration work, read:

- `docs/superpowers/plans/2026-08-28-frontend-backend-integration.md` — the plan
- `docs/handoffs/INTEGRATION_STATUS.md` — live status of what is done / next

## Backend contract (verified against the live API)

- No `/api` prefix — host-root paths: `auth/login`, `public/events`, ...
- Response envelope `{ success, message, data, pagination }`; read `data`
- Errors `{ success:false, error, errors?, code }` — `code` is top-level/flat
- Auth: `Authorization: Bearer <access_token>`; refresh token goes in the body
- Money: integer **cents** everywhere (`*_minor` fields). Use `src/lib/money.ts`
  (`Money` value object) — never floats, never raw decimals.
- IDs: UUID strings. Dates: ISO 8601. Mutations need an `Idempotency-Key` header.
- `src/lib/api.ts` = central client (`apiFetch`, `apiOrSeed`).

## THE RULE: the backend guides the design (IMPORTANT)

**Before proposing or deciding ANY frontend design, logic, or architecture — read
the backend first.** The Rails API is the source of truth for behaviour, money,
fees, and the order of operations. The frontend mirrors the backend contract;
it does not invent its own.

- Money: backend computes ALL amounts (quote → order → payment). Frontend only
  displays server totals. There is NO frontend fee engine.
- Order flow: quote (`quote_token`) → create order (token only + `Idempotency-Key`)
  → payment attempt → webhook → async ticket issuance. The frontend never issues
  tickets; it mirrors this pipeline.
- Fees come from the backend's configurable commercial fee schedule, never from
  a hardcoded frontend percentage.
- If a frontend design can't be traced to a backend endpoint/serializer, it's
  suspect — question it before building.
- When unsure, explore the backend (app/controllers, app/services, app/serializers)
  BEFORE recommending.

## Money rule

All monetary values are integer cents, paired with a currency, wrapped in
`Money` (src/lib/money.ts). Convert to display units ONLY via `money.format()`.
Never do `price / 100` or `price * 0.05` in components.

## Error handling & feedback rule

**A failure must never look like success, emptiness, or absence.** Housekeeping
sweep 2026-09-19 (commits `6c1f717`, `b08db36`, `fe74e32`) fixed violations of
this; keep it that way.

- **Forms / field errors:** attach the message to the field that caused it.
  Pass `error` to `AppInput`/`AppTextArea` (it sets `aria-invalid`, an `id`,
  and a `role="alert"` description) or render `<FieldError>` under the input,
  plus a red border. Do **not** use one global error line for a multi-field
  form. Map backend `ApiError.fieldErrors` to fields with `mapFieldErrors`
  (`src/lib/errors.ts`); unrecognized messages go to a form-level banner.
- **Feedback layer:** `toastError`/`toastSuccess`/`toastWarning`
  (`src/lib/feedback.ts`, sonner). Use a toast when no form is left on screen
  (e.g. a sheet that closes on submit); otherwise prefer the inline message.
- **Queries:** render `isError` explicitly with a retry (`LoadErrorCard` or an
  inline retry). Never let a failed fetch collapse into an empty state ("No X
  available") or a false "all caught up".
- **Commands:** disable the trigger while pending; on failure show an inline
  error or a toast; only show success **after the server confirms** (never an
  optimistic "done"/"delisted" before the response).
- **Enrichment reads:** degrade quietly only when truly optional; if the
  failure blocks the user, surface it with a retry.
- **Copy:** route errors through `mapApiError` (`src/lib/errors.ts`); add new
  backend codes to `CODE_MESSAGES` so they get friendly text.

## Routing rule

Real routes for destinations; state only for the transient.

- **Routes:** `/`, `/events/:slug`, `/tickets`, `/tickets/:id`, `/profile`,
  `/resale`, `/resale/events/:slug`, `/resale/listings/:id`, `/settings`,
  `/login`, `/signup`, `/claim/:id`, `/create`, `/ui-preview`.
- **Must be a route** when it is linkable, shareable, refresh-safe, or should be
  closed by the browser Back button: auth, ticket detail, resale event/listing,
  discovery search (`?q=`). `pathToView` maps prefixes (`/tickets/*`,
  `/resale/*`) so nested routes keep the shell view.
- **Keep as state** (modal/sheet) when transactional or ephemeral: checkout
  steps, OTP steps, transfer/gift, sell/payout sheets, confirmations, pickers.
- **Auth is a standalone route** (`AuthRoute`): CTAs go via
  `requestAuth(mode)` → `navigate('/login'|'/signup', { state: { returnTo } })`;
  `returnTo` is validated (relative-only), the route redirects away when already
  signed in, and signin↔signup swaps the same modal instance (no remount/double
  modal). Do not re-introduce the "modal over the current page" variant — its
  presence was not deterministic under load.

## Backend gaps (do NOT build against these — flag to backend dev)

Single source of truth: **`docs/BACKEND_GAPS.md`** — **backend defects only**
(blocking → degrading → resolved archive). Items that are *not* backend defects
(reclassified/frontend-fixable, setup, superseded, informational, deferred) live
in **`docs/NOT_BACKEND_GAPS.md`** — do not re-file them as gaps. Open backend
items that matter for new work:

**A backend gap is a deficiency in the backend's code/API/contract** that the
backend dev must fix (missing field/endpoint, wrong status or rule,
serializer/policy gap). **Setup is NOT a gap** — seeds, dev env config
(`config.hosts`, `config/recurring.yml` dev jobs), provider/dashboard webhook
registration, API keys, webhook secret hashes, env vars, tunnels, deploys. Never
file a setup chore as a gap — record it in the setup section of
`docs/NOT_BACKEND_GAPS.md` (or the setup doc it belongs to).

**Filing is the whole action.** Fixing a gap is backend product work and is never
ours — do not patch `digis_backend` to close a gap, and do not mark a gap
resolved because a local, uncommitted backend change makes it work. Only the
backend developer's committed change resolves a gap.

**When you discover a backend gap** (during verification, a live API probe, a
code read, or a route grep) — **file it yourself in `docs/BACKEND_GAPS.md`
immediately, without asking or re-explaining it in chat.** Give it the next
free number, one of the five statuses, the evidence (route/serializer/code +
verification date), why it matters, and a concrete fix. Then update the status
snapshot in `docs/handoffs/INTEGRATION_STATUS.md` and this list if the entry
changes the open/resolved picture. Do not let a confirmed gap live only in the
conversation — the docs are the single source of truth.

**Frontend-wiring sweep — a backend status change is not "done" until the
frontend consumes it.** Every run that verifies backend fixes (a merge, a live
probe, a code read) MUST sweep the FULL gap list for status changes — "resolved"
AND "partial" — and for each one ask: "is there a frontend code path that should
now use this backend surface?" Wire it, or file it as a tracked follow-up in
`.scratch/`, before the run ends. **A "partial" backend fix is still a frontend
obligation** — e.g. #18's `POST /payments/:payment_id/refresh` exists so the
Chapa return screen should call it instead of blind wallet-polling; that wiring
is frontend work, not optional. Do not report "aligned with backend gap fixes"
unless every status change was swept and either wired or tracked. History: the
2026-09-08 wiring run wired the five _resolved_ gaps (#24/#25/#7/#22/#19) and
missed the one _partial_ one — #18 `payment_refresh` is still unwired. This
sweep is the rule that prevents that.

**Latest backend integration (2026-11-01):** remote `c15d6ff3` merged as
`5c2890c7`; local seed/catalog changes preserved. No backend product patches.
#75 payment correlation is resolved and real sandbox acceptance passes after
restarting Rails/workers. #74 batch contract is frontend-wired (stable line IDs,
per-recipient rows and delivery ordering), but #76 blocks live existing-DB gifts.
See latest INTEGRATION_STATUS entry and `.scratch/backend-wireup-2026-11-01/`.

**Open — blocking:** #53 (**seat_map** only), #57, #73, #76.
**Partial:** #74 (live rollout awaits #76 forward migration).
**Open — degrading:** #38, #44, #46, #48, #67, #71, #72, #77–#80.

- **#38 reopened 2026-11-02:** `requires_ticket:true` extras receive quotes without
  admission entitlement. Frontend gating is not backend enforcement; no product
  patch or payment was made to close this gap.

- **#53** Public detail payload drops **`seat_map`** (re-scoped 2026-10-16:
  `rating` / `answer_edit_window_hours` / `price_foreign_from_minor` dropped as
  unconsumed; no `seat_map`/seating model exists) → the checkout SeatMap step
  renders absent (ADR-0002 forbids inventing it). **The `age_restriction` half is
  RESOLVED 2026-10-17** — the detail serves
  `event_setting.config.age_restriction` and the adapter maps it to the Age card.
  lineup → #36 (resolved).
- **#75 resolved 2026-11-01:** committed Chapa success correlation verified by
  real sandbox payment → exact ticket → decoded QR → reload persistence. No
  historical expired payment recovery claimed.
- **#74 partial 2026-11-01:** repeated quantity-one gifts now accept stable UUID
  line_id; frontend batch checkout/retry/delivery mapping wired and tested.
- **#76 open 2026-11-01:** client_line_id was added to an old migration, with no
  forward migration. Existing DB lacks the column. Backend engineer owns fix;
  do not patch schema or claim live gift acceptance.
- **#73** Consumer achievements have no backend contract. The backend developer
  owns earning rules and API design; do not invent them in the frontend.
- **#57** No password reset / forgot-password endpoint (phone-first reset would
  reuse the existing OTP infra).
- **#60 (withdrawn 2026-10-16 — FALSE POSITIVE)** The claim that Chapa `amount` is
  sent "100× too large" is wrong: Chapa V2 is **minor-unit on both request and
  response** (live probe: `amount: 100` → **1.00 ETB**), so
  `integer_amount(amount_minor)` is correct. Detail in `NOT_BACKEND_GAPS.md`. The
  real unit defect is **#71**.
- **#65 reclassified 2026-10-24:** synthetic provider test recipient was rejected;
  successful settlement remains unverified (NOT_BACKEND_GAPS.md). No confirmed
  request-shape defect; do not claim a payout fix.
- **#44 narrowed 2026-10-24:** public `public_guest_limit` remains inert;
  obsolete event-level admission keys are superseded by offer-scoped rules.
- **#46** No saved-events/favourites, follows-based feed (`GET /feed` has no
  controller), or reviews/ratings. (Follows to venues/artists/organizations *do*
  exist.)
- **#48** No consumer account preferences (language/currency/region), 2FA, or
  password change. (Notification-channel prefs exist; account prefs do not.)
- **#51 (merged into #49, 2026-10-16)** — venue stats are hydratable from public
  `GET /venues/:id` and profile gamification is a product decision (both →
  `NOT_BACKEND_GAPS.md`); the only real part — events-by-followable — lives in #49.
- **#67** `Core::UserProfile` enforces mandatory `last_name` (`null: false`,
  presence) → single-name signups need a client-side fallback (`splitFullName`).
- **#72** Public detail still omits lifecycle/availability. Existing schedule
  probing mitigates ended-event gating; no new server projection has landed.
- **#71** Chapa `provider_fee_minor` is recorded 100× too large — the adapter
  converts the provider's **minor-unit** `service_fee`/`charge` as if it were major
  (`minor_amount` × 100), so a real 0.03 ETB fee is stored as 3.00 ETB → overstates
  platform provider cost + reconciliation variance (`Finance::PostPlatformBillingEntry`,
  `Commercial::Reconciliation::Run`). No frontend impact.

**Attachment audit / wiring 2026-10-26:** older “all wired” notes below are
historical, not proof that every UI is complete. Gift recipient/core payer flow
is now wired (11 browser cases); multi-recipient batch remains tracked. #50
answer metadata is mapped, but wallet answer read/revise UI remains owed. Separate
required names/avatar refresh and age/coverage/Featured display corrections are
also tracked in `.scratch/handoff-wireup-2026-10-26/issues/`. Read the latest
INTEGRATION_STATUS entry before picking up this work. All 57 browser tests passed
under direct API config; older mocks need proxy compatibility (issue 05).

**Resolved 2026-10-16 (frontend-wiring sweep) — all wired:** #17 (`cbebirr` in the
payment enum; CBE Birr enabled), #8/#9 (auth serves `profile.full_name`; `GET`/`PATCH
/user`), #56 (signup OTP-upgrades the shadow phone), #47 (gift flow — `lib/gifts.ts`),
#58 (409 `meta.active_checkout` → `ConflictSheet` resumes the parked payment or
degrades honestly), #61 (`transfer_incoming` notification), #62 (wallet
`pending_transfer` → badge + action gate). `.scratch/gap-wiring-2026-10-16/` is closed
as of **2026-10-17** — #61's notification shipped 2026-10-16 but its **accept action**
was completed later (see below).

**Resolved 2026-10-16e (backend PR #37 pull) — all wired:** #49 (discovery
search/filter/sort + events-by-followable — `eventsModule.fetchAll(query)` + `?q=`),
#50 (wallet `registration_answers` + `GET /registrations/:id/answers`), #68
(`is_recurring` + date `series_id` → the recurring detail UI lights up), #69
(`covered_event_date_ids` → real per-day festival tiers), #70 (`next_event_date` /
`event_dates_preview` / `event_dates_url` + `GET /public/events/:slug/dates` — the
adapter absorbed the removal of the full `event_dates` array). New gap: #72.

**Closed 2026-10-16f — the rest of #49's server-side filters:** the discovery
category rail / price chips / sort now drive `GET /public/events` too
(`src/features/discovery/hooks/discoveryQuery.ts` → `eventsModule.fetchAll(query)`;
name→slug via `GET /categories`; price window carries the mandatory `currency`; a
contradictory combo renders an honest empty grid instead of an inverted 422 range).
`city` / `date_*` / followable ids remain unwired — no UI drives them (tracked, not
gaps).

**Resolved 2026-10-17 (age-restriction pull `0741c53b` → `8419aaaf`) — all wired:**
**#36** (public detail now serves `event_participants { id, artist_id,
event_date_id, name, type, description, display_order }` → `LineupSection` + the
festival per-day bill render it; the adapter was aligned to the real wire shape) and
the **`age_restriction`** half of **#53** (detail serves
`event_setting.config.age_restriction`; a new adapter helper `formatAgeRestriction`
maps it to the Age card). `seat_map` remains the only open half of #53.

**Withdrawn 2026-10-16:** **#60** — re-probed live and found to be a **false
positive** (Chapa V2 is minor-unit on both request and response; the request is
correct) → moved to `NOT_BACKEND_GAPS.md`; the same adapter's genuine 100× defect
(provider-fee response parsing) was filed as **#71**.

**Re-checked 2026-10-16d:** every other open gap was re-verified by **direct live
observation** (HTTP probes + route greps + code/DB reads) — **no additional
whole-gap false positives**. The one correction is **#53**, re-scoped to
`age_restriction` + `seat_map` (the other three listed fields are unconsumed →
`NOT_BACKEND_GAPS.md`). **#51 was also re-scoped and merged into #49** (venue stats
hydratable; gamification a product decision). See the 2026-10-16d note at the top of
`BACKEND_GAPS.md`.

Resolved (do NOT keep mocks against): #1b (detail-by-slug),
#2 (venue/organizer nested), #3 (product `price_options` + `available`),
#3-nuance (`requires_ticket`), #4 (resale display fields), #5 (`GET /tickets`
wallet), #6 (free orders fulfill), #7 (notifications — inbox live), #10 (signup
validation), #12 (auth throttle), #13 (`price_from_minor`), #14 (guest shadow
checkout — OTP, guest reg, quote/order/payment, claim-guest, public ticket
views), #15 (commercial terms seeded), #19 (registration schema), #21 (paid regs
confirmed), #22 (buyer release), #23 (repeat purchases after confirmation —
dev DB index synced), #24 (`resale_listings/mine`), #25 (wallet resale
policy), #27 (public RSVP — OTP + submit, live-proven), #28 (dev DB re-synced to
the edited `create_payments` migration), #18
(payment refresh wired on the Chapa return screen), #20 (audience gating wired —
gated-tier events gate the ticket selector behind server-validated access codes),
#30-crash (parking `FulfillOrderItem` keyword-arg crash fixed — now fully
resolved with seed-side parking accesses), #29 (wallet `add_ons` now projected from the ticket's
order — `DetailedTicket` "Your extras" renders on live wallet tickets), #31
(guest payment-refresh serves signed `ticket_view_token`/`url` — mapped +
copyable "Ticket link" on guest tickets), #30 (parking products seeded with
`parking` product_access + PARKING zone — 26/26 in dev), #32
(`price_from_minor` filtered to ticket products — discovery grid/filter/sort show
the true ticket "from" price), #16 (Chapa API V2 — `api.chapa.global`,
`CHAPA_TEST_`/`CHAPA_LIVE_` keys), #26 (seller payout destination create now
succeeds — Chapa V2 direct transfer; frontend rewired to the flat
`bank_slug`/`account_number`/`holder_name` payload), #54 (discovery availability —
`ticket_availability` + `event_lifecycle` on the list; the grid shows real SOLD OUT
badges), discovery **featured** (the paid Featured endpoint —
`GET /public/featured_events`; wired in `eventsModule.fetchAll`/`fetchFeatured`),
#17 (`cbebirr` in the payment enum — CBE Birr enabled), #8/#9 (auth serves
`profile.full_name`; `GET`/`PATCH /user` — `me`/`updateProfile` wired), #56 (signup
OTP-upgrades a shadow phone), #47 (gift purchase flow — `lib/gifts.ts`), #33, #34,
#39, #40, #41, #43, #45 (all 2026-09-30), #58/#61/#62 (2026-10-16 — backend
surfaces landed; **#61's `transfer_incoming` card accept action completed
2026-10-17**, see `e2e/transfer-accept.spec.ts`), #49/#50/#68/#69/#70
(2026-10-16e — backend PR #37 "wire the fixes" pull; frontend wired in the same run),
#36 (2026-10-17 — public **detail** serves `event_participants`; adapter aligned to
the real shape).

## Data integrity (seeds + e2e) — update after changing things

The dev seed chain (`digis_backend`: `db/seeds/base.rb` + `db/seeds/preview.rb`
+ `db/seeds_events.rb`, then the dev-only fixtures in `db/seeds/dev_demo.rb` —
loaded last, so the mock-mirror does not purge them) and the e2e fixtures are
**downstream of the backend contract**. After ANY backend sync or change, sweep
them before finishing:

1. **New surface needs data to be exercisable?** Add a seed fixture — `dev_demo.rb`
   is the home for one-off dev fixtures (seller payouts need a verified
   destination + a positive ledger balance; gated offers need an
   `AccessCode`/`Invitation` row; a multi-day festival / recurring series needs
   more than one `EventDate` / a `RecurrenceRule`).
2. **Removed/renamed a field the seeds still write?** Clean the seeds. (The dead
   `event_setting.config` `rsvp_*`/`event_type` keys were the example; the seeds no
   longer write them — cleaned 2026-10-15, see `DATA_INTEGRITY_AUDIT.md`.) **Seed
   omissions are fixed in the seed, never filed as backend gaps** — e.g. venue
   geo/media (`GET /venues/:id` served them all along; the seed was empty).
3. **Changed a slug/tier/account an e2e spec asserts?** Update the spec; prefer
   resolving data at runtime over hardcoding index-dependent pazimo slugs.
4. **Does the dev seed delete the very fixtures a drill/test needs?** Reconcile
   `TEST_EVENT_SLUGS`.

Full audit + prioritized fix list: `docs/handoffs/DATA_INTEGRITY_AUDIT.md`. The
dev seed is destructive (purges orders/tickets/registrations) and slug/behavior is
keyed to pazimo array indices — treat a re-scrape as a breaking change.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/` (local markdown convention).
See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles, label strings equal to their names
(`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`).
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root, ADRs in `docs/adr/`.
See `docs/agents/domain.md`.

### Skills workflow

How to get more out of the installed skills (flow, gaps, invocation rules):
`docs/agents/skills-workflow.md`.

### Autonomous skill use (operate without being asked)

Load and follow these skills **on your own** whenever the situation matches —
do not wait to be told:

- **code-review** — before committing a slice or finishing work, run the
  two-axis review (Standards + Spec). This is the single biggest win.
- **tdd** — build features/fixes test-first at the spec's agreed seam
  (red-green loop, integration-style tests, mock only at system boundaries).
- **codebase-design** — when designing/improving a module interface, choosing
  a seam, or judging depth.
- **domain-modeling** — when a term is fuzzy or a hard-to-reverse decision
  crystallizes (offer an ADR), and update `CONTEXT.md`/`docs/adr/` inline.
- **grilling** — stress-test a plan before building (agent finds facts, human
  makes decisions).
- **diagnosing-bugs** — on any bug report: tight red-capable feedback loop →
  reproduce → minimise → hypothesis → fix + regression test.
- **writing-for-agents** — any edit to AGENTS.md, skills, or agent-consumed docs.

When a feature needs the full chain (`/grill-with-docs → /to-spec → /to-tickets
→ /implement → /code-review`), run the model-invocable parts (grilling,
codebase-design, domain-modeling, tdd, code-review) yourself and follow the
slash-only skills' process, drafting `.scratch/` specs/tickets rather than
blocking on a human `/`-command. Flag explicitly when a step genuinely needs
the human's go-ahead.
