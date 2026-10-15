# Artist profile sheet fabricates 3 upcoming + 3 past events

- **Status:** `needs-triage` — clear ADR-0002 violation, but the fix changes what the
  sheet shows until a real per-artist event surface exists. Decide: remove now, or
  keep as a labelled design placeholder.
- **Not a backend gap:** the sheet is fabricating client-side; there is no field it
  should be reading instead. (A real "events featuring this artist" surface would
  need a backend endpoint — file that only if the product wants it, cf. #49/#51.)
- **Found:** 2026-10-15, during the artwork-environment port
  (`docs/handoffs/web2-ui-import.md` → "Design-element audit").

## Context

`ArtistProfileSheet` (`src/features/event-detail/components/LineupSection.tsx:441-452`)
falls back to **hardcoded sample events** when the artist payload carries none:

```ts
const upcoming = (Array.isArray(artist.upcomingEvents) && artist.upcomingEvents.length > 0)
  ? artist.upcomingEvents
  : [
      { name: 'Addis Vibes Festival', date: 'Mar 15, 2026', venue: 'Millennium Hall', city: 'Addis Ababa', gradient: '…' },
      { name: 'Skyline Sessions Vol. 4', date: 'Apr 02, 2026', venue: 'Sheraton Addis', city: 'Addis Ababa', gradient: '…' },
      …
    ];
```

The sheet also shows "Upcoming 3 / Past 3" tabs computed from those arrays, so a
fabricated list *looks like* real artist history. This breaks two house rules:
ADR-0002 (never invent) and "absence must never look like content". The
**organizer** sheet does it correctly (`OrganizerSection.tsx:752-753` → `[]`), and
the export itself has no fallback (it renders `artist.upcomingEvents` as given).

Not visible live today — a lineup needs `#36` (`event_participants`), so the sheet
only renders from a route-mocked spec. It becomes live the moment #36 lands.

## Suggested steps

1. Drop both hardcoded fallback arrays; `upcoming` / `past` default to `[]`.
2. Confirm the empty state still reads well (the tab counts go to 0; the existing
   "No upcoming events to show." copy carries it).
3. If the design wants sample data for the `ui-preview` page, put it in the preview
   fixture (`UIPreviewPage.tsx`), not in the shared component — the preview page
   already owns `PREVIEW_LINEUP`.

## Verification

- Unit: `resolveLineup` / the sheet renders no rows for an artist with no events and
  does not emit the sample names.
- Grep: no `Addis Vibes Festival` / `Skyline Sessions` strings in `src/features`.
