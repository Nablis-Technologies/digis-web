# Wire the venue detail onto `GET /venues/:id` (drop the coords stopgap)

- **Status:** `ready-for-agent` — **step 5's de-fabrication landed 2026-10-17**; the
  wire-up (steps 1–4) is still owed, so this stays open. The **seed** already carries
  venue geo + media (fixed 2026-10-15, backend `chore(dev)` `ec36172d`), so the
  remaining steps read real data.
- **Blocked by:** nothing. This is **not a backend gap** — the API always served
  it; the seed was empty. See `docs/handoffs/DATA_INTEGRITY_AUDIT.md` → "Seed-side
  fixes (2026-10-15)".
- **Related:** `docs/handoffs/web2-ui-import.md` → "Wire-up readiness" (the
  *Venue photos + real map pin* row); `docs/NOT_BACKEND_GAPS.md` **#51 (venue stats
  half)** — the venue sheet's fabricated followers/amenities are frontend work to
  remove (the backend serves the real data on `GET /venues/:id`); reclassified
  2026-10-16, no longer a backend gap.

## Done 2026-10-17 — step 5, the fabrication is gone

`VenueProfileSheet` now renders only what the event payload's venue **name** can
honestly support: the name, the stopgap address + coords/Directions link, the
avatar initials, Follow and Share. Removed outright: the fake `BadgeCheck`
"verified" tick, the invented stats (`47` events / `4200` followers / `1200`
capacity), the canned About paragraph + Read more, the fixed amenities grid, the
link-less social buttons, the photo-strip placeholder, and both invented event
lists (6 events). Where they sat there is a comment naming what is absent and why.
Shared derivation (name/initials/address/map+directions links) is now one
`venueProfile()` helper; the sheet is `role="dialog"`-labelled and its close button
is named. Guarded by `e2e/event-detail.spec.ts` → "venue sheet invents nothing"
(scoped to the dialog: honest content present, fabricated labels absent).

**Still owed (steps 1–4):** carry `venue.id` from `event_dates[].venue` through the
adapter; a public `fetchVenue(id)` typed against `GET /venues/:id`; hydrate the
sheet (description, `profile_url`, `gallery_urls`, `amenities`, `capacity`,
`social_links`, `follower_count`); drop `src/lib/utils/venueCoords.ts` for the
served coords (map absent when a venue has none — no city-centroid fallback).

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
   photos strip. (The "carries no images" placeholder comment is already gone —
   step 5 removed it 2026-10-17.)
5. **Remove the fabrication — DONE 2026-10-17 (see above).** followers / capacity /
   events count / About / amenities come from the payload or do not render. The
   per-venue event history needs #49's followable-events endpoint — keep that list
   absent until then (file a gap if it's wanted as a product surface).

## Verification

- **Landed 2026-10-17 (de-fabrication):** `e2e/event-detail.spec.ts` → "venue sheet
  invents nothing" — opens the sheet on a seeded event and asserts, scoped to the
  dialog, that the honest content (name, Directions, Follow Venue, Share) renders
  and the invented labels (Events / Followers / Capacity / About / Amenities /
  Socials / the sample event names) are absent.
- **Still owed (steps 1–4):** unit — the adapter maps `venue.id` + coords;
  `VenueMap` renders the map from props. e2e — a real directions link + a served
  venue photo for a seeded event, and no mock/unsplash venue image renders.
