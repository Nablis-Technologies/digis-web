# 02 — Browse + detail read path on live API

Status: implemented — verified unit/typecheck/build (live drill in 08)

Blocked by: (none — parallel with 01)

## Scope

Replace the mock bodies behind the resale module's listing reads with real
authenticated `GET /resale_listings` (and detail) calls. Map the nested
backend shape (event, product, ticket type, event dates with venue) to the
card display fields; date/time from the first event date, venue from its
nested venue, image from the existing event-cover fetch with placeholder
fallback. My-listings shows active own listings only. Remove everything with
no backend source: seller name/rating, verified badges, verified/type
filters needing seller metadata, own sold/cancelled history, fabricated
event wrappers, the hardcoded fee constant, and the in-memory seed store.

## Acceptance

- Browse renders live listings with correct event, date, venue, price (Money).
- Detail renders dates, venue, admissions, fee terms from the live shape.
- Unsupported UI is gone, not disabled-behind-a-flag.
- Unit tests prove mapping/fallbacks against backend-shaped payloads.

## Comments

- Reads are live: `fetchListings` → `GET resale_listings` (+ cover
  enrichment via the events module, local name fallback, '' when neither
  resolves); new `fetchListingDetail` → `GET resale_listings/:id` (maps the
  seller acquisition value when the seller view serves it);
  `fetchMyListings` filters index rows to ids captured at creation
  (session-persisted per user) — the browse endpoint serves no seller
  identifier, so cross-session own listings are a flagged backend gap.
- Cut: seller name/rating, verified badge + filter, face-value filters,
  own sold/cancelled history, fabricated event wrapper (real event UUIDs
  now), mock seed store + `initialListings`. Type filter is dynamic from
  live type names. Face/delta render only with a seller view.
- Image-less rows render gradient placeholders (card tile + detail hero).
- Writes (create/cancel/purchase) stay mock behind the slimmed store until
  03/04/05; `RESALE_FEE_BPS` stays for the sell sheet until 03.
- Verified: resale suite 10/10, full vitest 22/22, `tsc` clean, `vite
  build` ok (pre-existing chunk-size warning only).
