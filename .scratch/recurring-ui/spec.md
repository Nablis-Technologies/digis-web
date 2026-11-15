# Recurring events (weekly series) — wire-up spec

**Status:** UI ported + wired **inert** (2026-10-15) — the remaining steps (card
`FormatTag`, occurrence vocabulary) are blocked on a backend gap
(`BACKEND_GAPS.md` **#68**). Nothing renders until the signal ships.
**Source:** `digis-web2` export (`export/src/features/event-detail/components/ScheduleSections.tsx`,
"Recurring" section) — the Figma Make UI exists, the public backend signal does not.

## What

A **recurring** event is one event with a rule that materialises many dated
sessions (a weekly resident night, a monthly series). The consumer UI is a
session picker: pick a date → pick that date's showtime → buy → (optionally) join
that session's waitlist; the hero/card shows a `recurring` `FormatTag` and a
next-session pill instead of a single date.

This is a distinct format from **multi-day** (a festival: one continuous run,
already wired) — see `ScheduleSections.tsx` where `festival` and `session` are
separate page sections.

## Why it is parked (ADR-0002 — never invent)

The backend **has** a full recurrence engine:

- `Events::RecurrenceRule` (table `events_recurrence_rules`),
- `Events::Recurrence::{Configure,Materialize,Activate,Deactivate}`
  (`app/services/events/recurrence/*.rb`),
- `MaterializeRecurrenceJob` — expands an RRULE into concrete `events_event_dates`
  rows tagged `source_key LIKE "recurrence-<rule_id>-%"`.

But the **public payload carries none of it** (BACKEND_GAPS **#68**; live probe
2026-10-15): no `recurrence` / `is_recurring` / `series` at the top level, and
`event_dates[]` omits `source_key`, so materialised sessions are indistinguishable
from hand-added dates. Without a series signal the client cannot group sessions
or tell a series from a plain multi-date event, and grouping by guesswork would
be inventing the series. So the UI stays dormant until the signal ships.

## Backend contract this is waiting on (#68)

The frontend needs, on `EventListSerializer` / `EventDetailSerializer`:

- a **series signal** — `recurrence: { rule_id, rrule, active }` (preferred) or a
  boolean `is_recurring`; and
- a **session grouping key** on the public `event_dates[]` — `source_key` or a
  `series_id` — so materialised dates can be grouped (and in-progress sessions
  told apart from one-offs).

Any committed shape works; the adapter is the only place it is read (see the
ticket). Do **not** start this work against a guessed shape.

## Porting inventory

**Ported into `digis-web` (2026-10-15):** `ScheduleSections.tsx` now carries
`SessionCarousel` (+ `ShowtimePicker`, `SessionCalendarSheet`, `ReminderToggle`),
`SessionSwitcher` and `SessionWaitlist`; the view-model types + `resolveSeries` /
`isSeries` live in `src/lib/recurring.ts`. `EventDetailPage` renders the series
branch behind `resolveSeries` (inert without the signal). Pinned by
`e2e/recurring.spec.ts` (route-mocked) + `src/lib/recurring.test.ts`.

**Still in the export / not ported:** nothing structural — only the *card* half
(`FormatTag` is already present, unrendered) and `OccurrenceStrip` / `SessionPill`
remain dormant until a series signal justifies rendering them.

**Already in `digis-web`:** the festival half of `ScheduleSections`; the card
vocabulary `FormatTag` (already accepts `recurring`, renders the ⟳ icon),
`OccurrenceStrip`, `SessionPill`, `DateRangeBadge` (all present but unrendered);
`guestsForDay`. `EventCard.cardFormat()` returns only `single | multiDay`.

## Policy

- **Never invent the series.** Render the recurring surfaces only when the
  backend signal is present; `recurring` is never derived from date count.
- Follow `DESIGN.md` and ADR-0007 (boundaries are light, not strokes); reuse the
  glass primitives the festival half already uses.
- No backend product changes — if the shape is wrong or missing, that is #68's
  business, not a frontend workaround.

## Unblock condition

`BACKEND_GAPS.md` **#68** is resolved (a series signal + a session grouping key are
in the live public payload). Then the ticket `issues/01-*.md` becomes
`ready-for-agent`.
