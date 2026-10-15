# Wire the venue detail onto `GET /venues/:id` (drop the coords stopgap)

- **Status:** `ready-for-agent` — the **seed** now carries venue geo + media
  (fixed 2026-10-15, backend `chore(dev)` `ec36172d`), so this reads real data.
- **Blocked by:** nothing. This is **not a backend gap** — the API always served
  it; the seed was empty. See `docs/handoffs/DATA_INTEGRITY_AUDIT.md` → "Seed-side
  fixes (2026-10-15)".
- **Related:** `docs/handoffs/web2-ui-import.md` → "Wire-up readiness" (the
  *Venue photos + real map pin* row); `docs/BACKEND_GAPS.md` **#51** (the venue
  sheet's fabricated followers/amenities/history — recorded as "still to remove").

## Context

`VenueMap` / `VenueProfileSheet`
(`src/features/event-detail/components/VenueMap.tsx`) receive a venue **name
string** only and derive coordinates from a hardcoded name→coords map
(`src/lib/utils/venueCoords.ts`) that falls back to one Addis point — so every
unmapped venue pins to the same spot. `VenueProfileSheet` then renders a large
amount of **fabricated** content: a hardcoded upcoming/past event list, followers
`4200`, capacity `1200`, events `47`, a canned About paragraph, a fixed amenities
grid, and link-less social buttons.

Public `GET /venues/:id` now returns real `latitude`/`longitude`, `profile_url`,
`gallery_urls`, `amenities`, `social_links`, `capacity`, `follower_count` and
`description` for every seed venue, and `event_dates[].venue.id` is already in the
public event payload.

## Steps

1. Carry `venue.id` (plus name/city) from `event_dates[].venue` through the adapter
   into `Event` (`src/lib/events-adapter.ts`) instead of only the name string.
2. Add a public `fetchVenue(id)` (typed `VenueDetail`) — likely `src/lib/venues.ts`
   — and hydrate `VenueMap` / `VenueProfileSheet`. Show loading + `isError` with a
   retry (the feedback rule); never a silent fallback to fake data.
3. Drop `src/lib/utils/venueCoords.ts`. Map bbox / marker / directions come from the
   served coords. When a venue genuinely has no coords, render the map **absent**
   with the address (ADR-0002) — do not fall back to a city centroid.
4. Render the served `profile_url` as the venue avatar and `gallery_urls` as the
   photos strip; delete the "carries no images" placeholder comment at
   `VenueMap.tsx:459`.
5. **Remove the fabrication:** followers / capacity / events count / About / amenities
   must come from the payload or not render. The per-venue event history needs
   #49's followable-events endpoint — keep that list absent until then (file a gap
   if it's wanted as a product surface).

## Verification

- Unit: the adapter maps `venue.id` + coords; `VenueMap` renders the map from props.
- e2e: `event-detail.spec.ts` asserts a real directions link + a venue photo for a
  seeded event, and that **no mock/unsplash** venue image renders.
