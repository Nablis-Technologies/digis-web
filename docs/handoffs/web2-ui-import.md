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
- `lib/festival` — multi-day date/day adapter and state resolver
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

## Parked / Policy
 
- **Recurring subsystem** (weekly series carousel, session calendar sheet, session waitlists): parked per ADR-0002 (no recurring engine on backend). The multi-day festival half of `ScheduleSections` is now fully imported and active on `EventDetailPage`.
- **Reserved (unwired) scaffolding — kept deliberately, not wired:** `DaySwitcher`, `FestivalDayStrip` (superseded by `FestivalDayBar`), and the recurring-only vocabulary (`OccurrenceStrip`, `SessionPill`, `FormatTag` recurring branch, `SessionGuests`/`SessionWaitlist` session variants). These are dead in the web2 export too; they stay as reserved surface until a backend surface justifies them. Do NOT wire them to invented data.
- **Wired this pass:** `SessionGuests` under the festival day bar (per-day guests / full roster on "All days" via `guestsForDay`) and `EventEndedNotice` for the ended state (`eventDateSpanLabel` + Browse CTA). Guarded by `e2e/festival.spec.ts` (route-mocked — the seed has no multi-day event).
 
## Verification
 
`npx tsc --noEmit` clean · `npx vitest run` 192/192 · `npx playwright test` 31/31 · `pnpm build` OK.
