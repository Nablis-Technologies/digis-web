# Critical frontend test audit — 2026-10-28

User request: find and fix further failures hidden by weak frontend tests; make
tests fail on broken user outcomes. Browser/API boundary already approved.
Preserve all in-progress handoff work. Backend product changes remain forbidden.

## Work

1. Establish one full regression baseline with the real dev API available.
2. Add decisive browser/API regressions for old-wallet false payment success,
   unusable/fabricated QR, cross-account wallet cache, and delayed auth races.
   Observe failure before each corresponding frontend fix.
3. Replace false-green/log-only assertions; fix mock/observer URL matching for
   the actual dev proxy instead of using a temporary direct-API configuration.
4. Promote a strict, separately identified live sandbox purchase acceptance gate:
   checkout → provider success → exact payment/order confirmation → usable QR
   → persisted wallet ticket. No mocked API or force-issued credentials.
   Missing setup or a handled error is a failure, not a pass or silent skip.
5. Exercise the hardened suite, review, and report demonstrated passes/failures.
   Never equate mocked frontend checks with real provider fulfillment.

## Initial findings

- Checkout smoke passes on hosted URL, handled errors or checkout conflicts.
- Wallet audit logs the fetch/empty state but does not assert either; empty DOM
  passes its uniqueness check.
- Mock/provenance and some discovery tests observe direct :3000 only despite
  development routing through /__digis_api.
- Payment hook can treat a pre-existing wallet ticket as the new purchase.
- QR renderer substitutes literal DIGIS for an absent token; credential status
  is ignored by the wallet mapper.
- Wallet queries keyed by authenticated boolean can reuse another account's data.
- Delayed auth/refresh responses can overwrite a new account or undo logout.

## Test boundaries and evidence

Fast browser/API regressions control network responses and assert visible user
outcomes. Live acceptance uses actual frontend, Rails, provider test mode and
wallet APIs. Explicitly validate the provider's test checkout before any test
payment interaction; never perform a live-money payment. Do not change backend
state through Rails/database scripts to make an acceptance test pass.

New defects and validation results will be recorded here as work completes.

## Implemented and demonstrated

- Exact attempt/order/payment status and active credential required for payment
  success. Removed all wallet-only proof, including missing-attempt returns.
- No placeholder QR; pending/revoked/missing credentials cannot display scan,
  enlarge or download actions. Browser screenshots are decoded with jsQR and
  compared with the independently supplied server credential.
- Wallet cache keys include user ID. Delayed user/refresh responses cannot undo
  logout or account switching; delayed old-account 401s cannot refresh/replay
  requests under a new account. Regressions reproduced before fixes.
- Same-URL avatar replacement now revalidates private images (ETag supported);
  regression failed before fix and passed afterward.
- Hosted initialization no longer accepts errors/conflicts as success. Guest
  test retains validation coverage instead of matching the navbar Log in text.
  Wallet/provenance/discovery tests require actual successful server data.
  Transfer acceptance must produce an accessible QR, not merely a refetch.
- Existing mock routes/observers recognize /__digis_api as well as direct :3000.
- test:frontend explicitly identifies controlled browser/API checks.
  test:acceptance requires real sandbox fulfillment and durable exact-order
  ticket. test:release combines all checks; no CI workflow installed.

## Validation and limits

- Unit tests: 31 files / 259 tests passed (writable local temp; default sandbox
  temp initially caused EPERM transform-cache rename failures).
- TypeScript and production build passed. Existing chunk size/mixed import
  warnings remain.
- Focused browser runs: 25 critical/payment/transfer/event tests passed and
  27 gift/profile/venue/answer tests passed. Final combined `pnpm test:frontend`: **52 passed** (57.7s).
- A broader run initially had two ERR_NETWORK_CHANGED navigations (clean rerun
  passed), plus two seller-payout tests blocked at real login with Rails offline.
- Real acceptance was executed and FAILED explicitly at Rails health. Docker
  launcher timed out; starting Windows Docker service was denied by the OS.
  No real payment/provider/queue/tunnel acceptance is claimed.
- Existing live checkout, wallet, provenance and discovery assertions were
  tightened but cannot be verified against the offline backend in this run.
- Two-axis review: missing-attempt proof, old-account 401 replay, live screenshot
  privacy, and wallet product-type expectations addressed. Final standards pass;
  final spec finding corrected. Backend product code unchanged.
- Automatic review rejected deleting the obsolete guest-login test as lost
  coverage. Safer alternative retained/reworked it into guest validation.

## Final review

### Standards

No remaining concrete standards findings in the reviewed changes.

### Spec

Review identified missing-attempt wallet proof, delayed old-account 401 replay,
and wallet extras incorrectly included in expected ticket IDs. All addressed.
The real acceptance journey remains unverified beyond its explicit health failure.

## Docker-running continuation — 2026-10-28

User confirmed Docker running. Managed launcher started Rails and web; an owned
orphan Vite from the earlier timeout was identified and stopped. Frontend tunnel
initial public-readiness probe failed; later probe and launcher retry succeeded.
Both payment tunnels and Rails were healthy before the payment attempt.

Live execution exposed test setup mistakes: ephemeral five-second login toast
and indiscriminate checkbox selection (which enabled gifting). Fixed by waiting
for successful login response + account UI and accepting consent controls only.
No product behavior was changed to accommodate the test.

`pnpm test:acceptance` then exercised a real non-gift Chapa test-bank payment.
**FAILED at the intended critical outcome:** confirmed purchase screen never
appeared within 240 seconds (4.3 minute test). Latest payment processing;
08:08:57 UTC pending webhook matched/processed, 08:09:02 success webhook
ignored/unmatched. This automatically reproduces documented backend gap #75.
Evidence appended to #75; no backend product edits or state repair performed.

Live wallet/provenance/discovery/filter/payout checks also executed. Initial
responsive-text locators chose CSS-hidden copies; fixed to accessible headings.
Final combined live integration result recorded below. Prior Docker-offline
limitations above are historical; the payment gate now reaches real fulfillment
and fails for the missing ticket, not unavailable infrastructure.

Final live integration run: **10 passed** (20.1s). Real sandbox acceptance: **1 failed**, missing purchase confirmation after provider test payment.
