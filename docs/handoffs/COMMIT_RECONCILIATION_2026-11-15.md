# Uncommitted work reconciliation — 2026-11-15

The 201 modified, deleted and previously untracked files represented by 140
status paths were preserved in coherent commits. No backend repository changes
were included. This records the outstanding frontend work; it does not close
the backend and organizer gaps listed in their existing handoffs.

## Author dates and provenance

Historical author dates reconstruct each chunk's completion day from dated
session notes and the existing files' last-modified metadata. They do not
reconstruct every edit or establish how much time was spent on it. Files that
span several sessions use a later completion date. November 3–4 dates partly
rely on filesystem metadata and are explicitly described that way in the
commit bodies. Those dates are estimates, not recovered Git history.

Historical times are normalized to noon EAT because original author times
are unknown. All committer dates are November 15, when the commits were
actually created. No existing published commit was rewritten.

| Commit | Author day | Chunk |
| --- | --- | --- |
| 953b9a7 | 2026-10-24 | Public venue reads and profile gap tracking |
| e081e25 | 2026-10-26 | Recipient gift claims, answer editing and secure links |
| ddc30c0 | 2026-10-28 | Payment/QR checks and browser test infrastructure |
| c5c74b5 | 2026-11-01 | Guest account saving and profile editing |
| 185164a | 2026-11-03 | Shared API integration and development media routing |
| 770148d | 2026-11-04 | Checkout, discovery and event UI |
| bbaeeaa | 2026-11-04 | Browser regression coverage |
| 361ad8f | 2026-11-04 | Integration evidence and ownership handoffs |
| e897a74 | 2026-11-15 | Current verification screenshots |
| 0ab5658 | 2026-11-15 | Payment confirmation account isolation fix |
| 191c127 | 2026-11-15 | Guest claim OTP focus and password retention fix |
| 875949f | 2026-11-15 | Gift and age regression updates |

The adjacent [date inventory](commit-date-inventory-2026-11-15.json) records the
file metadata and membership captured when creating the historical chunks.
Screenshots regenerated during verification use today's author date.

## Corrections made during verification

Review found that payment confirmation accepted a buyer ID but did not use it.
Both a delayed refresh and an already-confirmed ticket could survive a direct
account switch. Two browser regressions reproduced the leak before the fix.
Confirmation state is now owned by the buyer, hidden synchronously from other
accounts, and protected against stale reconciliation responses. Both tests
passed after the fix. Standards and Spec reviews found no remaining actionable
issue in this corrective change.

Two older browser expectations were updated to the current behavior: paid gift
checkout follows the server payment outcome, and missing age metadata omits the
age card instead of asserting unrestricted admission. Repeated account-claim
tests exposed two OTP focus triggers: React autofocus and a later animation-frame
callback. The latter could interrupt password entry. Removing the duplicate
autofocus retained the explicit initial/resend focus behavior. Password-retention
assertions and ten repeated dark/light browser checks passed after this fix.

## Validation scope

TypeScript, 259 unit tests, the production build and all 83 deterministic browser
tests passed. TypeScript, units and build also passed on the conflict-free merged
tree, which retains main's compatible ticket-detail layout improvement. Both
review axes cleared the corrective changes. Browser tests control the HTTP
boundary. Live Rails and provider acceptance were not
recertified: the local Rails service was unavailable during this run. Existing
bundle-size and mixed-import build warnings remain.
