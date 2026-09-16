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
npx vitest run    # unit tests (107)
npx playwright test  # e2e vs the live backend on :3000 (17)
```

Checks are `npx tsc --noEmit` + `npx vitest run` + `pnpm build` (+
`npx playwright test` for the full stack). There is no lint script.

## Integration status (IMPORTANT)

The frontend is being wired from 100% mock data to the real Rails backend.
**The user is the FRONTEND developer — do NOT change the backend schema.**
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

## Backend gaps (do NOT build against these — flag to backend dev)

Single source of truth: **`docs/BACKEND_GAPS.md`** (reorganized
2026-09-04: blocking → degrading → informational → deferred → resolved
archive). Open items that matter for new work:

**A backend gap is a deficiency in the backend's code/API/contract** that the
backend dev must fix (missing field/endpoint, wrong status or rule,
serializer/policy gap). **Setup is NOT a gap** — seeds, dev env config
(`config.hosts`, `config/recurring.yml` dev jobs), provider/dashboard webhook
registration, API keys, webhook secret hashes, env vars, tunnels, deploys. Never
file a setup chore as a gap.

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

- **#17** `cbe` payment method not in backend `PAYMENT_METHODS` (CBE option
  is currently disabled in the UI; `cbebirr` is now a Chapa V2 adapter
  capability but the domain enum is still `telebirr card bank`)
- **#40** Abandoned checkouts never expire (`ExpireCheckout` aborts the whole
  sweep on an elapsed-grace `processing` payment) → `active_checkout_exists`
  blocks all later checkouts; the 409 carries no order id
- **#39** No public endpoint listing payout `bank_slug`s — the frontend
  hardcodes `telebirr`/`cbe`/`boa` (`src/lib/payout.ts`)
- **#41** A released order permanently burns its registration
  (`idx_one_order_item_per_registration` ignores order status) → retries need a
  brand-new registration
- **#33** Guest payment-refresh re-validates the quote token even for accepted
  payments (a guest can be told "payment failed" after paying; frontend now
  correlates creds per payment + stops on terminal errors — see BACKEND_GAPS.md)
- **#34** Past events remain purchasable — quote/order never checks the event
  date (`EventDate` ends_at/status) or the product `sales_end_at` window; the
  frontend disables buying on ended events (eventEnded) until the backend
  enforces it
- **#8/9** No `name` on user / no self-service profile update

Resolved (do NOT keep mocks against): #1 (config whitelist), #1b (detail-by-slug),
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
`bank_slug`/`account_number`/`holder_name` payload).

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
