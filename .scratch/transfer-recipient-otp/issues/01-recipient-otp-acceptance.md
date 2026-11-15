# Recipient ticket-transfer OTP acceptance (wire to live backend)

Type: task
Status: resolved
Created: 2026-09-09

## Context

Backend `feat/launch-hardening-telemetry` (fast-forward `d67e132` on 2026-09-09)
now ships a complete public ticket-transfer recipient flow. The frontend's
`transferService` (`src/lib/transfer.ts`) is still a 100% localStorage mock
(`/claim/:token`, demo `DEMO_TRANSFER_TOKEN`, local `transfers` map) — it never
touches these endpoints.

## Live endpoints (verified against `config/routes.rb` 2026-09-09)

- `GET /public/ticket_transfers/:id?token=` — recipient-safe landing
  (`PublicTicketTransferSerializer`: masked recipient phone, event, ticket
  product, `expires_at`; 404 `invalid_transfer` for wrong/expired token).
  Idempotency-Key NOT required.
- `POST /public/ticket_transfers/:id/request_otp` — `{ phone }` (+
  `Idempotency-Key`) → `{ challenge_id, status, expires_at }`; OTP purpose is
  `ticket_transfer`.
- `POST /public/ticket_transfers/:id/accept_guest` — `{ token, phone,
  verification_token, password?, password_confirmation? }` (+ `Idempotency-Key`)
  → `{ transfer, ticket, ticket_view_url, user?, access_token?,
  refresh_token? }`. Accepts into the recipient's own wallet (or a shadow
  identity when no password); returns a signed public view link.

Supporting facts: `TicketTransfer` now stores `token_ciphertext` (dev DB
column added 2026-09-09); `Core::PhoneVerification::Verify` proof tokens carry a
`purpose` field; `Links::BrandedUrl`/`TargetResolver` accept `ticket_transfer`
targets; the `links_short_links_target_type_check` constraint allows
`ticket_transfer`.

## What to build

1. A recipient landing surface (replace the localStorage `/claim/:token` page):
   fetch the transfer by `:id?token=`, show event/ticket context (masked phone),
   an OTP request step (phone → `request_otp`), and an accept step
   (`accept_guest` with the returned `verification_token`), honoring the same
   OTP challenge flow the guest claim uses (reuse `phone_verifications/:id/verify`
   semantics if exposed, or the returned challenge_id flow).
2. After accept: route the returned `ticket` + `ticket_view_url` into the
   recipient's wallet / device-ticket experience (signed-in → `GET /tickets`; a
   shadow accept → the encrypted device wallet or the public view link).
3. Wire the SENDER side minimally: `transferService.sendTransfer` should stop
   fabricating tokens once a real transfer-create path exists (check whether the
   backend has a buyer transfer-initiate endpoint — `Transfers::Initiate` exists
   in code; confirm its route/controller before building).

## Constraints

- Frontend-only. Backend gaps → `docs/BACKEND_GAPS.md`.
- Follow the money/behavior rule: mirror the backend serializer shapes exactly.
- Add tests at the module seam (`transfer.ts`) per the repo's Vitest convention;
   keep the mock fallback only where the backend surface is genuinely absent.

## Acceptance

- A recipient can land, request an OTP, verify, and claim a pending transfer
  end-to-end against the live backend.
- `transferService` no longer invents QR codes/tokens for live transfers.
- tsc clean, `pnpm build` ok, unit tests green.

## Answer

Wired live 2026-09-09, verified end-to-end against the running backend.

- `src/lib/transfer.ts` rewritten as the live deep module (localStorage mock
  removed): `initiate` (POST `/tickets/:ticket_id/transfers` — note the nested
  route, not `/transfers`), `fetchPublic` (GET `/public/ticket_transfers/:id?token=`
  + cover enrichment), `requestOtp` (body `{ phone, token }`), `verifyOtp`
  (POST `/phone_verifications/:challenge_id/verify`), `accept` (POST
  `/public/ticket_transfers/:id/accept_guest` → maps the returned
  `PublicTicketViewSerializer` ticket via `mapWalletTicket`, incl. the rotated
  QR). `buildClaimLink` → `/claim/:id?token=<secret>`.
- `ClaimTicketPage` rebuilt: `/claim/:id?token=` → fetch → phone (masked hint) →
  OTP → accept → `DetailedTicket` with the claimed ticket + signed
  `ticket_view_url`. Invalid/expired/already-accepted states handled.
- `TransferTicketDialog`: phone-only (backend binds by phone), and a failed
  send now shows the typed error instead of fake success.
- Sender `onTransfer` in `TicketsPage` calls `initiate` and shares the real
  claim link. Demo transfer seed removed from notifications.
- Unit tests: `src/lib/transfer.test.ts` (8) — 90/90 total, tsc clean, build ok.

Live proof (Chapa Test Event ticket, attendee `+251911000003` → `+251900000000`):
initiate 201 → landing 200 → request_otp 201 → verify 200 (`verification_token`
with `purpose: ticket_transfer`) → accept_guest 200 (transfer `accepted`,
credential generation rotated v1→v2, new signed QR, `ticket_view_url` serves
the public view 200).

Sweep note: the frontend still does not consume the SENDER-side account paths
(`POST /ticket_transfers/:id/accept|decline|cancel` for an authenticated
recipient) nor an explicit "decline/cancel" UX — cancel/decline surface for a
recipient with an account can be a follow-up; password-set on accept (shadow →
account) is supported by `accept_guest` (password + password_confirmation) but
not yet offered in the UI.

## Comments

(open)