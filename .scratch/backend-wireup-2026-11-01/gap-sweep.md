# Full gap sweep — 2026-11-01

Compared all documented entries against incoming committed backend changes
`55f535dd..5c2890c7` (remote `c15d6ff3`). Only payment correlation and gift line
identity/processing changed. No incoming routes, controllers, event serializers,
auth/profile/preferences, discovery, answer-management or payout contract changes.
Chapa provider fee conversion (#71) remains untouched; new amount parsing applies
to verified principal, not provider fee. Existing UI work remains preserved.

Every resolved/partial entry was checked for a new frontend obligation: gifts
require new line identity + recipient rows + delivery correlation; payment refresh
is already wired and needs real acceptance, not a new endpoint or frontend
verification policy. All other consumers retain their preceding contract.

| Documented entry | Incoming impact / frontend disposition |
|---|---|
| #76. Batch gift line column has no upgrade migration for existing databases | New: missing forward migration, no frontend/schema workaround. |
| #75. Successful Chapa payment ignored as unmatched; paid Jazz order expires without ticket | Changed: verified provider success correlation; existing refresh consumer retained; real sandbox acceptance passed after worker restart. |
| #74. Batch gifts cannot repeat a ticket product for different recipients | Changed: line-ID batch contract; frontend wired; live rollout blocked by #76. |
| #73. Consumer achievements have no backend contract | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #17. `cbe` is not a valid backend payment method — RESOLVED 2026-10-16 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #40. Abandoned checkouts never expire → `active_checkout_exists` blocks all later checkouts — RESOLVED 2026-09-30 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #43. RSVP rejects `access_code` / `invitation_token` → audience-gated RSVP is impossible — RESOLVED 2026-09-30 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #53. Public event payload no longer exposes the non-admission detail fields — `age_restriction` RESOLVED 2026-10-17 (`seat_map` still open) | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #56. Signup cannot take over an existing (shadow) phone — RESOLVED 2026-10-16 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #57. No password reset / forgot-password | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #60. Chapa payment amount is sent 100× too large — FALSE POSITIVE, WITHDRAWN 2026-10-16 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #65. Seller payout — reclassified as provider verification (2026-10-24) | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #66. Seller listing wire omits `ticket_id` — the wallet can't tell which tickets are already listed — RESOLVED 2026-10-05 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #67. `Core::UserProfile` requires mandatory `last_name` (`null: false` and presence validation) | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #68. Public event payload exposes no recurrence / series signal — the recurring consumer UI is unbuildable — RESOLVED 2026-10-16 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #69. Public product payload omits date allocations — a whole-festival pass is indistinguishable from a single-day offer — RESOLVED 2026-10-16 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #70. Public `event_dates` is unbounded and unfiltered (no upcoming window) — a recurring series ships its whole set — RESOLVED 2026-10-16 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #71. Chapa provider fee is recorded 100× too large (a minor-unit value converted as if it were major) | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #72. Public **detail** payload omits `event_lifecycle` / `ticket_availability` — an ended event's detail page can no longer gate purchase | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #54. Discovery availability has no backend source — RESOLVED 2026-10-15 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #41. A released order permanently burns its registration — RESOLVED 2026-09-30 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #42. Wallet resale policy omits the value a percentage cap is computed from — RESOLVED 2026-10-01 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #39. No public endpoint exposing payout `bank_slug`s — RESOLVED 2026-09-30 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #8. `UserAuthSerializer` lacks `name`; no `Core::User.name` column — RESOLVED 2026-10-16 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #9. No self-service `PATCH /auth/me` or `PATCH /users/me` — RESOLVED 2026-10-16 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #33. Guest payment-refresh re-validates the quote token even for accepted payments — RESOLVED 2026-09-30 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #34. Past events remain purchasable — no date / sales-window enforcement — RESOLVED 2026-09-30 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #44. Public `public_guest_limit` remains exposed but inert (narrowed 2026-10-24) | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #45. RSVP has no sold-out signal or waitlist fallback; `rsvp_capacity` ignored — RESOLVED 2026-09-30 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #46. No saved-events / favourites, home feed, or reviews/ratings | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #47. No gift-ticket endpoint — RESOLVED 2026-10-16 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #48. No consumer account preferences, 2FA, or password change/reset | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #49. `GET /public/events` has no search/filter/sort (pagination now exists) — RESOLVED 2026-10-16 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #50. Wallet & history gaps — RESOLVED 2026-10-16 (registration answers + edit window) | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #51. No events-by-followable; no profile stats — RE-SCOPED 2026-10-16 (merged into #49) | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #58. `active_checkout_exists` 409 carries no order id → the client can't resume or discard the open checkout — RESOLVED 2026-10-16 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #61. A pending ticket transfer is invisible to the recipient in-app — RESOLVED 2026-10-16 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #62. A pending (unaccepted) outgoing transfer is invisible on the sender's wallet ticket — RESOLVED 2026-10-16 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #63. `admission_selections` is ticket-only → a ticket + extra cart is rejected — RESOLVED 2026-10-05 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #64. Wallet ticket omits the acquisition (sold) price — RESOLVED 2026-10-01 (no longer needed) | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #49 addendum — no city aggregation | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #36. Public event payload lacks lineup/participants (lineup only) — RESOLVED 2026-10-17 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
| #36 addendum — expose the participant→date link when the lineup goes public — RESOLVED 2026-10-17 | No incoming contract change; prior disposition and existing frontend consumer/follow-up retained. |
