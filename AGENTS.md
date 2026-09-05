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
```

There is no lint or test script — `pnpm build` + `npx tsc --noEmit` are the checks.

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

- **#14** No guest checkout + no `verified_at` path → new users can't buy
- **#17** `cbe` payment method not in backend `PAYMENT_METHODS` (CBE option
  is currently disabled in the UI)
- **#18** No buyer-scoped `GET /orders/:id` (Chapa return uses wallet-poll)
- **#19** No public registration-schema endpoint (per-slot answers + version
  staleness can't be wired)
- **#1** `event_setting.config` is `{}` for the public list (featured/rating/
  tickets_left/seat_map fall back to mock)
- **#13** List lacks `price_from_minor` (grid prices mock-fed)
- **#7** No consumer notifications / payout-methods / consumer promo endpoints
  (deferred by product)
- **#8/9/10/12** No `name`/self-service update/signup validation/rate-limit

Resolved (do NOT keep mocks against): #1b (detail-by-slug), #2 (venue/organizer
nested), #3 (product `price_options` + `available`), #4 (resale display fields),
#5 (`GET /tickets` wallet), #6 (free orders fulfill), #15 (commercial terms
seeded).

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
