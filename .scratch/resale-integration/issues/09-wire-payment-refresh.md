# 09 — Wire the Chapa return screen to `POST /payments/:payment_id/refresh`

Status: open (frontend wiring follow-up — backend surface landed 2026-09-08)

Blocked by: none (backend done; gap #18 partial fix is live)

## Scope

The backend now has a buyer-scoped reconciliation endpoint
(`POST /payments/:payment_id/refresh` → payment + order + wallet + `state`
where `state` is `ready`/`pending`/`terminal`). The Chapa return screen
(`src/lib/payment-return.ts`, `usePaymentReturnConfirmation`) still blind-polls
`GET /tickets` every 3s. Wire it: on return-mount, call refresh once, then
wallet-poll only while `state` is `pending`.

This ticket is the tracked follow-up for the miss flagged 2026-09-08: the
five *resolved* gaps (#24/#25/#7/#22/#19) were wired but the one *partial* fix
(#18) was skipped. The AGENTS.md "frontend-wiring sweep" rule now forces this
sweep on every backend-status-change run.

## Acceptance

- Return screen calls `POST /payments/:payment_id/refresh` on mount with an
  `Idempotency-Key` header; `ready` → success state, `terminal` → failed state,
  `pending` → existing wallet-poll fallback continues.
- The `payment_id` is available at return time. Today the frontend persists
  only `checkout_url` (`digis:payment-url:<orderId>`) at redirect; the payment
  attempt response already carries `payment.id`, so the redirect site must also
  persist the payment id (or resolve it from the order) and the return screen
  must read it.
- No backend changes; no new polling mechanism beyond the existing wallet poll.
- Unit test for the refresh call + state mapping; e2e checkout chain stays green.

## Comments

- Backend route: `config/routes.rb:173`; controller `orders/payment_refresh#create`
  (buyer-scoped, requires `Idempotency-Key`, Cache-Control no-store); service
  `Orders::PaymentRefresh` (2s verification throttle, `state_for` → ready/terminal/pending).
- Policy: `refresh? = buyer? && record.event_payment?`.