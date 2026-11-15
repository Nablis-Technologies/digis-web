# Complete the consumer handoff wiring — 2026-10-26

Status: gift core implemented 2026-10-26; batch checkout and the other handoff items remain tracked. Browser/API test boundary confirmed by user.
No backend product edits. Preserve all pre-existing frontend changes.

The October 26 attachment audit supersedes earlier claims that service-level
mapping alone completed these surfaces.

1. Gift recipient: fragment capability parsing/scrubbing, body-only secret,
   dynamic versioned/scoped answers, consents, pending state, QR and auth recovery.
2. Gift payer: recipient email, truthful delivery/resend feedback, order status.
3. Wallet registration answer read/revision UI.
4. Required separate names/labels/validation and avatar cache refresh.
5. Unknown age vs all ages, empty date coverage semantics, featured badge/filter.

Only item 1 and gift-related follow-through are the active slice following the
user's request to clarify and then proceed with gifting. Remaining items stay
tracked; no rules, fees, endpoint paths or backend behaviors are invented.

## Completed gift slice

Gift links are captured before mounting the app, canonicalized/scrubbed, and kept
only in memory. Legacy query links are scrubbed too (their initial HTTP request
cannot be undone). Reloading a scrubbed route asks for the original message link.
Resolve/claim use body-only tokens; recipient query/mutation responses have zero
cache retention on unmount. Malformed encoded IDs do not crash startup.

The six backend question types retain stable option keys, form-version IDs and
registration/admission-slot scope. Required fields and exact consent content,
hashes, coordinates, request UUIDs and idempotency keys are submitted to the API.
A pending-consent continuation preserves prior answers. QR is rendered only for
a claimed gift with an active credential; no raw token string is displayed.
Authentication recovery uses the real login route with a clean return path.

Payer checkout includes optional email and one recipient/quantity one. Paid
gift-only auth/guest returns confirm from the exact succeeded payment and fulfilled
order, not from a payer-owned ticket. The order delivery route reads server gift
and delivery statuses, supports retries/resend, and gates access to the purchaser.
No delivery/receipt success is invented. A guest payer must sign in/create the
purchasing account to access authenticated delivery tracking.

## Verification

Typecheck, 259 unit tests and production build pass. All 57 deterministic browser
tests passed with the temporary direct-API test config, including live backend
checks and 11 new gift scenarios. The ordinary proxy configuration exposed 18
older test-mock/observer incompatibilities (39 passed); the new gift tests pass
with both API routes. See issue 05. Tracked Vite/environment files were not
modified; normal proxy dev server restored. Desktop/mobile dark/light gift form
captures inspected. Standards and Spec review findings resolved.

Gift tests mock the HTTP boundary; this is not proof of real Chapa settlement,
SMS delivery or a live bearer-link claim. The full suite exercised existing live
checkout/API behavior but no real payment was completed for this verification.
Venue seeded-profile verification previously pending also passed in this run.

## Remaining

Issues 01–04 record batch gifting, answer editing, names/avatar and display work.
Issue 05 records test API-proxy compatibility. No backend product files were
changed and no new backend rules/endpoints were introduced.
## Batch contract check 2026-10-26

Issue 01 is blocked by backend gap #74: duplicate same-product gift lines are
rejected and recipient intents are product-keyed in committed backend 55f535dd.
The items-array assumption was incorrect. No batch UI or backend changes made.
Next unblocked item is issue 02, wallet answer viewing/revision.
