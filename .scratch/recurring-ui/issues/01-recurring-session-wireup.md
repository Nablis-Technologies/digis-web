# Wire the recurring (weekly series) session UI

- **Status:** `needs-triage` — the UI is ported and wired (2026-10-15); the
  remaining items stay **blocked on a backend gap** (the wire shape).
- **Blocked by:** `docs/BACKEND_GAPS.md` **#68** — the public event payload exposes
  no recurrence/series signal. Do **not** build the remaining steps against a
  guessed shape (ADR-0002: never invent). It becomes `ready-for-agent` when #68 is
  resolved and the shape is known.
- **Related:** `docs/handoffs/web2-ui-import.md` → "Wire-up readiness" and
  "Parked / Policy"; `.scratch/recurring-ui/spec.md`; `SCHEDULE` festival half
  (already wired) in `src/features/event-detail/components/ScheduleSections.tsx`.
- **Source:** `digis-web2` export →
  `export/src/features/event-detail/components/ScheduleSections.tsx` ("Recurring"
  section, ~line 671+) and `export/src/features/event-detail/pages/EventDetailPage.tsx`
  (the `session` prop, lines 54–58 & 174–183).

## Context

Multi-day **festival** and recurring **series** are distinct: the festival half is
ported and wired; the recurring half was unported. As of 2026-10-15 the recurring
**UI is ported and wired behind an inert guard** — it renders only when the payload
carries a series signal, so nothing is invented and there is no visible change on
today's payload. What remains (the card format and the dormant occurrence
vocabulary) is gated on the *confirmed* wire shape.

## Steps

1. **Adapter + type** — *done (provisional shape).* `BackendEvent` reads
   `recurrence?: { rule_id, rrule, active }` and `is_recurring`; `Event` carries
   `recurrence?: { ruleId?, rrule?, active? }` / `isRecurring?`; the adapter maps
   them, and `isSeries()` (`lib/recurring.ts`) is the single reader. **Revisit when
   #68 fixes the shape** — the mapping is isolated to `events-adapter.ts`, so it is
   a one-spot change.
2. **Card format** — *done.* `CardFormat` is `single | multiDay | recurring`;
   `cardFormat(event)` returns `recurring` when `isSeries(event)` (never inferred
   from the date count), and the new `cardFormatLabel(format)` drives the chip on
   all three surfaces (`EventCard`, `EventInfoRail`, `FeaturedEventCard`).
   Unit-tested in `src/components/EventCard.test.ts`. **Divergence from the
   export:** the label is `"RECURRING"`, not `"WEEKLY · THU"` — the cadence word
   is not derivable from the public dates, so it is not claimed (ADR-0002).
3. **Port the session UI** — *done.* `SessionCarousel` (+ `ShowtimePicker`,
   `SessionCalendarSheet`, `ReminderToggle`), `SessionSwitcher`, `SessionWaitlist`
   are ported into our `ScheduleSections.tsx` on the glass system, with the
   view-model types in `lib/recurring.ts`.
4. **Group sessions** — *done.* `resolveSeries(event, tiers?, pickedSessionId?)`
   (`lib/recurring.ts`) builds `SessionRailDay[]`, the selected session, that
   session's guests and `SessionCalendarData`; returns `null` without the signal.
   Unit-tested in `lib/recurring.test.ts`.
5. **Wire `EventDetailPage`** — *done.* The recurring branch renders
   `SessionCarousel` → that session's `SessionGuests` → `SessionWaitlist` (when a
   session is sold out), and a series is never also rendered as a festival.
   Guarded by `resolveSeries`. **Per-session ticket scoping is deferred** — offers
   are event-level until the products payload carries `date_allocations`; that is
   **#69** (a separate gap from #68).
6. **Render the dormant vocabulary** — *todo.* `OccurrenceStrip` / `SessionPill`
   on cards once sessions exist (they are present but unrendered today).

## Definition of done

- A live recurring event shows: `recurring` format tag, session rail, per-session
  guests, and a per-session waitlist when full. (Per-session ticket scope depends on
  a separate backend offer→session link.)
- No `recurring` is ever derived without the backend signal (ADR-0002 holds).
- `npx tsc --noEmit` clean · `npx vitest run` green · `pnpm build` OK.

## Tests

- Unit: the series view-model (`lib/recurring.test.ts`) — grouping, selected-session
  fallback, picked-session + per-session guests, cadence copy, empty/missing signal →
  no series. *(done)*
- Unit: `cardFormat` returns `recurring` only when the signal is present;
  `cardFormatLabel` maps each format. (`src/components/EventCard.test.ts`) *(done)*
- E2E: `e2e/recurring.spec.ts` — a route-mocked recurring event (the seed has none):
  the rail renders (not the festival track), picking a session swaps the guests, the
  calendar sheet confirms a session. *(done)*

## Comments

- 2026-10-15: filed from the web2 import as the queued follow-up to #68.
- 2026-10-15 (later): steps 3–5 landed (port + `lib/recurring` + inert page wiring)
  and step 1's read path exists against a **provisional** shape isolated to the
  adapter. Nothing renders on today's payload — `resolveSeries` returns `null`
  without the signal.
- 2026-10-15 (review pass): step 2 landed too — `cardFormat`/`cardFormatLabel` now
  render the "RECURRING" chip on all three card surfaces when the signal is
  present (`src/components/EventCard.test.ts`). The two-axis review also dropped a
  dead `eventDates[].seriesId` field (nothing read or wrote it), moved
  `selectedSoldOut` onto `SeriesView` so the page stops re-deriving it, replaced a
  painted avatar border with a shadow ring (ADR-0007), and documented that
  `ReminderToggle` is display-only until a backend reminder surface exists.
  Step 6 (`OccurrenceStrip`/`SessionPill`) is the only remaining item and stays
  gated on the shape, so the ticket keeps `needs-triage`.
