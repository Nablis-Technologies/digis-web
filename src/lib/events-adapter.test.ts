import { describe, expect, it } from "vitest";

import { backendEventToEvent, type BackendEvent } from "@/lib/events-adapter";

function wire(patch: Partial<BackendEvent> = {}): BackendEvent {
  return {
    id: "evt-1",
    slug: "on-on",
    title: "On and On",
    currency: "ETB",
    price_from_minor: 10000,
    ...patch,
  };
}

describe("backendEventToEvent", () => {
  it("maps the core event fields", () => {
    const ev = backendEventToEvent(
      wire({
        description: "A night of sound",
        categories: [{ id: "c1", name: "Music" }],
        event_dates: [
          { id: "d1", starts_at: "2026-10-18T20:00:00.000Z", venue: { id: "v1", name: "The Hub", city: "Addis Ababa" } },
        ],
        organization: { id: "o1", name: "Digis", slug: "digis" },
      }),
    );

    expect(ev.name).toBe("On and On");
    expect(ev.slug).toBe("on-on");
    expect(ev.description).toBe("A night of sound");
    expect(ev.category).toBe("Music");
    expect(ev.venue).toBe("The Hub");
    expect(ev.venueId).toBe("v1");
    expect(ev.city).toBe("Addis Ababa");
    expect(ev.organizer).toBe("Digis");
    expect(ev.organizerId).toBe("o1");
    expect(ev.organizerSlug).toBe("digis");
    expect(ev.priceFromMinor).toBe(10000);
    expect(ev.currency).toBe("ETB");
    expect(ev.eventDates?.[0]?.id).toBe("d1");
  });

  it("maps co-organizers from the event_organizations association", () => {
    const ev = backendEventToEvent(
      wire({
        event_organizations: [
          { role: "host", organization: { id: "o1", name: "Bole Events", slug: "bole-events" } },
          { role: "co-host", organization: { id: "o2", name: "Habesha Sound", slug: "habesha-sound" } },
          { role: "co-host", organization: null },
        ],
      }),
    );

    expect(ev.organizers).toEqual([
      { id: "o1", name: "Bole Events" },
      { id: "o2", name: "Habesha Sound" },
    ]);
  });

  it("does not invent availability/rating/mode fields — the projection is gone", () => {
    const ev = backendEventToEvent(
      wire({ event_setting: { config: { featured: true, sold_out: true, event_type: "rsvp", rating: 4.5 } } }),
    );

    // The 2026-09-30 release dropped these from the public payload; the adapter
    // must not surface them (BACKEND_GAPS #53).
    expect(ev.featured).toBeUndefined();
    expect(ev.soldOut).toBeUndefined();
    expect(ev.rating).toBeUndefined();
    expect("ticketsLeft" in ev).toBe(false);
    expect("eventType" in ev).toBe(false);
  });

  it("defaults priceFromMinor to 0 only when the wire omits it", () => {
    const ev = backendEventToEvent(wire({ price_from_minor: undefined }));
    expect(ev.priceFromMinor).toBe(0);
  });

  it("maps the G-44 lifecycle + availability states when served", () => {
    const ev = backendEventToEvent(
      wire({ event_lifecycle: "ongoing", ticket_availability: "sold_out" }),
    );
    expect(ev.eventLifecycle).toBe("ongoing");
    expect(ev.ticketAvailability).toBe("sold_out");
  });

  it("leaves G-44 fields absent when the backend omits them (never inferred)", () => {
    const ev = backendEventToEvent(wire());
    expect(ev.eventLifecycle).toBeUndefined();
    expect(ev.ticketAvailability).toBeUndefined();
  });

  it("maps the Featured placement label; absent on the plain list payload (#53)", () => {
    // Only the Featured serializer emits `placement_label` (GET
    // /public/featured_events, GET /public/events?featured=true).
    expect(backendEventToEvent(wire({ placement_label: "featured" })).featured).toBe(true);

    // The plain list serializer carries no label — absence stays absent.
    expect(backendEventToEvent(wire()).featured).toBeUndefined();
  });

  it("maps lineup from the public event_participants roster, absent when not (#36)", () => {
    const served = backendEventToEvent(
      wire({
        event_participants: [
          { id: "p1", name: "Teddy Afro", type: "performer", description: "Headliner", display_order: 0 },
          // A roster entry served without a name is dropped, not rendered blank.
          { id: "p2", type: "host", display_order: 1 },
        ],
      }),
    );
    expect(served.lineup).toHaveLength(1);
    // The serializer's free-text `description` is the display role the UI shows.
    expect(served.lineup?.[0]).toMatchObject({ name: "Teddy Afro", role: "Headliner" });

    // Absent participants must not be fabricated into a lineup.
    const absent = backendEventToEvent(wire());
    expect(absent.lineup).toBeUndefined();
  });

  it("carries the per-date participant link when the backend serves it (#36)", () => {
    const served = backendEventToEvent(
      wire({
        event_participants: [
          { id: "p1", name: "Teddy Afro", type: "performer", description: "Headliner", event_date_id: "d2" },
          { id: "p2", name: "Festival Host", type: "host", description: "Host" },
        ],
      }),
    );
    // A day-pinned participant carries its date id; an event-level one does not.
    expect(served.lineup?.[0]).toMatchObject({ name: "Teddy Afro", role: "Headliner", eventDateId: "d2" });
    expect(served.lineup?.[1]).not.toHaveProperty("eventDateId");
  });

  it("resolves dates from the 2026-10-16 list/detail fields (#70)", () => {
    // List payload: a single `next_event_date`.
    const list = backendEventToEvent(
      wire({
        next_event_date: {
          id: "n1",
          starts_at: "2026-11-05T19:00:00Z",
          series_id: "rule-1",
          venue: { id: "v1", name: "The Hub", city: "Addis Ababa" },
        },
      }),
    );
    expect(list.eventDates?.[0]).toMatchObject({ id: "n1", seriesId: "rule-1" });
    expect(list.venue).toBe("The Hub");
    expect(list.city).toBe("Addis Ababa");

    // Detail payload: a bounded preview + the schedule link + the series flag.
    const detail = backendEventToEvent(
      wire({
        event_dates_preview: [
          { id: "p1", starts_at: "2026-11-05T19:00:00Z", doors_at: "2026-11-05T18:00:00Z" },
          { id: "p2", starts_at: "2026-11-12T19:00:00Z" },
        ],
        event_dates_url: "/public/events/x/dates",
        is_recurring: true,
      }),
    );
    expect(detail.eventDates?.map((d) => d.id)).toEqual(["p1", "p2"]);
    expect(detail.eventDates?.[0]?.doorsAt).toBe("2026-11-05T18:00:00Z");
    expect(detail.eventDatesUrl).toBe("/public/events/x/dates");
    expect(detail.isRecurring).toBe(true);
  });

  it("prefers the new date fields over the legacy event_dates array", () => {
    const ev = backendEventToEvent(
      wire({
        event_dates: [{ id: "legacy", starts_at: "2020-01-01T00:00:00Z" }],
        next_event_date: { id: "fresh", starts_at: "2026-11-05T19:00:00Z" },
      }),
    );
    expect(ev.eventDates?.map((d) => d.id)).toEqual(["fresh"]);
  });

  it("flattens the detail's structured age_restriction for the Age card (#53)", () => {
    const restriction = (age_restriction: unknown) =>
      backendEventToEvent(wire({ event_setting: { config: { age_restriction } } })).ageRestriction;

    // min only, and a bounded window.
    expect(restriction({ has_restriction: true, min_age: 18 })).toBe("18+");
    expect(restriction({ has_restriction: true, min_age: 21, max_age: 65 })).toBe("21–65");
    // max only (a valid backend shape, though the catalog does not use it yet).
    expect(restriction({ has_restriction: true, max_age: 12 })).toBe("Up to 12");
  });

  it("distinguishes unrestricted age from omitted or malformed metadata (#53)", () => {
    const restriction = (age_restriction?: unknown) =>
      backendEventToEvent(wire({ event_setting: { config: { age_restriction } } })).ageRestriction;

    // The list payload never carries it; an explicit "no restriction" is not a
    // bound; and a malformed/legacy value must not be invented into one.
    expect(restriction(undefined)).toBeUndefined();
    expect(restriction({ has_restriction: false })).toBe("Any Age");
    expect(restriction({ has_restriction: true })).toBeUndefined();
    expect(restriction("21+")).toBeUndefined();
    expect(backendEventToEvent(wire()).ageRestriction).toBeUndefined();
  });
});
