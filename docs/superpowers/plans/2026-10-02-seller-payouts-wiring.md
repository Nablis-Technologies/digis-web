# Seller payouts wiring — plan (2026-10-02)

Status: **IMPLEMENTED** 2026-10-02 (T0–T5; mocked e2e green + live drill B passed).
Owner: frontend.

## Context

The backend advanced `ed6309a → f679e56` (10 commits). The whole range is the
**seller payout lifecycle**: it adds a seller-initiated **withdrawal** endpoint
and deletes the jobs that used to build/mature payouts automatically
(`Marketplace::BuildSellerPayoutJob`, `MatureSellerProceedsJob`). Plus telemetry
descriptions and the Postman collection. **No DB migration** (only `config/routes.rb`
changed under `config/`/`db/`), so no local DB rebuild is needed.

Before this, a seller could see balance + ledger (already wired) but there was no
way to actually **request a payout**. Now there is.

## Backend contract (verified at `f679e56`)

All auth'd, seller-scoped. Mutations need `Idempotency-Key`.

| Method | Path | Body / params | Result |
|---|---|---|---|
| POST | `/marketplace/seller/payouts` | `{ payout: { currency, amount_minor?, seller_payout_account_id? } }` | 201 `SellerPayout` |
| GET | `/marketplace/seller/payouts` | `?order_by=&order_direction=&page=&per_page=` | 200 list (`Core::Pagination`) |
| GET | `/marketplace/seller/payouts/:id` | — | 200 `SellerPayout` |

`SellerPayoutSerializer` fields:
`id, seller_user_id, seller_payout_account_id, provider, amount_minor, currency,
status, requested_at, processed_at, created_at, updated_at`.

- **`amount_minor` omitted** → withdraws the seller's **full available balance**
  for the currency (the `Request` service builds the payout from the balance).
- **`seller_payout_account_id` omitted** → uses the seller's **default verified**
  destination.
- Statuses: `pending → processing → succeeded | failed | cancelled`.
- Errors: `seller_payout_amount_invalid`, `seller_payout_currency_invalid`,
  `seller_payout_seller_ineligible`, `seller_payout_source_not_found`,
  `seller_payout_account_required` (no verified destination),
  `seller_payout_balance_not_positive`, `seller_payout_replay_missing`,
  `missing_idempotency_key`, `idempotency_conflict`.
- **Idempotency semantics:** the op is keyed on
  `(Idempotency-Key, operation=withdraw, account_id, currency, amount_minor)`.
  A retry with the same key + same intent returns the **same payout** (201). A
  retry with the same key but a **changed** amount/account/currency returns
  `409 idempotency_conflict`.

Existing, already wired: `GET /marketplace/seller/balance`,
`GET /marketplace/seller/history`, `GET|POST /marketplace/seller/payout_accounts`
(+ `/destinations`, `/:id/set_default`).

## Frontend current state

- Wired: balance + ledger (`src/lib/seller-reports.ts`, `ResalePage` earnings
  card), payout destinations (`src/lib/payout.ts`, `PayoutMethodsSheet`).
- Missing: no payouts client, no withdraw action, no payout-status display.

## Workstreams (tickets)

### T0 — Sync backend + confirm the surface
- `git fetch` → merge/rebase `feat/launch-hardening-telemetry` to `f679e56`,
  retaining the local `chore(dev)` setup commit. No DB migration expected; confirm
  `git diff origin -- db/` is empty.
- Restart the `web` container; confirm the three routes exist (`rails routes | rg seller/payouts`).
- Note for local testing: the create → dispatch is **async via the outbox**
  (`marketplace.seller_payout.requested` → `Marketplace::DispatchSellerPayoutJob`),
  so dev needs the outbox worker running (SolidQueue-in-Puma already configured)
  to move `pending → processing → succeeded`.

### T1 — API client + types
- New `src/types/seller-payouts.ts`: `SellerPayout` (`id`, accountId, provider,
  amountMinor, currency, status union, requestedAt, processedAt?, createdAt) +
  `SellerPayoutStatus`.
- New `src/lib/seller-payouts.ts`:
  - `fetchPayouts()` → `GET marketplace/seller/payouts`
  - `fetchPayout(id)` → `GET marketplace/seller/payouts/:id`
  - `requestPayout({ currency, amountMinor?, sellerPayoutAccountId? })` →
    `POST marketplace/seller/payouts` with body `{ payout: {…} }`; pass a stable
    `Idempotency-Key` (generated once per user-intent submit, reused on retry —
    same pattern as `admission.ts`/`order.ts`).
  - Mapper `mapSellerPayout` (snake → camel). Money stays integer minor.
  - React Query keys (`sellerPayoutKeys.get/list`).
- Unit tests `seller-payouts.test.ts` (fetch list/show; POST body + header;
  mapper; conflict surfaces as `ApiError`).

### T2 — Error copy
- Add to `CODE_MESSAGES` (`src/lib/errors.ts`):
  `seller_payout_account_required`, `seller_payout_currency_invalid`,
  `seller_payout_amount_invalid`, `seller_payout_seller_ineligible`,
  `seller_payout_source_not_found`, `seller_payout_balance_not_positive`,
  `seller_payout_replay_missing`.
- Remove/flag now-dead codes if present (`seller_payout_not_matured`,
  `seller_payout_event_scope_invalid` — the backend deleted both locale keys).
- Extend `errors.test.ts`.

### T3 — Dedicated "Payouts" page (separate surface; matches the app standard)
Decision: **separate page**, not inline in `ResalePage`.

