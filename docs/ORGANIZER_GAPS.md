# Confirmed Organizer Gaps

## Open — blocking

### O-01. Published tickets have no admission coverage

The event creation flow saves the schedule, ticket price and inventory but omits
`product_accesses`, which link tickets to their permitted event dates. Published
tickets consequently return `available:false`, and attendees see **Check Availability**.
This affects both single-date and recurring events.

**Fix:** Configure admission dates and required date allocations before ticket
activation. Surface setup failures and prevent publication from continuing.
Existing affected offers also need repair while preserving events and purchases.

**Validation:** Verify single-date and recurring tickets are purchasable with the
correct date coverage, and setup failures prevent publication.

**Status: open — blocking.** Related backend validation: [#80](BACKEND_GAPS.md#80-ticket-activation-accepts-empty-admission-coverage--open-2026-11-02).
**Shared responsibility:** backend activation/publication also accepts these
incomplete tickets; this is not assigned solely to the organizer developer.

## Open — degrading

### O-02. Recurring creation does not persist the recurrence signal

The recurring wizard generates dated sessions locally but does not configure a
backend recurrence rule. The public API consequently returns `is_recurring:false`,
so attendees cannot identify the event as recurring despite its multiple dates.

**Fix:** Persist recurrence through the existing backend recurrence workflow.
Verify list/detail return `is_recurring:true` and the attendee session picker
loads the complete schedule. Multiple dates alone must not imply recurrence.

**Status: open — degrading.** Verified 2026-11-02; attendee flag consumption works.
**Backend check:** affected events have no saved rule; configured rules return
the correct public recurring flag. No backend cause for this missing flag was reproduced.

### O-03. Event statistics are hardcoded to zero

The Events page sets sold tickets, capacity and revenue to zero regardless of
saved data. Display available server-backed statistics; use an explicit
unavailable state for missing metrics rather than invented zero totals.

**Status: open — degrading.** Verified in `organizer/events/page.tsx`, 2026-11-02.

### O-04. Workspace lists filter only the first 100 managed events

Events and Dashboard fetch the first 100 managed events and filter locally by
organization. Larger accounts can therefore omit a workspace's events. Use the
existing server organization filter and proper pagination.

**Status: open — degrading.** Verified 2026-11-02; no backend change required.
