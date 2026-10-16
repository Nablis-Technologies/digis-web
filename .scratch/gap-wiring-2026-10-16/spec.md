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

| # | Gap status change | Frontend obligation | Status |
|---|---|---|---|
| 58 | the `active_checkout_exists` 409 now carries `meta.active_checkout` | `issues/01-active-checkout-resume.md` | **DONE 2026-10-16e** (`cc856ae`) |
| 62 | the wallet ticket now serves `pending_transfer` | `issues/02-wallet-pending-transfer.md` | **DONE 2026-10-16e** (`6fabb41`) |
| 61 | an in-app `transfer_incoming` notification now fires on initiation | `issues/03-transfer-incoming-accept.md` | still owed (see below) |

## 2026-10-16e — the PR #37 "wire the fixes" pull

The 10-commit backend pull resolved **#49, #50, #68, #69, #70** (see the
`BACKEND_GAPS.md` 2026-10-16e sweep log). All five were **wired in the same run**
(commits `2dfcd8e`, `e8601b1`, `6fabb41`). #58/#62 from the table above were also
wired in that run.

### Still tracked after the pull

| # | Obligation | Ticket |
|---|---|---|
| 61 | accept an incoming transfer from the `transfer_incoming` notification in-app (no incoming-transfers list endpoint; the authenticated `POST /ticket_transfers/:id/accept` exists and `lib/transfer.ts` has `transferFromNotification`/`acceptAuthenticated`) | `issues/03-transfer-incoming-accept.md` |
| #49 (filters) | consume the **remaining** server-side `GET /public/events` params in discovery — `category`/`city`/`date_from`/`date_to`/`min_price_minor`/`max_price_minor`/`organization_id`/`venue_id`/`artist_id` + server `sort` | `issues/04-server-side-discovery-filters.md` — **DONE 2026-10-16f** (`category`/price/`sort` wired; `city`/`date_*`/followable ids have no UI yet) |

Both are frontend-only (the backend surfaces already exist; the params are
live-verified) — they are `ready-for-agent`, not blocked on the backend.