- New route `/payouts`, wired the app's standard way (`src/app/router.tsx`):
  - add `'payouts'` to `AppView`; `VIEW_PATHS.payouts = '/payouts'`;
  - `pathToView`: `if (pathname === '/payouts') return 'payouts'`;
  - add `{ path: '/payouts', Component: AppContent }`;
  - render `<PayoutsView onBack={…} onRequestAuth={…} />` in the `AppContent`
    switch (same shape as `SettingsView`, `router.tsx:575-579`), and add
    `'Payouts'` to the TopBar title map (`router.tsx:146-149`).
- New feature `src/features/payouts/`:
  - `pages/PayoutsPage.tsx` — a normal page matching the current standard
    (page container, glass cards, `isDark`, `GlassReflection`, `AppButton`,
    `LoadErrorCard`, `onBack`) like `SettingsPage`/`ResalePage`.
  - `components/WithdrawPayoutSheet.tsx` — the cash-out flow.
  - `components/PayoutRow.tsx` — one payout row (amount, status chip, dates).
- Page contents (top → bottom): available balance (per currency) + "on hold";
  a primary **Cash out** action; the **payout history** list.
- **Amount** (decision: whatever the backend allows): a Money-formatted amount
  field, `> 0` and `≤ available`, defaulting to the **full available balance**,
  with a **Withdraw all** affordance; integer `amount_minor`.
- **Destination**: default verified account; if none, disable submit and link
  into the existing `PayoutMethodsSheet` with an honest empty state.
- Submit → `requestPayout` → on 201 invalidate `sellerPayoutKeys`, balance, and
  history; show the new payout as **pending** (never "paid out"); map errors via
  `mapApiError`; disable while pending.
- **History** (best practice for a dedicated page): inline, newest first, status
  chip (`pending`/`processing`/`succeeded`/`failed`/`cancelled`),
  `requested_at`/`processed_at`, paginated ("Load more"). Honest `isError` retry;
  never a false empty state.
- Entry point: a **"Cash out"** link on the `ResalePage` earnings card
  (`ResalePage.tsx` ~L918-945) navigating to `/payouts`; optionally a row in
  `UserProfile`/`Settings`.
- Optional refactor: move `PayoutMethodsSheet` from `features/resale/` next to
  the new page so the payout domain has one home.

### T4 — Verification
- `npx tsc --noEmit` · `npx vitest run` · `pnpm build`.
- Unit tests (`seller-payouts.test.ts`, `errors.test.ts`).
- New e2e `e2e/seller-payouts.spec.ts` (**wire mocked**): withdraw with default
  account → 201 → balance refreshes + row shows `pending`; no-destination →
  honest empty state; conflict surfaces.
- **Live drill** — see below. Recommended level: **B**.

## The live drill (explained)

A **drill** is a manual end-to-end run against the **real** stack (real backend,
real DB, real provider) driving the real UI/API — the opposite of the e2e above,
which mocks the network and so only proves the frontend wiring. This project
already has these: `e2e/zz-live-guest-otp.spec.ts` reads a real OTP out of
`digis_backend/log/development.log`; `e2e/zz-live-audience-gate.spec.ts` drives
real gating.

For seller payouts, the full chain is:
`POST /marketplace/seller/payouts` → row `pending` → outbox event
`marketplace.seller_payout.requested` → `DispatchSellerPayoutJob` → Chapa payout
API (test) → `processing` → `succeeded` (or `failed`). A real run needs:
1. a seller with **`available_minor > 0`** — i.e. a **completed resale whose
   proceeds matured** (the seed does not guarantee one; it must be created),
2. a **verified payout destination**,
3. the **outbox worker** running (SolidQueue-in-Puma) to dispatch,
4. and, to reach `succeeded`, Chapa's payout test API to settle (can be
   flaky/queued in test).

Three levels:
- **A — mocked e2e only** (fast): proves the UI states/transitions, not the real
  contract.
- **B — live API drill** (medium, recommended): from the real UI, do a real
  `POST`; assert `201`, `status=pending`, the balance drops by the amount, and
  the row appears in the list. Stop before Chapa settlement. This proves the
  frontend ↔ real-backend contract, which is the part we own.
- **C — full live drill** (heavy): B plus drain the outbox and let
  `DispatchSellerPayoutJob` hit Chapa test until `succeeded`. Proves the whole
  money-move chain, but the backend's own
  `test/integration/marketplace/seller_payouts_test.rb` already covers the
  service logic and the dispatch enqueue. Only worth it if we want a live
  end-to-end money proof.

Recommended: **B**, with the unit + mocked-e2e tests as the routine gate. Do
**C** only on request.

## Decisions (settled)
1. **Entry point** — a **separate `/payouts` page** (not inline in `ResalePage`),
   matching the app's page standard. Reached from the Resale earnings card.
2. **Amount** — allow **anything the backend allows**: partial or full
   (`amount_minor` `> 0`, `≤ available`, default = full balance).
3. **History** — **inline list** on the dedicated page (best practice for a
   dedicated surface), paginated, with status chips.
4. **Live drill** — level **B** (live API), full chain (C) only on request.

### T5 — Docs
- Update `docs/handoffs/INTEGRATION_STATUS.md` with the new surface + wiring.
- No BACKEND_GAPS entry: this is a new capability, not a gap. (Gap sweep note:
  the `ed6309a..f679e56` diff touches no serializer/route any open gap depends
  on, so **no gap status changes**.)

## Risks
- Async dispatch: `pending` is the honest state right after create; the UI must
  not imply "paid out" until `succeeded`. Dev needs the outbox worker running.
- Idempotency: a fresh key per intent; never reuse a key across a changed amount.
- A seller with no **verified** destination gets `seller_payout_account_required`
  — route them to add/verify a destination (`PayoutMethodsSheet`) rather than a
  dead error.
