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
- `ScheduleSections` — multi-day festival day bar, day lineup running orders, day strip, festival ticket selector & pass upsell, alerts; `SessionGuests` wired under the day bar (per-day guests, or the full roster on "All days", via `guestsForDay`) and `EventEndedNotice` replaces the inline ended card (date-span label + Browse CTA; `eventDateSpanLabel`)
- `lib/festival` — multi-day date/day adapter and state resolver; prefers the backend per-date participant link (`EventArtist.eventDateId`) for the day roster, round-robins only as a fallback when the link is absent
- `lib/resale` — native `ticket_id` mapped from `SellerResaleListingWire` (closes BACKEND_GAPS #66)
- `lib/auth` + `AuthModal` — phone-OTP signup flow via `POST /auth/signup/request_otp`, `/phone_verifications/:id/verify`, and `/auth/signup` with `verification_token`
- `lib/admission` + `useCheckoutFlow` — G-41 mixed ticket + add-on admission selections with date-scoped add-on lines (closes BACKEND_GAPS #63)
- `lib/gifts` + `ClaimGiftPage` — recipient gift resolution (`/public/gift_purchases/:id/resolve`), claim (`/claim`), and buyer redelivery (`/orders/:order_id/gift_purchases`)
- `TicketsEmptyState` — animated colorful layered pass stack (violet, cyan, lime with Admit One, Gem, perforation notches, barcode, and feature badges)
- `lib/utils/scroll.ts` + `lib/utils/crossOriginGuard.ts` — safe cross-origin iframe scroll helpers and Firefox parent-frame event guard

## Skipped as noise (no action)

- `isDark`-as-prop contract — reverted (9b0398b → 701da0e); see
  `.scratch/web2-ui-import/isDark-as-prop-convention.md`.
- `border:` → inset-ring styling across pills/buttons — ours already on the glass system.
- `LocationSelector`, `Navigation`, `SearchBar`, `discovery/CategoryFilter`,
  `discovery/CountdownBadge`, `discovery/EmptyState` décor, `LineupSection`,
  `OrganizerSection`, `TicketSelector` (ours is a superset), `pages/EventDetailPage`
  (convention only), `TicketTypeCard` (ours is a backend-wired superset).
- Resale unwired mockups (`ListingDetailSheet`, `SellerHub`, `WithdrawFundsSheet`) — `digis-web` uses backend-wired `BuyListingSheet`, `SellTicketSheet`, `PayoutMethodsSheet`, and live `src/lib/seller-payouts.ts`.

## Deferred / not ported

- `ProfilePage` — mock seller payouts deferred in favor of live backend seller payouts.
- `TransferTicketDialog` Phone/Email toggle — transfers are phone-only by policy.

## Blocked on backend (frontend alone can't close)

- **FilterPanel** "Invite only" / "Free RSVP" chips — needs per-offer audience; the list
  payload currently exposes only free/paid.
- **VenueMap** photos carousel (and venue image avatar) — needs images in `venue_summary`.

## Wire-up readiness (backend-blocked surfaces)

"Ready for wire-up" = when the backend ships the field, the UI lights up with no (or
a one-line) frontend change. Rows marked **build** are not readiness — they need new
components first. The table is the whole remaining frontend cost per surface.

| Surface | Backend owes | Frontend read today | Wire-up step |
|---|---|---|---|
| Event lineup (`LineupSection`) | `event_participants` in the public payload (#36) | adapter maps `event_participants` → `Event.lineup` (`events-adapter.ts`) | **None in principle** — the adapter already reads `event_participants`; if the backend names it differently (`participants`/`artists`), that's one adapter line |
| Festival day roster + per-day guests | `event_date_id` on each participant (#36 addendum) | adapter maps `event_date_id` → `EventArtist.eventDateId`; `resolveFestivalSchedule` groups by it, falls back to round-robin (`lib/festival.ts`) | **None** — lights up when the field appears (prepared 2026-10-15); a day the backend leaves empty stays empty (no invented roster) |
| Recurring badge on cards | recurrence / series signal (#68) | `FormatTag` already accepts `recurring`; `cardFormat()` only sees `eventDates` | add the recurrence field to `Event`, map it, return the format from `cardFormat()` — **shape unconfirmed, do not guess** |
| Recurring carousel / per-session view | same (#68) | `OccurrenceStrip`/`SessionPill` present but unrendered; `SessionCarousel`/`SessionWaitlist` **not ported** | **build** — port the two components, then wire |
| Venue photos + real map pin | seed venue lat/lng + media (seed task, #36) | `VenueMap` takes a venue *name* only, uses the `venueCoords` stopgap, renders no photos | adapter must carry `venue.id` (already public on `event_dates[].venue`) + `VenueMap` hydrates via `GET /venues/:id` |
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
 
- **Recurring subsystem** (weekly series carousel, session calendar sheet, session waitlists): parked per ADR-0002 — the backend **has** a recurrence engine (`Events::RecurrenceRule` + materialize job), but the public event payload exposes **no recurrence/series signal** (#68), so wiring it would mean inventing the series. The multi-day festival half of `ScheduleSections` is fully imported and active on `EventDetailPage`.
- **Reserved (unwired) scaffolding — kept deliberately, not wired:** `DaySwitcher`, `FestivalDayStrip` (superseded by `FestivalDayBar`), and the recurring-only vocabulary (`OccurrenceStrip`, `SessionPill`, `FormatTag` recurring branch, `SessionGuests`/`SessionWaitlist` session variants). These are dead in the web2 export too; they stay as reserved surface until a backend surface justifies them. Do NOT wire them to invented data.
- **Wired this pass:** `SessionGuests` under the festival day bar (per-day guests / full roster on "All days" via `guestsForDay`) and `EventEndedNotice` for the ended state (`eventDateSpanLabel` + Browse CTA). Guarded by `e2e/festival.spec.ts` (route-mocked — the seed has no multi-day event).
 
## Verification
 
`npx tsc --noEmit` clean · `npx vitest run` 197/197 · `npx playwright test` 31/31 · `pnpm build` OK.
