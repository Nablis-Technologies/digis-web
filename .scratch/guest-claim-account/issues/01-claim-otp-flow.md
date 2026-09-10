# Guest ticket → account claim (OTP) flow

- **Status:** ready-for-human / follow-up (frontend feature, NOT a backend gap)
- **Created:** 2026-09-10
- **Backend surface (ready):** `POST public/ticket_views/:token/request_otp`
  feeds the shared phone-verification OTP flow; the guest payment-refresh
  response now carries a signed `ticket_view_token`/`ticket_view_url`
  (`GuestPaymentTicketSerializer`, #31 resolved) that can feed it.

## Why

A guest who bought on one device can already reopen their ticket on that device
(encrypted device wallet) or from any device via the copyable "Ticket link"
(`DetailedTicket`, maps `ticketViewUrl`). The remaining hole: linking that guest
ticket to a signed-in account so it lands in My Tickets (durable, cross-device,
survives clearing the device).

## What

On a guest/device ticket ("Tickets on this device"), add a "Save to my account"
path:
1. Offer it only when the ticket carries `ticketViewToken`/`ticketViewUrl`
   (guests only — authenticated wallet tickets never expose the view token).
2. Phone (prefilled if the guest gave one) → `POST
   public/ticket_views/:token/request_otp` (token = `ticketViewToken`).
3. OTP code → verify via `POST phone_verifications/:challenge_id/verify`
   (`registrationModule.verifyPhoneOtp` exists).
4. Result: user signs in / links the identity; ticket appears in the account
   wallet (`GET /tickets`).

## Blocks / notes

- Reuses the existing phone-OTP primitives (transfer + RSVP flows).
- Backend `request_otp` requires a valid `view_token` — confirm the exact
  response/verification contract by live probe before building.
- The signed ticket link remains the zero-code access path in the meantime.