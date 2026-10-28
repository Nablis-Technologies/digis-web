# Digis (frontend)

Consumer event-ticketing frontend for the Digis platform (Ethiopia market).
Vite + React + TypeScript app consuming the Rails API in `../digis_backend`
(`http://localhost:3000`).

## Quick start

```bash
pnpm install
pnpm dev            # Vite dev server on :5173
pnpm build          # production build (vite)
npx tsc --noEmit    # typecheck
npx vitest run      # unit tests
npx playwright test # e2e (needs the backend up + seeded)
```

## Documentation

- **`AGENTS.md`** — project rules for AI sessions (integration status, backend
  contract, money rule, backend gaps). Start here.
- **`CONTEXT.md`** — domain glossary (the canonical terms).
- **`docs/adr/`** — architecture decision records.
- **`docs/BACKEND_GAPS.md`** — confirmed **backend** gaps the frontend does not
  work around (ADR-0002). Backend defects only — the backend dev's worklist.
- **`docs/NOT_BACKEND_GAPS.md`** — reclassified (frontend-fixable), setup,
  superseded, informational, and deferred items, kept so they are never re-filed
  as backend gaps.
- **`docs/handoffs/INTEGRATION_STATUS.md`** — living integration status.

## What the tests prove

- `pnpm test`: adapter/service and other unit behavior.
- `pnpm test:frontend`: deterministic Chromium tests at the browser/API boundary.
  Covers exact payment confirmation, slow/reloaded returns, active QR decoding,
  account isolation, gift claims, answer corrections, profiles and event variants.
  API responses are controlled: passing does not prove provider or webhook health.
- `pnpm test:browser`: regression suite including real seeded Rails integration.
- `pnpm test:acceptance`: a real **Chapa sandbox** payment through the UI, exact
  payment/order confirmation, decoded entry QR and ticket persistence after reload.
  Rails, queues, configured provider test keys, and the payment tunnels must work.
  Errors, missing infrastructure, checkout conflicts and absent tickets fail it.
- `pnpm test:release`: typecheck, unit tests, build, browser regressions and real
  sandbox acceptance. A green unit/browser mock run alone is not release approval.

Acceptance defaults to the seeded `+251900123456` buyer, `on-on` event and `Regular`
tier. Override `ACCEPTANCE_BUYER_PHONE`, `ACCEPTANCE_BUYER_PASSWORD`,
`ACCEPTANCE_EVENT_SLUG` and `ACCEPTANCE_TICKET_TIER` for a clean eligible test buyer.
Use `ACCEPTANCE_BASE_URL` for the configured frontend/tunnel origin. The provider
must expose its `/test/` route and test-only payment control before the test pays.
Never use live-money keys. Traces, screenshots and video are disabled for this
credential-bearing gate. These are local commands; no CI workflow is implied.
