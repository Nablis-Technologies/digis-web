# Payment return and missing-ticket diagnosis — 2026-10-26

Status: frontend recovery and launcher setup fixed; reported Jazz charge remains
unmatched pending a provider receipt reference. No backend product edits.

## User symptom

After paying for `/events/thursday-jazz-sessions`, redirect/success/ticket did not
appear. The stack was launched through workspace `Start Digis.cmd`.

## Reproduced and fixed

1. Browser/API tests on the actual event route showed zero refresh requests
   after reload with `digis:awaiting-confirm` persisted. Both guest and signed-in
   cases failed deterministically. The router now resumes the saved order on
   mount/auth changes. Original custom-event confirmation still works.
2. After reconciliation succeeded, `View My Ticket` opened an empty collection
   while GET /tickets lagged behind the ready refresh response. TicketView now
   accepts the server-confirmed snapshot only for the exact selected route ID.
   The snapshot is identity-scoped and TicketView resets across account/guest
   changes; a logout regression was red before isolation and now passes.
3. The UI timeout discarded the awaiting-order marker, preventing late settlement
   recovery. It now retains the marker at timeout; confirmed/terminal outcomes
   still clear it. A pending → timeout → reload → ready → QR test passes.
4. The root shortcut omitted existing `-Payments` setup and its frontend tunnel
   was stopped. It now invokes `up all -Payments`. Existing setup restored the
   tunnel and callback host; return URL and callback-host /up both HTTP 200.
5. The root shortcut opened localhost while the configured return uses the
   public app origin. It now opens the configured HTTPS app path without the
   status=return query, preserving browser origin for future purchases. Existing
   localhost purchases cannot migrate sessionStorage across origins.

## Feedback loop

`npx playwright test e2e/payment-return.spec.ts --grep 'resumes after' --workers=1`
first failed both cases with zero refresh calls, then passed reconciliation and
QR opening. Full focused checkout/gift/payment run: 19 passed. Additional guest
free OTP test: 1 passed after adapting its boundary mock to proxy/direct routing.
Thus 20 relevant browser tests pass in the normal script proxy configuration.
Typecheck passes; 259 unit tests and production build pass. Unit tests required
an unsandboxed rerun because sandbox temp-cache rename permissions blocked all
imports (no application assertion failed). Both code-review axes cleared.
The full unrelated browser suite was not rerun; its older proxy-mock follow-up
remains tracked. Draft wallet-answer red test is preserved outside active e2e in
`.scratch/handoff-wireup-2026-10-26/wallet-answers.spec.pending.ts` for resumption.

## Live Jazz payment evidence (read-only)

Latest/only Jazz order at inspection: created 2026-10-26 14:10:39 UTC;
order expired, payment failed, failure_code=not_found,
raw_status=provider_rejected, accepted_at/succeeded_at absent, no tickets.
One payment.pending event was processed. Solid Queue is configured/running via
Puma; no paid order awaiting ticket issuance was found for this event.

Read-only provider verification using the stored merchant reference and hosted
checkout URL segment both returned failure/not_found. No provider_reference is
stored on that attempt. This does not establish that no separate charge exists;
the user's successful receipt reference and amount are required to reconcile it.
No retry charge, refund, manual status update or ticket issue was performed.
This is provider verification, not a confirmed backend code gap. See
`docs/NOT_BACKEND_GAPS.md`. Do not mark backend defects resolved from these fixes.

## Limits

No real payment was completed by this task. Chapa V2 may stay on its receipt;
Digis confirms in the original app tab via the server refresh endpoint. Reload
restores confirmation but loses the in-memory handle for closing an old provider
tab; manual return to the original Digis tab may be needed. A popup-blocked
same-tab fallback remains an existing limitation, not covered by the recovery
fix. Webhook dashboard registration was not changed or proved by host health.
## Receipt matched — supersedes initial unresolved assessment

User supplied HCGyXsbvSn5r. Chapa verify HTTP200 SUCCESS amount41000 ETB;
returned merchant reference matches exact Jazz order/payment. Success webhook
was ignored with no payment association (merchant_reference null; Chapa reference
not stored locally). Order expired afterward with no tickets. Filed blocking
backend gap #75 with IDs, timestamps and code evidence. Backend engineer owns
safe reconciliation. No backend product/state mutations performed.

## New purchase recheck — 19:26 Nairobi

