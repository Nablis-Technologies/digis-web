# Backend pull and frontend wiring — 2026-11-01

Remote c15d6ff3 merged into local 5c2890c7 (previous 55f535dd).
Six incoming commits. Existing tracked seed/catalog work autostashed/reapplied;
untracked work preserved. No local backend product edits.

Approved browser/API boundary remains the test seam. Work: sweep every gap,
wire stable per-recipient line_id and returned gift mapping; verify existing
payment refresh against the backend's new success correlation; run frontend
regressions plus real sandbox acceptance. Never force payment/ticket state.

Schema concern: new client_line_id added by editing already-existing migration
20261005090000, with no incremental migration in incoming commits. Probe existing
DB before claiming live batch support. Do not author a backend migration.

## Frontend implementation

- Multiple quantity-one recipient rows, optional per-recipient email/note and
  server-authoritative aggregate pricing. Stable UUID line_id sent through the
  shared admission serialization (including OTP submissions).
- IDs persist across uncertain-submit/remount retries, keyed by buyer/event/tier;
  only validated UUIDs persisted, never contact/note/capability fields. Terminal
  checkout cleanup erases draft IDs.
- Returned line_id preserved in admission and delivery types. Order line IDs
  preserve recipient ordering across reversed gift status responses and reloads.
- Per-gift delivery state remains server-derived. Success summary counts actual
  recipients. Successful controlled checkout follows actual delivery link.
- Full documented gap sweep: gap-sweep.md. #74 contract now partial/wired;
  missing upgrade migration filed #76. No other incoming consumer surfaces.

## Validation

55 frontend browser/API tests passed (1.0m), including 3 batch cases. 259 unit
checks, typecheck and build passed. Desktop/mobile screenshots inspected; existing
checkout field styling retained, no clipping across the viewport, sheet scroll
handles longer forms. Impeccable detector run once: existing typography/colors
advisories on incumbent code, no new blocking issue. Design sidecar is older than
DESIGN.md; preserving the current documented design rather than regenerating it.

## Review

Standards review identified remount UUID/idempotency mismatch, reproduced red,
fixed and passed. Spec review requested a successful checkout-to-delivery mapping
case without pre-seeded storage; added and passed. Final both axes: no remaining
concrete findings. Screenshots: batch-desktop.png / batch-mobile.png.

## Live payment verification (ongoing)

First attempt waited for absent initialization; subsequent bounded admission /
payment assertions identify the stage instead of waiting six minutes for popup.
Second run reached a real Chapa test payment but no confirmation in 240 seconds.
Success inbox event failed provider_verification_incomplete; fresh process
read-only verify returns success and matching provider reference, merchant,
amount and currency. Existing backend/worker process had started before pull.
Restarted web/workers to load the pulled code; no event replay, payment edits,
ticket issuing or schema repair performed. Verify fresh run before classifying
remaining backend behavior. Container source SHA matches pulled host source.

## Final live result

Restarted web/workers; new seeded buyer +251911000007; no fixture/database
repair. `pnpm test:acceptance`: **1 passed (30.2s)**. Real Chapa test-bank success,
exact order/attempt validation, ticket QR decoded to server credential, and
persistence after reload all exercised. #75 resolved for new purchases. Historical
expired Jazz payments remain unreconciled by this work. #74 partial/frontend-wired
and #76 open; live gift acceptance remains blocked by absent upgrade migration.
Final frontend gate **55 passed (1.0m)**; 259 units, typecheck/build passed.
No manual schema/payment/ticket repairs or local backend product edits.
