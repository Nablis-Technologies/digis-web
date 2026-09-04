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

Full detail (what's missing + why + proposed solution) in **`docs/BACKEND_GAPS.md`**.
Summary:

- No user-tickets list endpoint (`GET /tickets` does not exist) → My Tickets is mock/deferred
- No consumer notifications / payout-methods / promo endpoints
- Public products endpoint lacks `price`, `available`, `requires_ticket`
- Public event lacks `venue {name,city}` and organizer name
- Public events list serializer is minimal (being expanded by backend dev)
- Resale listing serializer returns no display fields (event/ticket/seller)
- Free orders (`total_minor == 0`) never issue tickets (backend correctness)
- Auth has no OTP / Google / check-account / password-reset

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/` (local markdown convention).
See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root, ADRs in `docs/adr/`.
See `docs/agents/domain.md`.
