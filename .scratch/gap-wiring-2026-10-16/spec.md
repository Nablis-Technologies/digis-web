# Gap-wiring sweep — 2026-10-16

Backend re-verification (see `docs/BACKEND_GAPS.md`, the 2026-10-16 sweep log)
resolved **eight** items. Per the frontend-wiring rule in `AGENTS.md`, a backend
status change is not "done" until the frontend either consumes it or tracks it.

## Already consumed (no work owed)

- **#17** — `PaymentStep.tsx:25` enables CBE Birr and sends the canonical
  `cbebirr`.
- **#8 / #9** — `src/lib/auth.ts` maps `profile.full_name` and calls
  `GET /user` (`me`) / `PATCH /user` (`updateProfile`).
- **#56** — `src/lib/auth.ts` `requestSignupOtp` → `verifySignupOtp` → `signUp`
  (sends `verification_token`).
- **#47** — `src/lib/gifts.ts` + `GiftTicketDialog.tsx` + `ClaimGiftPage.tsx`
  consume `POST /public/gift_purchases/:id/resolve|claim` and the order-scoped
  gift list/resend.

## Owed (tracked tickets)

| # | Gap status change | Frontend obligation |
|---|---|---|
| 58 | the `active_checkout_exists` 409 now carries `meta.active_checkout` | `issues/01-active-checkout-resume.md` |
| 62 | the wallet ticket now serves `pending_transfer` | `issues/02-wallet-pending-transfer.md` |
| 61 | an in-app `transfer_incoming` notification now fires on initiation | `issues/03-transfer-incoming-accept.md` |

All three are frontend-only (the backend surfaces already exist). Nothing here is
blocked on the backend — they are `ready-for-agent`.
