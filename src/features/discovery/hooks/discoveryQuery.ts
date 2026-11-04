/**
 * Discovery → backend query mapping (BACKEND_GAPS #49).
 *
 * The discovery UI's filter state is translated into the `GET /public/events`
 * server-side query so filtering/sorting happens before pagination. Only the
 * params the backend actually models are emitted here; everything it does not
 * model — the availability tiering (featured-first, ended/sold-out-last), the
 * "Most available" order, and the sub-2-char search — stays client-side (see
 * `useEventFilter`).
 *
 * The backend's price filter is "the event has *any* active public ticket price
 * in the window", so the frontend adopts that shape rather than its old
 * min-tier heuristic.
 */

import type { EventListSort, PublicEventQuery } from "@/lib/events";
import type { Event } from "@/types";
import {
  PRICE_RANGE_WINDOWS,
  type EventAccessFilter,
  type EventPriceFilter,
  type EventSortBy,
  type PriceWindow,
} from "./useEventFilter";

/** The app is ETB-only (`Event["currency"]`), and the backend requires a
 *  currency alongside any price bound or price sort. */
export const DISCOVERY_CURRENCY: Event["currency"] = "ETB";

/** Price window for the multi-select free/ticketed access chips. */
function accessWindow(types: EventAccessFilter[]): PriceWindow | null {
  const free = types.includes("free");
  const ticketed = types.includes("ticketed");
  if (free && ticketed) return null; // both on = no constraint
  if (free) return { min: 0, max: 0 };
  if (ticketed) return { min: 1, max: Infinity };
  return null; // none selected = no constraint
}

/** Intersect two windows; `null` when they cannot overlap. */
function intersect(a: PriceWindow, b: PriceWindow): PriceWindow | null {
  const min = Math.max(a.min, b.min);
  const max = Math.min(a.max, b.max);
  return min > max ? null : { min, max };
}

/**
 * Fold the access and price-range controls into one window.
 * `undefined` = no constraint; `null` = the controls contradict (nothing can
 * match, and the backend would 422 an inverted range).
 */
function priceBounds(
  types: EventAccessFilter[],
  range: EventPriceFilter | null,
): PriceWindow | null | undefined {
  const windows = [
    accessWindow(types),
    range ? PRICE_RANGE_WINDOWS[range] : null,
  ].filter((w): w is PriceWindow => w !== null);
  if (windows.length === 0) return undefined;

  let result = windows[0];
  for (const window of windows.slice(1)) {
    const next = intersect(result, window);
    if (!next) return null;
    result = next;
  }
  return result;
}

/** Client sort → backend sort. `available` has no backend equivalent. */
const SORT_MAP: Record<EventSortBy, EventListSort | undefined> = {
  soonest: "soonest",
  "price-low": "price_asc",
  "price-high": "price_desc",
  available: undefined,
};

export interface DiscoveryFilterState {
  onlyFeatured?: boolean;
  /** Free-text search as typed (only ≥2 chars reach the server). */
  q: string;
  /** Backend category **slug** for the selected pill (`undefined` for "All"). */
  categorySlug?: string;
  sortBy: EventSortBy;
  eventTypes: EventAccessFilter[];
  priceRange: EventPriceFilter | null;
}

/**
 * Build the `GET /public/events` query for the discovery filter state.
 *
 * Returns `null` when the price controls contradict (e.g. "Free" + "ETB 3K+").
 * No server query can express an empty window, and the backend rejects an
 * inverted range with a 422 — so the caller renders an honest empty grid
 * instead of sending one.
 */
export function discoveryServerQuery(
  state: DiscoveryFilterState,
): PublicEventQuery | null {
  const query: PublicEventQuery = {};
  if (state.onlyFeatured) query.featured = true;

  const search = state.q.trim();
  if (search.length >= 2) query.q = search;

  if (state.categorySlug) query.category = state.categorySlug;

  const bounds = priceBounds(state.eventTypes, state.priceRange);
  if (bounds === null) return null;
  if (bounds) {
    query.minPriceMinor = bounds.min;
    if (Number.isFinite(bounds.max)) query.maxPriceMinor = bounds.max;
  }

  const sort = SORT_MAP[state.sortBy];
  if (sort) query.sort = sort;

  // Any price bound or price sort must carry the currency (else 422).
  const priceSort = sort === "price_asc" || sort === "price_desc";
  if (bounds || priceSort) query.currency = DISCOVERY_CURRENCY;

  return query;
}
