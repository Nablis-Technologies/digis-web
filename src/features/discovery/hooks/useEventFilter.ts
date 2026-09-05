import { useMemo } from "react";
import type { Event } from "@/types";

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


export function useEventFilter(events: Event[], options: EventFilterOptions): Event[] {
  const { searchQuery, selectedCategory, sortBy, onlyAvailable, eventTypes, priceRange } = options;

  return useMemo(() => {
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
        // left (or flags soldOut) — a missing count is not "sold out".
        const ticketsLeft = typeof event.ticketsLeft === "number" ? event.ticketsLeft : null;
        const matchesAvailable =
          !onlyAvailable || (event.soldOut !== true && ticketsLeft !== 0);
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
  }, [events, eventTypes, onlyAvailable, priceRange, searchQuery, selectedCategory, sortBy]);
}
