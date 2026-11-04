# Organizer ticket readiness

**REVERTED / HANDOFF ONLY:** User clarified that organizer development is outside
our responsibility. All organizer/shared-store/collection edits and added tests
were reverted. Retain diagnosis and #80 for the responsible engineers. Do not
repair existing offers or make organizer changes. Historical implementation and
validation notes below describe the reverted attempt.

User report: newly created Bozo and Mozooo show Check Availability.
Boundary: browser/API, already approved in this chat. Backend product changes
remain out of scope.

Diagnosis: public event lists return unavailable; both active GA products return
available:false and covered_event_date_ids:[], despite price and per-date stock.
Organizer form creates product/inventory then activates without ProductAccesses
or ProductDateAllocations. Activation errors were swallowed.

Plan:

1. Add an API-boundary regression for create → admission dates → fixed-series
   allocation → activation. Observe failure before implementation.
2. Wire existing backend Postman contracts through the shared store; all four
   organizer entry modes explicitly supply admission dates. Surface failures and
   prevent subsequent event publication. Keep stock and admission scope separate.
3. Verify failure stages, single-date and choose-one offers. Run mandatory
   monorepo typecheck, lint and both builds. Drive actual form with intercepted
   writes to prove call-site wiring and publication ordering.
4. Record backend activation validation deficiency in BACKEND_GAPS. Do not change
   backend product code, falsify public availability or patch active rows directly.
5. Existing active tickets are immutable. Obtain intended coverage (full series
   versus attendee-choice) before any operational replacement of user products.
   User asked for backend rules; explained fixed/choose_one and waiting for choice.

Red signal: bun test packages/store/tests/organizer-product.test.mjs initially
reported only product creation, missing accesses, allocations and activation.

Frontend implementation and checks complete: 6 API tests, all-package typecheck,
lint (zero errors, existing warnings) and both builds passed. Real form browser
checks passed four-date request ordering and failure blocking, intercepting all
writes. Existing Bozo/Mozooo offers intentionally unchanged pending user coverage
choice. Backend readiness validation filed as #80.
