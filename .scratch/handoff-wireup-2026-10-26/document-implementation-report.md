# Attached-document implementation report — 2026-10-26

> Update 2026-11-01: the consumer age/coverage/Featured work and legacy profile
> completion prompt described below are now implemented and browser-tested.
> Save to my account code/password consistency and recovery are also complete.
> Current evidence and limitations are in `docs/handoffs/INTEGRATION_STATUS.md`
> and `.scratch/remaining-handoff-2026-11-01/spec.md`. This historical audit is
> retained below; it does not describe the latest completion state. Broader
> city/date/entity filters remain outside this completed slice, and live gift
> acceptance remains blocked by backend #76.

Overall: **not complete**. Rechecked the five original Markdown files against
the current working tree. This is an implementation audit, not a fresh end-to-end
certification. Existing uncommitted work is included. No product code changed by
this report. Organizer/admin surfaces are outside this consumer app's scope.

## 1. Event Age Restriction.md — partial

Implemented: public detail reads `event_setting.config.age_restriction` and
formats minimum-only, maximum-only and bounded restrictions. Age remains
informational: no invented checkout or scanner enforcement.

Remaining frontend work: the adapter collapses omitted age configuration and
explicit `has_restriction:false` into the same absent display value. Both event
info layouts then show `Any Age`. An unconfigured event therefore makes an
unsupported all-ages claim. Preserve the distinction and render unknown/absent
metadata honestly. Tracked in issue 04.

Organizer create/edit nesting, validation and prefill belong to the organizer
portal; not implemented or certified in this consumer app.

Evidence: `src/lib/events-adapter.ts` formatAgeRestriction;
`src/features/event-detail/pages/EventDetailPage.tsx`;
`src/features/event-detail/components/EventInfoRail.tsx`.

## 2. Fixes.md — partial

Implemented:

- Detail/list adapters consume schedule preview/next occurrence and recurrence
  metadata; full schedule has its dedicated paginated endpoint.
- Discovery sends supported search/category/price/sort controls to the server,
  including ETB currency on price operations. Service query types also support
  city/date/followable IDs.
- Product covered-date IDs are mapped when nonempty.
- Wallet maps the original respondent's answer URL/deadline metadata.
- Money is represented in minor units and formatted through Money helpers.

Remaining frontend work:

- Explicit empty `covered_event_date_ids: []` is dropped by products mapping.
  Festival classification still uses pass/full/weekend name guesses when it
  cannot find nonempty coverage. This loses the documented all-event meaning.
- Wallet has no reachable effective-answer read/revision flow. The service
  metadata and unused callback slot are not that feature. Issue 02 is pending;
  browser/API boundary approved and draft red test saved outside active e2e.
- Given Name / Father's Name labels and required separate signup fields are
  unfinished (see document 4).
- City/date/entity filters exist at service level but are not fully exposed by
  discovery controls; do not count service parameters as completed UI.

Evidence: `src/lib/products.ts`, `src/lib/festival.ts`, `src/lib/events.ts`,
`src/features/discovery/hooks/discoveryQuery.ts`, `src/lib/tickets.ts`,
`src/features/tickets/pages/TicketsPage.tsx` and `DetailedTicket.tsx`.

## 3. Paid Featured Event Placements.md — consumer side partial

Implemented: real `GET /public/featured_events` data feeds the featured display;
paid-placement membership is mapped onto events; featured resolution failure
collapses the optional section while preserving the ordinary catalog.

Remaining frontend work: explicit `Featured` / `Promoted` badge on the cards.
The existing Headliners presentation is not the document's paid-placement badge.
The optional `featured=true` catalog toggle/query wiring is also absent. Issue 04.

Organizer eligibility, offers, quote, purchase, campaign tracking and cancellation/
refund screens are **out of scope for this consumer repository**, not implemented
here and not audited as complete.

Evidence: `src/lib/events.ts`, `src/lib/events-adapter.ts`,
`src/features/discovery/components/FeaturedMagazine.tsx`, `FeaturedEventCard.tsx`,
`FeaturedCarousel.tsx`, and `src/components/EventCard.tsx`.

## 4. User Profile & Self-Service Management (G-14 & G-47).md — partial

Implemented: current-user request uses GET /user; name updates use PATCH /user;
avatar upload/removal use their dedicated endpoints. Private image rendering
uses authenticated binary fetch, blob URL, ETag/304 handling and initials fallback.
The central client supplies authentication/idempotency headers.

Remaining frontend work:

- Signup still uses one name input and splits it into first/last.
- Separate required Given Name / ስም and Father's Name / የአባት ስም fields,
  per-name 100-character handling and field-specific validation are unfinished.
- Settings incorrectly labels last name optional and duplicates first name into
  last name when blank.
- Legacy `profile:null` has fallback rendering, but no explicit complete-profile
  prompt as described.
- Avatar replacement keeps `/user/avatar` unchanged; the component effect depends
  only on user ID/path, so replacement can keep the old image until remount.
  Cache invalidation and object-URL cleanup need completion. Issue 03.

Evidence: `src/lib/auth.ts`, `src/features/auth/components/AuthModal.tsx`,
`src/features/auth/context/AuthContext.tsx`, `src/components/UserAvatar.tsx`,
`src/features/profile/pages/SettingsPage.tsx`.

## 5. Gifting flow.md — core frontend implemented; full feature blocked/incomplete

Implemented:

- Single-recipient checkout: required phone, optional email, note up to 500
  characters, quantity one and self-gift validation.
- Documented fragment link capture before React mount, immediate URL scrubbing,
  memory-only capability and body-only resolve/claim token submission.
- Versioned/scoped dynamic questions and consent evidence, pending-consent
  continuation, retries and authentication recovery where the backend requires it.
- Claimed active-ticket QR rendering; no invented ticket for pending issuance.
- Purchaser delivery/status page and idempotent resend with truthful feedback.
- Gift-only payment confirmation does not wait for a ticket in the buyer wallet.

Remaining / blocked:

- Multiple recipients for the same ticket product in one order: backend rejects
  duplicate product IDs and keys gift intents by product. Backend gap #74;
  frontend issue 01 blocked pending the backend engineer's contract.
- Current live payment-to-ticket fulfillment is blocked by #75: two verified paid
  Jazz transactions had delivered success webhooks ignored as unmatched. This is
  not fixed by the implemented frontend payment recovery.
- Real gift payment → SMS/email delivery → recipient claim was not completed
  live in this task. Eleven gift browser/API tests passed with mocked HTTP;
  they establish frontend behavior, not live delivery or settlement.

Backend APIs are the operative contract where illustrative document payloads
differ. No backend behavior or endpoint was invented to match an example.

Evidence: `src/lib/gift-link.ts`, `src/lib/gifts.ts`, `src/lib/gift-recipient.ts`,
`src/features/tickets/pages/ClaimGiftPage.tsx`, `GiftOrderPage.tsx`, checkout hook,
`src/lib/payment-return.ts`, and `e2e/gift-claim.spec.ts`.

## Validation and next work

Last completed checks: typecheck, 259 unit tests, production build, 20 relevant
checkout/payment/gift/guest-OTP browser checks. Both reviews cleared the payment
recovery delta. These checks do not certify every unfinished requirement above.

Frontend queue: issue 02 wallet answers; issue 03 profile/names/avatar; issue 04
age/coverage/featured display. Add discovery filter UI where product scope needs
the served filters. Backend engineer queue: #74 batch gift correlation and #75
paid-order reconciliation/fulfillment. Organizer-only work stays outside this app.
