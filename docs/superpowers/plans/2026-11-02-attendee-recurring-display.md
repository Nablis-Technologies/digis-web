# Attendee recurring display

Scope: attendee app only; organizer/backend defects are documentation-only.

1. Compare public list/detail recurrence flags with existing card and session UI.
2. Replace stale test recurrence objects with the actual is_recurring + bounded
   preview + full-schedule API contract. Check discovery and desktop/mobile detail.
3. Reproduce any attendee omission before fixing it. Reuse existing format badges.
4. Verify nearby multi-day behavior, TypeScript, unit tests and build; inspect the
   real recurring fixture on desktop/mobile. Record separate organizer gaps.

Findings: desktop already labels recurring events; mobile hero omitted the badge.
The new mobile browser regression failed before adding the existing FormatTag.
Organizer wizard does not persist the recurrence rule; public flags are false
for its generated series. Recorded as O-02; no organizer code changes.

Completed: 9 browser regressions, live desktop/mobile seven-session selection,
TypeScript, 259 unit tests and production build passed. Unit cache permissions
required an unsandboxed retry; no test failures remained. Reused the existing
mobile-overlay badge styling; availability behavior is unchanged.
