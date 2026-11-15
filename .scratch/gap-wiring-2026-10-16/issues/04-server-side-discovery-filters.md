# 04 — Consume the remaining server-side discovery filters (#49)

**Status:** DONE 2026-10-16f (frontend-only)
**Depends on:** nothing (backend params live-verified 2026-10-16e)

> **Done:** `discoveryServerQuery` (`src/features/discovery/hooks/discoveryQuery.ts`)
> maps the discovery state (`q`, category slug, price window + currency, sort) onto
> `eventsModule.fetchAll(query)`; the client pipeline keeps only the availability
> tiering + `available` sort. Contradictory price controls → honest empty grid.
> Covered by `discoveryQuery.test.ts` + `e2e/discovery-filters.spec.ts`. `city` /
> `date_*` / followable ids have no UI to drive them yet (see the ticket notes).

## Context

The 2026-10-16 backend release resolved **#49**: `GET /public/events` now supports
`q`, `category` (slug), `city`, `date_from`, `date_to`, `organization_id`,
`venue_id`, `artist_id`, `sort` (`newest|soonest|price_asc|price_desc`), `currency`
(required for price sorts), `min_price_minor`, `max_price_minor`. Invalid input →
**422 `invalid_public_event_filter`**.

The frontend wired **`q`** (server-side search, debounced) plus the module API
(`eventsModule.fetchAll(query)` sends every param and drains every page). The rest
of the discovery pipeline still filters/sorts **client-side** over the fully-paged
set — correct today (33 events) but it does not scale past the backend's
`per_page` cap and it duplicates server logic.

## Work

1. Move category / price-range / free-vs-ticketed / date filters onto the query in
   `DiscoveryPage`, keyed by `eventsModule.keys.list(query)` so each filter set
   caches independently.
2. Keep the client pipeline only for what the backend does not model: the
   availability tiering (featured-first, ended-last, sold-out-last) and the
   `available` sort.
3. Category filtering needs the **slug** (the backend filters by slug). Resolve
   the pill's display name → slug from `fetchCategories` / the loaded events
   before sending `category`.
4. Source the category pills from a stable (unfiltered) set so selecting a
   category does not collapse the pill list.
5. Add a test that the discovery query is built from the filter state, and an e2e
   that selecting a category narrows the grid via the server.

## Notes

- Do **not** send `q` below 2 chars (422). Keep the sub-threshold client filter.
- `currency` must accompany a `price_*` sort (send `ETB`).
- `city` matches the lowercase exact value ("addis ababa", not "addis").
- **Behaviour change (adopted from the backend):** the server price filter is
  "the event has *any* **public**-audience active ticket price in the window", so
  the old client min-tier heuristic is gone. Live effect: events with
  `ticket_availability: "no_public_tickets"` (null `price_from_minor` — currently
  `origins-2`, `event`, `psy-addis-saltland`) no longer match **Free**; they are
  gate/access-code events, not free public ones. Deliberate — the backend is the
  money/availability source of truth (AGENTS.md).
- Work 1 also lists a **date** filter; the discovery UI has no date control, so it
  is unwired (as are `city`/`organization_id`/`venue_id`/`artist_id` — no UI drives
  them; the `eventsModule.fetchAll(query)` plumbing already carries all of them).
