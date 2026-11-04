# Finish date-coverage, age and promoted-event display wiring

Status: completed 2026-11-01 (consumer frontend scope)

Verified by `e2e/display-handoff.spec.ts` and `e2e/festival.spec.ts`: missing,
unrestricted and bounded ages; explicit empty and partial date coverage;
paid-placement labels, server filtering and filter failure/retry.

Preserve explicit empty covered_event_date_ids arrays, distinguishing a served
all-event scope from absent metadata; stop name-based classification when the
backend coverage contract is present. Distinguish omitted age metadata from
has_restriction:false rather than asserting Any Age for an unconfigured event.
Add an explicit Featured/Promoted label driven by real paid-placement data; the
optional featured=true catalog filter should use the existing server query.
Organizer marketing purchase/cancellation screens are outside this consumer app.
Keep Money formatting and server-computed pricing.
