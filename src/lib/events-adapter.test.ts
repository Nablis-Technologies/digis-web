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

  it("maps lineup from event_participants when served, absent when not", () => {
    const served = backendEventToEvent(
      wire({
        event_participants: [
          { name: "Teddy Afro", role: "performer", handle: "@teddy", followers: 1200, verified: true },
        ],
      }),
    );
    expect(served.lineup).toHaveLength(1);
    expect(served.lineup?.[0]).toMatchObject({ name: "Teddy Afro", role: "performer", handle: "@teddy", followers: 1200, verified: true });

    // The public payload does not expose participants yet (BACKEND_GAPS #36) —
    // the adapter must not fabricate a lineup.
    const absent = backendEventToEvent(wire());
    expect(absent.lineup).toBeUndefined();
  });

  it("carries the per-date participant link when the backend serves it (#36)", () => {
    const served = backendEventToEvent(
      wire({
        event_participants: [
          { id: "p1", name: "Teddy Afro", role: "performer", event_date_id: "d2" },
          { id: "p2", name: "Festival Host", role: "host" },
        ],
      }),
    );
    // A day-pinned participant carries its date id; an event-level one does not.
    expect(served.lineup?.[0]).toMatchObject({ name: "Teddy Afro", eventDateId: "d2" });
    expect(served.lineup?.[1]).not.toHaveProperty("eventDateId");
  });
});