Both tunnels healthy HTTP200. New Jazz order created16:26:22UTC; success
webhook received16:26:30UTC but ignored/payment_id null. ReceiptHCCePSUoB7pn
verifies SUCCESS ETB410.00 and merchant reference exactly matches new order.
Added second reproduction to backend gap75. No tunnel restart or payment
mutation needed/performed. User's newest payment is confirmed by provider;
backend order still pending_payment and payment processing at inspection.

## Broader differential audit — 2026-10-26

User reports backend previously worked. Historical evidence supports that: the
committed backend plan `docs/superpowers/plans/2026-09-30-chapa-payout-and-checkout-e2e-verification.md`
records Render preview receipt HCukiAmZmi0l, fulfilled order and active ticket/QR.
This is historical documentation of a different environment, not a current local
reverification. Do not state that checkout never worked.

| Possibility | Read-only finding |
|---|---|
| Stopped/wrong tunnel | Both managed tunnels running; return and callback-host health200. Current success webhook recorded on this exact local event eight seconds after order creation. Transport did deliver it. |
| Stale container configuration | Container ENV matches .env.chapa for enabled, mode, base URL, callback, return, API credential and webhook secret (booleans only; no secrets emitted). Mode=test. |
| Different/uncommitted backend product code | Four payment source hashes inside container equal host files. app/config have no uncommitted product diff. Fetched origin still8419aaaf; no app/routes/schema differences from local HEAD55f535dd. |
| Wrong account/key for these receipts | Current configured credential verifies both provided successful receipts; each verified merchant reference matches its exact local Jazz attempt. Old Render credentials were not accessed/compared. |
| Invalid webhook signature | Incoming event was authenticated and durably acknowledged; no signature values retained in audit output. |
| Job backlog / stopped worker | Current event's outbox published, processing attempt completed same second, no last_error; result ignored rather than queued/failed. |
| Expiry before webhook | New order16:26:22UTC; success webhook16:26:30UTC. It was ignored before expiry, so expiry cannot explain the initial lost match. |
| Frontend inventing success/wrong order | Provider verify proves SUCCESS41000ETB with exact expected merchant reference. No issued ticket exists in local order. Frontend reload/timeout/route fixes cannot create server fulfillment. |
| Provider return/browser origin | Startup mismatch fixed. No recent PaymentCallbacksController invocation observed in inspected log tail. Receipt/return behavior is separate from the delivered success webhook. |
| Amount mismatch | Order and verify principal both41000. Webhook42179 differs; backend engineer must verify provider semantics, not infer fees from frontend. The event was ignored at lookup before acceptance. |

Current reference matrix: receipt HCCePSUoB7pn verify HTTP200 SUCCESS41000ETB
and merchant match=true; same attempt's merchant lookup HTTP400 (normalized
not_found in prior adapter checks). Hosted checkout URL reference is different
from the final receipt reference. Thus blindly taking its URL suffix is not a
proven repair. Chapa's current official docs say merchant or Chapa reference can
be verified; observed merchant lookup does not satisfy that documented behavior.
Sources: https://docs.chapa.global/docs/v2/integrations/verify-payment and
https://docs.chapa.global/docs/v2/integrations/webhooks.

History review: provider-reference extraction predates the recorded successful
checkout (September13); current lookup compares the same reference identities
as before. Hosted initialization tests explicitly accept checkout_url-only data.
A webhook carrying merchant reference can match and save Chapa reference; an
initializer/callback supplying a recognized Chapa reference can also work.
Current webhook has merchant_reference=null and local provider_reference=null.
Those facts explain the failure. They do not establish which external behavior
or environment changed since the previous successful run. Raw earlier successful
initialization/webhook payloads are not available here for a strict differential.

Scope: no provider charge, refund, webhook replay, forced status update, ticket
issue, backend product edit or configuration change in this broader audit.
Backend #75 remains real, but its trigger is described as a current provider/
backend correlation mismatch, not a proven recent backend code regression.
## Test coverage clarification — 2026-10-27

Current automated tests do not catch #75. Checkout smoke returns on hosted
URL/handled errors, while return tests mock server ready/ticket projection.
Backend correlation fixtures include merchant reference. Added exact missing
regression and true end-to-end acceptance criteria to #75; no backend test
or product edits. Green frontend checks are not live issuance certification.
