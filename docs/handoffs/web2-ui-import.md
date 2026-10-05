# web2-ui import — status

Branch `import/web2-ui` (off `feat/frontend-backend-integration@95f37e7`). Frontend-only
port of the substantive UI from the `digis-web2` Figma Make export. The two repos share no
history — the export is a parallel Figma Make output — so everything is a hand-port, not a
merge. `DESIGN.md` is the design authority; boundaries follow
`docs/adr/0007-boundaries-are-light-not-strokes.md`.

## Ported

- Icons → `@thesvg/react` (8fcfea5); `docs/GLASS_INDEX.md` (145e39a)
- `EventFormatBadges` — date-range / format / session / occurrence badges (5404917)
- `EventCard` — format chip + multi-day range badge + day-passes label (4cfc0d9)
- `FeaturedEventCard` — format tag + range badge (321ffff)
- `InfoCards` — optional measured `sub` line on strip + grid (16031b6)
- `TicketTypeCard` — early-bird savings chip from `originalPriceMinor` (cafdcd6)
- `EventHero` — mobile poster mask-fade + light-mode radial title shade (6f0b2cb)
- `EventInfoRail` — `FormatTag` above the title for multi-day events (a9eb71a)
- `TransferTicketDialog` — "Verified by Digis" security note (d5f8ae3)

## Skipped as noise (no action)

- `isDark`-as-prop contract — reverted (9b0398b → 701da0e); see
  `.scratch/web2-ui-import/isDark-as-prop-convention.md`.
- `border:` → inset-ring styling across pills/buttons — ours already on the glass system.
- `LocationSelector`, `Navigation`, `SearchBar`, `discovery/CategoryFilter`,
  `discovery/CountdownBadge`, `discovery/EmptyState` décor, `LineupSection`,
  `OrganizerSection`, `TicketSelector` (ours is a superset), `pages/EventDetailPage`
  (convention only), `TicketTypeCard` (ours is a backend-wired superset).

## Deferred / not ported

- `FeaturedMagazine`, `TopBar` (layout-only)
- Resale (`ListingDetailSheet`, `SellTicketSheet`), `ProfilePage`, `TicketsEmptyState`
- `lib/utils/scroll.ts`, `lib/utils/crossOriginGuard.ts`
- `TransferTicketDialog` Phone/Email toggle — transfers are phone-only by policy

## Blocked on backend (frontend alone can't close)

- **FilterPanel** "Invite only" / "Free RSVP" chips — needs per-offer audience; the list
  payload currently exposes only free/paid.
- **VenueMap** photos carousel (and venue image avatar) — needs images in `venue_summary`.

## Large — parked

**`ScheduleSections`** (festival multi-day + recurring: per-day running orders/agenda,
festival passes, session carousel / calendar / reminders, waitlist, ended notice). It depends
on data the backend does not serve — no per-day lineup/agenda, and no recurrence (ADR-0002) —
and `EventDetailPage` has no format branching to host it. Porting it now would build dead UI.
Revisit once the backend exposes festival/recurring data.

## Verification (at d5f8ae3)

`npx tsc --noEmit` clean · `npx vitest run` 158/158 · `pnpm build` OK.
