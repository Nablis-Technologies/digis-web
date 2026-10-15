# Wire the recurring (weekly series) session UI

- **Status:** `needs-triage` — queued; **blocked on a backend gap** (cannot start).
- **Blocked by:** `docs/BACKEND_GAPS.md` **#68** — the public event payload exposes
  no recurrence/series signal. Do **not** start this against a guessed shape
  (ADR-0002: never invent). It becomes `ready-for-agent` when #68 is resolved and
  the shape is known.
- **Related:** `docs/handoffs/web2-ui-import.md` → "Wire-up readiness" and
  "Parked / Policy"; `.scratch/recurring-ui/spec.md`; `SCHEDULE` festival half
  (already wired) in `src/features/event-detail/components/ScheduleSections.tsx`.
- **Source:** `digis-web2` export →
  `export/src/features/event-detail/components/ScheduleSections.tsx` ("Recurring"
  section, ~line 671+) and `export/src/features/event-detail/pages/EventDetailPage.tsx`
  (the `session` prop, lines 54–58 & 174–183).

## Context

Multi-day **festival** and recurring **series** are distinct: the festival half is
ported and wired; the recurring half is not. `FormatTag` already knows `recurring`;
everything else about the series view is unported or unrendered. When #68 lands the
work is small and mechanical — this ticket is the checklist.

## Steps (when #68 is resolved)

1. **Adapter + type** — read the committed signal in
   `src/lib/events-adapter.ts` (`BackendEvent`) and add it to `Event`
   (`src/types/event.ts`): e.g. `recurrence?: { ruleId?: string; active?: boolean }`
   and/or `isRecurring?: boolean`, plus a per-date grouping key on
   `Event.eventDates[]` (`seriesId`/`sourceKey`). Absent stays absent (ADR-0002).
2. **Card format** — extend `CardFormat` in `src/components/EventCard.tsx`
   (`single | multiDay | recurring`) and make `cardFormat(event)` return `recurring`
   when the signal is present (it currently only sees `eventDates`). Confirm the
   `EventInfoRail` format chip and the discovery `FeaturedEventCard` use it. Verify
   `cardFormatLabel` produces e.g. `"WEEKLY · THU"` (the export's label vocabulary).
3. **Port the session UI** — bring `SessionCarousel` (+ `ShowtimePicker`,
   `SessionCalendarSheet`, `ReminderToggle`), `SessionWaitlist`, and the types
   (`SessionShowtime`, `SessionRailDay`, `SelectedSession`, `CalendarSession`,
   `SessionCalendarData`, `SessionCarouselProps`) from the export's
   `ScheduleSections.tsx` into ours; reuse the existing glass primitives. Adapt the
   `SessionGuests` session variant (shared with the festival half).
4. **Group sessions** — build the series view-model: group `event_dates[]` by the
   grouping key into `SessionRailDay[]`; resolve the selected session (first
   upcoming) and the `SessionCalendarData`. Prefer a `lib/` pure module (mirroring
   `lib/festival.ts`) so it is unit-testable without jsdom.
5. **Wire `EventDetailPage`** — add the recurring branch: render the session
   carousel above the ticket selector, scope the selector + guests to the selected
   session, and route the waitlist to `SessionWaitlist` when the selected session is
   sold out. Guard: render only when the series signal is present.
6. **Render the dormant vocabulary** — `OccurrenceStrip` / `SessionPill` on cards
   once sessions exist (they are present but unrendered today).

## Definition of done

- A live recurring event shows: `recurring` format tag, session rail, per-session
  ticket scope, per-session guests, and a per-session waitlist when full.
- No `recurring` is ever derived without the backend signal (ADR-0002 holds).
- `npx tsc --noEmit` clean · `npx vitest run` green · `pnpm build` OK.

## Tests

- Unit: the new series grouping pure module (grouping, selected-session fallback,
  sold-out handling, empty/missing signal → no series), with fixtures mocked at
  the adapter boundary.
- Unit: `cardFormat` returns `recurring` only when the signal is present.
- E2E: a route-mocked recurring event (the seed has none) — pick a date, assert the
  tickets re-scope, the guests swap, and a full session offers the waitlist. Mirror
  `e2e/festival.spec.ts`.

## Comments

- 2026-10-15: filed from the web2 import as the queued follow-up to #68. The frontend
  is otherwise prepped (per-date participant link, `FormatTag` recurring icon); only
  the series signal and this wiring remain. Porting step 3 could be done early as
  dead-but-tested scaffolding (the repo keeps dormant components deliberately) — the
  wiring in steps 1–2, 4–6 must wait for the shape.
