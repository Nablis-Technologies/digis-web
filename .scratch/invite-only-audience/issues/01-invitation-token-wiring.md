# Invitation-token audience wiring (invite-only tiers)

- **Status:** frontend BUILT 2026-10-01; **reclassified 2026-10-02 — NOT a backend code gap.** The app owns the link; the backend already accepts `invitation_token`. Only the dev `invitation_delivery_sender` is unset (environment setup).
- **Blocked by:** nothing backend-code; only a dev sender (setup) to exercise the flow end-to-end.
- **Related:** `docs/BACKEND_GAPS.md` #20 (audience gating), #44 (event-level config inert; the real gates are per-offer)

## Built (2026-10-01)

- `EventDetailPage` reads `?invitation=` / `?invitation_token=` via `useSearchParams`
  and passes the token to the gate.
- `GatedTierGate`: auto-tries a URL token on mount (`proveInvitation`), and one
  pasted value is tried as an **access code then an invitation token**
  (`audienceModule.resolveProof`). On success it returns the typed proof.
- The proof (`{ accessCode? }` or `{ invitationToken? }`) is carried into
  `admission_selections` (`audience_proof`) and the offer waitlist.
- **Mixed audience**: only the non-public tiers are gated; public tiers stay
  selectable while locked (`visibleTicketTypes`), with the unlock panel below.
- Verified live: `origins-2?invitation=<token>` auto-unlocks; `psy-addis-saltland`
  unlocks with `DRILL-CODE`; a wrong code stays locked. Unit tests for
  `resolveProof` / `proveInvitation`.
- Still frontend-unverifiable end-to-end only for lack of a **dev sender** to
  deliver the link; a real buyer receiving the token is a delivery/config concern.
  The app accepts `?invitation=<token>` (and `?invitation_token=`).

## Problem

Access-code audiences are fully wired: `GatedTierGate` → `POST /ticketing/audience_authorizations`
→ `audience_proof.access_code` into `admission_selections`. `audience = invitation` is **not**:

- Nothing ever sets `invitationToken` — there is no URL/param source.
- `GatedTierGate` has one input and always sends `access_code` (`GatedTierGate.tsx`).
- `EventDetailPage` passes `accessCode` only.
- The `invitationToken` props on `Checkout` / `useCheckoutFlow` / `admission.ts` / `waitlist.ts`
  are therefore unreachable.

So an invitation-only tier can never be unlocked. The backend requires an `invitation_token`
(`Ticketing::Audience::Authorize#authorize_invitation`), mapped from `invitation_token` by
`Ticketing::AudienceAuthorizationsController` and `Orders::AdmissionSelectionEnvelope`.

## Backend facts (verified `digis_backend` @ 326f6a3)

- `Ticketing::Invitations::Create` returns a one-time **link token**; delivery goes through a
  configurable `config.x.invitation_delivery_sender` (`Ticketing::DeliverInvitationJob`).
- That sender is **not set in dev**, and **no URL/param format** is defined for the app to read
  the token from.
- `audience ∈ {public, access_code, invitation, code_or_invitation}`.
- `code_or_invitation` accepts either — but one free-text input cannot know whether the pasted
  value is a code or a token, so the wire must carry both fields (it can) or the source must say.

## Plan (frontend)

1. Define the deep-link contract: the app reads the invitation token from a URL param on
   `/events/:slug` (e.g. `?invitation=<token>`), stores it, and passes it as `invitationToken`.
2. `GatedTierGate`: take an invitation token (from the URL) and send `invitation_token` in
   `authorizeAny`; keep the text input for access codes.
3. Thread the token into `admission_selections` — already supported via
   `audience_proof.invitation_token`; only the source is missing.
4. Mixed audience (design): gate **only** the non-public tiers and leave public tiers selectable.
   The backend gates per ticket type; today the **whole** selector is hidden when any tier is gated.

## Blocked on (dev setup only — NOT a backend gap)

- ~~The invitation **link format** the app must parse (URL + param name).~~
  **Settled 2026-10-02:** the app owns it — `/events/:slug?invitation=<token>`
  (also accepts `?invitation_token=`); the backend already accepts
  `invitation_token` as `audience_proof` (`PUBLIC_PROOF_FIELDS`). Nothing for the
  backend to define.
- A dev `invitation_delivery_sender` (e.g. log the composed link) so the flow can
  be exercised end-to-end. Environment setup, not a code gap.

## Comments

- 2026-10-01: opened after the RSVP / invite-only audit. The gated-waitlist audience-proof bug
  (proof omitted from `WaitlistSheet`) was fixed in the same pass.
