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
- `EventCard` / `EventInfoRail` / `FeaturedEventCard` — `cardFormat()` returns `recurring` when the backend signals a series, and `cardFormatLabel()` renders the "RECURRING" chip on all three card surfaces (unit-tested in `EventCard.test.ts`)
- `FeaturedEventCard` — format tag + range badge (321ffff)
- `InfoCards` — optional measured `sub` line on strip + grid (16031b6)
- `TicketTypeCard` — early-bird savings chip from `originalPriceMinor` (cafdcd6)
- `EventHero` — mobile poster mask-fade + light-mode radial title shade (6f0b2cb)
- `EventInfoRail` — `FormatTag` above the title for multi-day events (a9eb71a)
- `TransferTicketDialog` — "Verified by Digis" security note (d5f8ae3)
- `ScheduleSections` — multi-day festival day bar, day lineup running orders, day strip, festival ticket selector & pass upsell, alerts; `SessionGuests` wired under the day bar (per-day guests, or the full roster on "All days", via `guestsForDay`) and `EventEndedNotice` replaces the inline ended card (date-span label + Browse CTA; `eventDateSpanLabel`)
- `lib/festival` — multi-day date/day adapter and state resolver; prefers the backend per-date participant link (`EventArtist.eventDateId`) for the day roster, round-robins only as a fallback when the link is absent
- `lib/recurring` — recurring-series view-model (`resolveSeries`/`isSeries`): session rail days, selected session, that session's guests, monthly-calendar data, and cadence copy, all derived from `eventDates` + `lineup`; returns `null` with no series signal (#68)
- `ScheduleSections` recurring half — `SessionCarousel` ("Choose a date" rail), `SessionSwitcher` (pinned mini-bar), `SessionCalendarSheet` (monthly bottom sheet), `ShowtimePicker` (multi-showtime picker), `ReminderToggle`, `SessionWaitlist`. Wired on `EventDetailPage` behind `resolveSeries` (inert until #68); pinned by `e2e/recurring.spec.ts` (route-mocked)
- `TicketTypeCard` — pass `savings` chip beside the level chip (festival pass savings, from `originalPriceMinor`)
- `TimelineEntry` — no longer invents a time when `artist.time` is absent (was a hardcoded `6:00 PM`; ADR-0002)
- `lib/resale` — native `ticket_id` mapped from `SellerResaleListingWire` (closes BACKEND_GAPS #66)
- `lib/auth` + `AuthModal` — phone-OTP signup flow via `POST /auth/signup/request_otp`, `/phone_verifications/:id/verify`, and `/auth/signup` with `verification_token`
- `lib/admission` + `useCheckoutFlow` — G-41 mixed ticket + add-on admission selections with date-scoped add-on lines (closes BACKEND_GAPS #63)
- `lib/gifts` + `ClaimGiftPage` — recipient gift resolution (`/public/gift_purchases/:id/resolve`), claim (`/claim`), and buyer redelivery (`/orders/:order_id/gift_purchases`)
- `TicketsEmptyState` — animated colorful layered pass stack (violet, cyan, lime with Admit One, Gem, perforation notches, barcode, and feature badges)
- `lib/utils/scroll.ts` + `lib/utils/crossOriginGuard.ts` — safe cross-origin iframe scroll helpers and Firefox parent-frame event guard
- `lib/ui/artworkPalette.ts` + `SheetEnvironment` + the profile-sheet **artwork-driven environment** on `ArtistProfileSheet`, `OrganizerProfileSheet` and `VenueProfileSheet` — the export's sheet "background": a tinted base gradient (`bg0 → bg1`), the artwork blurred/desaturated behind the header (`blur(60px) saturate(1.6)`, `scale(1.4)`), and a radial colour glow. The export repeats this block inline at each sheet; here it is one component (`features/event-detail/components/SheetEnvironment.tsx`). The hue comes from the artwork's dominant colour (`useDominantColor`); the glass token follows the app theme, so contrast never depends on the artwork (a wild poster can't wreck legibility). No artwork → the export's brand-hue fallback verbatim, and no placeholder image (ADR-0002). The lime placeholder banners are gone — the tinted base is the banner now. `artworkPalette` currently ships only the environment tokens the sheets consume (`bg0/bg1/glow/glass`); the export's content tokens (`ink`/`muted`/`faint`/…) come back with the consumer that needs them. Unit-tested in `artworkPalette.test.ts` (2026-10-15)

## Skipped as noise (no action)

- `isDark`-as-prop contract — reverted (9b0398b → 701da0e); see
  `.scratch/web2-ui-import/isDark-as-prop-convention.md`.
- `border:` → inset-ring styling across pills/buttons — ours already on the glass system.
- `LocationSelector`, `Navigation`, `SearchBar`, `discovery/CategoryFilter`,
  `discovery/CountdownBadge`, `discovery/EmptyState` décor, `LineupSection`,
  `OrganizerSection`, `TicketSelector` (ours is a superset), `pages/EventDetailPage`
  (convention only), `TicketTypeCard` (ours is a backend-wired superset).
  _Exception: the artist/organizer profile-sheet **artwork environment** was skipped
  with them but is now ported — see Ported above._
- Resale unwired mockups (`ListingDetailSheet`, `SellerHub`, `WithdrawFundsSheet`) — `digis-web` uses backend-wired `BuyListingSheet`, `SellTicketSheet`, `PayoutMethodsSheet`, and live `src/lib/seller-payouts.ts`.

## Deferred / not ported

- `ProfilePage` — mock seller payouts deferred in favor of live backend seller payouts.
- `TransferTicketDialog` Phone/Email toggle — transfers are phone-only by policy.

## Blocked on backend (frontend alone can't close)

- **FilterPanel** "Invite only" / "Free RSVP" chips — needs per-offer audience; the list
  payload currently exposes only free/paid.

_(Venue photos + a real map pin used to sit here. They were a **seed** omission, not a
backend one: `GET /venues/:id` already served geo + media and the seed simply never
populated them — fixed 2026-10-15 (see the readiness row). What remains is frontend
wiring.)_

## Wire-up readiness (backend-blocked surfaces)

"Ready for wire-up" = when the backend ships the field, the UI lights up with no (or
a one-line) frontend change. Rows marked **build** are not readiness — they need new
components first. The table is the whole remaining frontend cost per surface.

| Surface | Backend owes | Frontend read today | Wire-up step |
|---|---|---|---|
| Event lineup (`LineupSection`) | `event_participants` in the public payload (#36) | adapter maps `event_participants` → `Event.lineup` (`events-adapter.ts`) | **None in principle** — the adapter already reads `event_participants`; if the backend names it differently (`participants`/`artists`), that's one adapter line |
| Festival day roster + per-day guests | `event_date_id` on each participant (#36 addendum) | adapter maps `event_date_id` → `EventArtist.eventDateId`; `resolveFestivalSchedule` groups by it, falls back to round-robin (`lib/festival.ts`) | **None** — lights up when the field appears (prepared 2026-10-15); a day the backend leaves empty stays empty (no invented roster) |
| Multi-day festival rendering (day bar, per-day scoping, pass vs day tiers) | **nothing** — the seed fixture now carries a genuine 3-date festival (`db/seeds/dev_demo.rb`, 2026-10-15) | renders live: `resolveFestivalSchedule` fires on `>1` date; the day bar, the day-scoped selector and the pass/day split all work off the live payload | **None** for the shell — the per-day *roster* waits on **#36**, the pass-vs-day *classification* on **#69** |
| Recurring badge on cards | recurrence / series signal (#68) | `FormatTag` accepts `recurring`; the adapter maps a series signal onto `Event.recurrence`/`isRecurring`; `cardFormat()` now returns `recurring` when `isSeries(event)` and `cardFormatLabel()` renders "RECURRING" on all three card surfaces; the dormant `OccurrenceStrip`/`SessionPill` remain unrendered | **None** — done (unit-tested in `EventCard.test.ts`); the occurrence strip stays reserved |
| Recurring carousel / per-session view | same (#68) | `resolveSeries` (`lib/recurring.ts`) builds the whole view-model; `SessionCarousel`/`SessionSwitcher`/`SessionCalendarSheet`/`SessionWaitlist` ported and wired on `EventDetailPage` | **None** — lights up when the payload carries `recurrence` (or `is_recurring`). Per-session *ticket* scope is a separate gap (**#69**) |
| Day-pass vs full-pass offers | `date_allocations` on the public products payload (**#69**) | `resolveFestivalSchedule` classifies a tier as a pass by **name** (`pass`/`full`/`weekend`) — invented (ADR-0002) | adapter reads the allocations; drop the name heuristic (small, once the field is served) |
| Upcoming-only session dates | an upcoming window / pagination on the public `event_dates` (**#70**) | every date is served; `lib/festival.ts#isDatePast` filters client-side | **None** — the client already filters; the wire-up drops the discard |
| Venue photos + real map pin | nothing — `GET /venues/:id` serves geo + media, and the seed now populates them (fixed 2026-10-15) | `VenueMap` takes a venue *name* only, uses the `venueCoords` stopgap, renders no photos | **frontend only** now: carry `venue.id` (already public on `event_dates[].venue`) into `VenueMap`, hydrate via `GET /venues/:id`, drop `venueCoords.ts` |
| `age_restriction` (Age card) | re-expose on the detail serializer (#53) | `EventInfoRail` + `EventDetailPage` already render `event.ageRestriction`; adapter maps nothing | 1 adapter line, **once the backend fixes the field location** (top-level vs `event_setting.config` is undecided) |
| `featured` (discovery sort / pick) | re-expose (#53) | `useEventFilter` / `DiscoveryPage` / `lib/events.ts` read `event.featured`; adapter maps nothing | 1 adapter line, same location caveat |
| `seat_map` (checkout step) | re-expose (#53) | `EventDetailPage` passes `event.seatMap` to checkout; adapter maps nothing | adapter line + confirm the wire shape matches `SeatMapConfig` |
| Discovery availability (`ticket_availability`) | the list endpoint must carry it (#54) | `eventAvailability` reads `Event.ticketAvailability`; `EventCard` uses it | **None** — lights up when the list serializer serves it |
| FilterPanel "Invite only" / "Free RSVP" | per-offer audience in the list payload | chips not built | **build** — the chips + the filter (audience is on the products endpoint, not the list) |

Principle: we prepare a read path only where the field name is documented **and** a
consumer already exists (the `event_date_id` adapter extension, 2026-10-15). Where the
wire location or shape is still the backend's choice (#53, #68) we document the one-line
step instead of inventing a shape.

## Parked / Policy
 
- **Recurring subsystem** (weekly series carousel, session calendar sheet, session waitlists): **UI ported + wired 2026-10-15**, inert until the backend serves a series signal (#68). `resolveSeries` (`lib/recurring.ts`) returns `null` with no signal, so `EventDetailPage` renders nothing and never invents a series (ADR-0002). The backend already has the engine (`Events::RecurrenceRule` + materialize job); only the public projection is missing. Ticket: `.scratch/recurring-ui/`. **The seed now carries a real materialised series** (`thursday-jazz-sessions`, 2026-10-15 — 7 Thursday sessions + a per-session guest), so the surface is exercisable the moment #68 lands; until then it renders as a multi-day event (the documented fallback). Guarded by `e2e/recurring.spec.ts` (route-mocked).
- **Reserved (unwired) scaffolding — kept deliberately, not wired:** `DaySwitcher`, `FestivalDayStrip` (superseded by `FestivalDayBar`), and the recurring-only vocabulary (`OccurrenceStrip`, `SessionPill`, `FormatTag` recurring branch, and `SessionSwitcher` — unused in the web2 export too). Dead in the export too; they stay as reserved surface until a backend surface justifies them. Do NOT wire them to invented data.
- **Wired this pass:** `SessionGuests` under the festival day bar (per-day guests / full roster on "All days" via `guestsForDay`) and `EventEndedNotice` for the ended state (`eventDateSpanLabel` + Browse CTA), plus the recurring session branch (`SessionCarousel` → that session's `SessionGuests` → `SessionWaitlist` when a session is sold out). Guarded by `e2e/festival.spec.ts` and `e2e/recurring.spec.ts` (both route-mocked — the festival spec asserts per-day rosters, blocked by #36; the series spec waits on #68). The live seed festival is covered separately by `e2e/festival-live.spec.ts`.
 
## Design-element audit (2026-10-15)

A full export→app comparison of *presentation/atmospheric* elements (backgrounds,
palettes, glows, masks, reflections, scrims), not logic. Findings:

- **Profile-sheet artwork environments** (artist / organizer / venue) — the same
  `ArtworkPalette`-driven
  environment in all three of the export's sheets; the app had none. **Ported** for
  all three (see Ported above). The artist sheet keeps the app's compact header
  rather than the export's 320 px hero band — the environment is the same either way.
- **Discovery `EmptyState` scene** (export `features/discovery/components/EmptyState.tsx`)
  — animated aurora blobs, a drifting starfield, a colour pass-stack and a
  CTA shine-sweep. The app's version is deliberately plainer: its docstring states
  "no aurora blobs, starfields, or glow shadows". **Left as-is** (intentional).
- **Achievement detail sheet + radial glow** (export `features/profile/pages/ProfilePage.tsx`) —
  each achievement opens a colour-themed bottom sheet with a halo glow; the app
  renders achievements as static, non-interactive rows. **Not ported** — needs a
  product decision (there is no achievement-detail data surface). Filed below.
- **Tickets empty-state card tint** (export `features/tickets/components/TicketsEmptyState.tsx`) —
  a warm sepia-tinted glass card vs the app's standard `glass()` surface. **Left
  as-is** (the app migrated to the shared glass token; the animated pass stack IS ported).

Everything else the export renders is either already ported, a superset in the app,
or an ADR-0007 boundary divergence (`border` → `boxShadow` ring / `glassEdge`).

## Verification

`npx tsc --noEmit` clean · `npx vitest run` 216/216 · `npx playwright test` 36/36 · `pnpm build` OK.
