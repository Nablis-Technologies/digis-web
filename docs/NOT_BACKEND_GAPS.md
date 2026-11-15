# Not Backend Gaps — current classifications

This records why an item does not belong in the backend developer's worklist.
It is not a list of unfinished frontend work. Backend defects go in
[BACKEND_GAPS.md](BACKEND_GAPS.md); organizer defects go in
[ORGANIZER_GAPS.md](ORGANIZER_GAPS.md).

**Rechecked 2026-11-02.** Previous investigation details are retained in the
[historical record](archive/NOT_BACKEND_GAPS_HISTORY_2026-11-02.md).

## Attendee work — implemented

| Item | Current result |
| --- | --- |
| #55: detail starting price | Derived from served ticket-product prices; backend quote owns checkout totals. |
| #52: follow state | Venue follows already persisted. Artist and organizer controls now restore paginated saved follows, await writes, preserve state on errors and offer retry. Artist IDs are retained from participants. |
| #51 / #36: venue details | Public venue API hydration is implemented: images, coordinates, description, amenities, capacity and follower count. Missing coordinates hide Directions. Live media/coordinates checked. |
| #51: events by followable | Existing public event filters support organization, venue and artist IDs; the attendee query client supports those filters. A dedicated backend endpoint is unnecessary. |
| #59: invitation links | Event invitation-token deep links and offer-scoped authorization are wired. Delivery setup remains separate below. |
| Consumer promos | Already carried as `promotion_code` to the backend quote. Discounts/totals and invalid-code errors come from the server. No standalone client discount engine is needed. |
| Profile housekeeping | Fabricated XP, tiers, spending/streak and achievement widgets removed. Requested achievement support remains backend #73. |
| Showcase seeds | Recurring, multi-day, RSVP, gated offers, lineup, promos and venue media exist. Old missing-seed TODOs are obsolete. Organizer-created ticket/recurrence omissions are O-01/O-02, not seed omissions. |

## Setup / integration — still requires evidence

| Item | Current result / remaining work |
| --- | --- |
| #16: local payment setup | Launcher enables payment setup; configured HTTPS return and callback health checks both return 200. Popup/return recovery is frontend-wired. Host health alone does not prove webhook delivery or a completed charge. Historical payment failure #75 was resolved separately; response fee-unit issue #71 remains a backend gap. |
| #59: invitation delivery | Configured sender defaults to a no-op. Link authorization works; delivery is not proven. Requires a real sender/provider integration and delivery verification by the responsible team. No invitations sent during this audit. |
| #65: seller payout settlement | A synthetic recipient rejection did not establish a request-format defect. Provider-approved beneficiary and final settlement remain unverified. No payout initiated during this audit. |
| Cross-app ownership | Local seed ownership/role repair is implemented. Private fixtures remain separate. Organizer zero-valued statistics and first-100-event filtering are organizer work, not attendee fixes. Historical inventory counts are snapshots, not assertions about today's user-created events. |

## Superseded or deferred

| Item | Classification |
| --- | --- |
| #1 / #44 / admission half of #53 | Old event-level type/access/RSVP keys are superseded by per-offer admission. Do not restore them. Inert `public_guest_limit` remains backend #44. |
| Unconsumed half of #53 | No event-rating or event-level answer-window consumer requires those fields. Foreign price options already exist; selecting a consumer currency is separate product work. `seat_map` remains backend #53; age restriction is wired. |
| #60: outgoing Chapa amount units | Historical live evidence withdrew the request-unit claim. This is distinct from response fee conversion #71. No new provider transaction performed. |
| #11: slug history redirects | No current attendee implementation owed; legacy redirect support remains a separate backend/product concern. |
| #37: waitlist / invite request | The old claim that public waitlisting is absent is stale: public offer-scoped waitlist and OTP endpoints exist and are consumed. A separate request-for-invitation feature remains unimplemented; no fake request-success UI is enabled. |
| Auth / gamification | Google/check-account and other gamification remain deferred. Password reset is backend #57; achievements are #73, not silently deferred. |

## Reclassified back to a backend defect

**#38: ticket-required extras.** A supported add-on marked `requires_ticket:true`
still receives an extras-only quote for a buyer without an event ticket. Reopened
in [BACKEND_GAPS.md](BACKEND_GAPS.md#38-ticket-required-extras-are-quoted-without-admission-entitlement--reopened-2026-11-02).
The old “informational / feature ask” classification was incorrect. No order,
reservation, payment or charge was created by the quote probe.

## Verification

The current audit checked attendee consumers, backend contracts and public API
responses. New browser regressions cover saved follows on a later page, reload,
rejected writes, organizer unfollow and failed-read retry. Existing venue follow
and profile/media checks pass. Full frontend regression results are recorded in
[INTEGRATION_STATUS.md](handoffs/INTEGRATION_STATUS.md).

No organizer or backend product code was changed. Provider delivery and settlement
are explicitly unverified; this document does not mark them complete.

### Duplicate public RSVP tiers in demo data

The showcase seed adds a separate fully booked Late RSVP Waitlist offer to exercise waitlist enrollment. For attendee-facing demo events where both tiers grant the same admission, configure one public RSVP offer and enable its waitlist on that offer. Keep the sold-out waitlist example in a dedicated QA fixture. Keep code-gated RSVP separate where it serves a distinct audience. Existing waitlists are offer-scoped, so do not merge tiers in the frontend.
