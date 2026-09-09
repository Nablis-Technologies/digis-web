import { useMemo } from "react";
import type { Event } from "@/types";
import { eventEnded } from "@/lib/eventDates";
import { eventSoldOut } from "@/lib/eventAvailability";

export type EventSortBy = "soonest" | "price-low" | "price-high" | "available";
export type EventAccessFilter = "free-rsvp" | "ticketed" | "invite-only";
export type EventPriceFilter = "free" | "under-1000" | "1000-3000" | "3000-plus";

export interface EventFilterOptions {
  searchQuery: string;
  selectedCategory: string;
  sortBy: EventSortBy;
  onlyAvailable: boolean;
  eventTypes: EventAccessFilter[];
  priceRange: EventPriceFilter | null;
}

/**
 * Pure filter + sort pipeline (extracted so it is unit-testable without a
 * renderer). Ordering tiers, best to worst:
 *   1. live + available events
 *   2. sold-out events (never lead the list)
 *   3. ended events (always last)
 * Featured wins within a tier; the chosen sort applies inside each group.
 */
export function filterAndSortEvents(events: Event[], options: EventFilterOptions): Event[] {
  const { searchQuery, selectedCategory, sortBy, onlyAvailable, eventTypes, priceRange } = options;

  return events
    .filter((event) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        event.name.toLowerCase().includes(q) ||
        event.city.toLowerCase().includes(q) ||
        event.venue.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === "All" ||
        event.category === selectedCategory;
      // Availability: only exclude when the backend explicitly reports zero
      // left (or flags soldOut) — a missing count is not "sold out". An
      // ended event is never available either.
      const matchesAvailable =
        !onlyAvailable || (!eventEnded(event) && !eventSoldOut(event));
      const eventAccess: EventAccessFilter = event.eventType === "rsvp"
        ? "free-rsvp"
        : event.eventType === "inviteOnly"
          ? "invite-only"
          : "ticketed";
      const matchesAccess = eventTypes.length === 0 || eventTypes.includes(eventAccess);
      const matchesPrice = !priceRange || (
        priceRange === "free" ? event.priceFromMinor === 0
          : priceRange === "under-1000" ? event.priceFromMinor > 0 && event.priceFromMinor < 100000
          : priceRange === "1000-3000" ? event.priceFromMinor >= 100000 && event.priceFromMinor <= 300000
          : event.priceFromMinor > 300000
      );
      return matchesSearch && matchesCategory && matchesAvailable && matchesAccess && matchesPrice;
    })
    .sort((a, b) => {
      // Ended events never lead the list — they sort after every live event,
      // regardless of the chosen sort or their featured flag.
      if (eventEnded(a) !== eventEnded(b)) return eventEnded(a) ? 1 : -1;
      // Sold-out events never lead either: available events sort first, sold
      // out second (before ended), featured ordering applies within each tier.
      if (eventSoldOut(a) !== eventSoldOut(b)) return eventSoldOut(a) ? 1 : -1;
      // Featured events take precedence in the list; the chosen sort applies within groups.
      if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
      if (sortBy === "price-low")
        return a.priceFromMinor - b.priceFromMinor;
      if (sortBy === "price-high")
        return b.priceFromMinor - a.priceFromMinor;
      if (sortBy === "available") {
        const leftA = typeof a.ticketsLeft === "number" ? a.ticketsLeft : -1;
        const leftB = typeof b.ticketsLeft === "number" ? b.ticketsLeft : -1;
        return leftB - leftA;
      }
      return (
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });
}

export function useEventFilter(events: Event[], options: EventFilterOptions): Event[] {
  const { searchQuery, selectedCategory, sortBy, onlyAvailable, eventTypes, priceRange } = options;

  return useMemo(
    () => filterAndSortEvents(events, options),
    [events, eventTypes, onlyAvailable, priceRange, searchQuery, selectedCategory, sortBy],
  );
}