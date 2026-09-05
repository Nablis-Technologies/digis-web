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
- **`docs/BACKEND_GAPS.md`** — confirmed backend gaps the frontend does not
  work around (ADR-0002).
- **`docs/handoffs/INTEGRATION_STATUS.md`** — living integration status.
