# Guest ticket → account claim (OTP) flow

- **Status:** built 2026-09-10 (lib + UI + tests); live OTP drill still needs a
  paid/sandbox guest checkout + an OTP code (same dev limitation as #29/#31)
- **Backend surface (ready):** `POST public/ticket_views/:token/request_otp`
  (purpose `guest_claim`, challenge) → `POST phone_verifications/:id/verify`
  (token) → `POST registrations/:id/claim_guest` (proof + password → auth
  tokens). `GuestPaymentTicketSerializer` serves the signed
  `ticket_view_token`/`ticket_view_url` + `registration_id` on guest
  payment-refresh tickets (#31 resolved).

## Built

- `registrationModule.claimOtpRequest(viewToken, phone)` → challenge.
- `registrationModule.claimGuest(registrationId, { phone, verificationToken,
  password, passwordConfirmation })` → `{ accessToken, refreshToken }`.
- `ClaimGuestSheet` (`src/features/tickets/components/ClaimGuestSheet.tsx`):
  guest device ticket → "Save to my account" → phone → OTP code → password +
  confirm → claim → signs the user in (`signIn`), then the account wallet
  refetches (`ticketKeys.userTickets`).
- `DetailedTicket` shows the "Save to my account" CTA only for guest tickets
  that carry `registrationId` + `ticketViewToken`.
- Error copy: `claim_already_completed`, `verification_invalid`,
  `password_invalid` (≥ 8 chars).
- Tests: 2 new (registration.test.ts) → 104/104, tsc clean, build ok.

## Notes

- Guest checkout on the dev free product currently 422s at order time
  (`purchase_limit_allocations_missing`) — the free RSVP product lacks
  purchase-limit allocations for the checkout path (RSVP path unaffected). The
  claim flow is exercised via the device-wallet tickets produced by a real paid
  guest checkout (sandbox/paid limitation).
- The signed "Ticket link" remains the zero-code cross-device access path.