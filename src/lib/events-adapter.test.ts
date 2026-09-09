import { describe, expect, it } from "vitest";

import {
  backendEventToEvent,
  type BackendEvent,
} from "@/lib/events-adapter";

function wire(config: Record<string, unknown>): BackendEvent {
  return {
    id: "evt-1",
    slug: "on-on",
    title: "On and On",
    event_setting: { config },
  };
}

describe("backendEventToEvent — config mapping", () => {
  it("maps every served config key onto the Event", () => {
    const ev = backendEventToEvent(
      wire({
        featured: true,
        rating: 4.5,
        tickets_left: 1246,
        sold_out: false,
        price_foreign_from_minor: 10000,
        foreign_currency: "USD",
        event_type: "rsvp",
        seat_map: { sections: [] },
        answer_edit_window_hours: 24,
        rsvp_going: 287,
        rsvp_capacity: 500,
        allows_plus_one: true,
        max_guests: 4,
        rsvp_requirements: { requireEmail: true },
        access_mode: "code",
        invite_only_paid: false,
        on_guest_list: true,
      }),
    );

    expect(ev.featured).toBe(true);
    expect(ev.rating).toBe(4.5);
    expect(ev.ticketsLeft).toBe(1246);
    expect(ev.soldOut).toBe(false);
    expect(ev.priceForeignFromMinor).toBe(10000);
    expect(ev.eventType).toBe("rsvp");
    expect(ev.seatMap).toEqual({ sections: [] });
    expect(ev.answerEditWindowHours).toBe(24);
    expect(ev.rsvpGoing).toBe(287);
    expect(ev.rsvpCapacity).toBe(500);
    expect(ev.allowsPlusOne).toBe(true);
    expect(ev.maxGuests).toBe(4);
    expect(ev.rsvpRequirements).toEqual({ requireEmail: true });
    expect(ev.accessMode).toBe("code");
    expect(ev.inviteOnlyPaid).toBe(false);
    expect(ev.onGuestList).toBe(true);
  });

  it("leaves fields absent when config is missing (never invents values)", () => {
    const ev = backendEventToEvent(wire({}));

    expect(ev.featured).toBeUndefined();
    expect(ev.rating).toBeUndefined();
    expect(ev.soldOut).toBeUndefined();
    expect(ev.eventType).toBeUndefined();
    expect(ev.seatMap).toBeUndefined();
    expect(ev.accessMode).toBeUndefined();
    expect("ticketsLeft" in ev).toBe(false);
  });

  it("rejects unknown enum values instead of passing them through", () => {
    const ev = backendEventToEvent(
      wire({ event_type: "concert", access_mode: "smoke-signals" }),
    );

    expect(ev.eventType).toBeUndefined();
    expect(ev.accessMode).toBeUndefined();
  });

  it("translates a snake_case seat_map stage_label", () => {
    const ev = backendEventToEvent(
      wire({ seat_map: { stage_label: "STAGE", sections: [] } }),
    );

    expect(ev.seatMap).toEqual({ stageLabel: "STAGE", sections: [] });
  });

  it("rejects malformed seat_map and rsvp_requirements", () => {
    const badSeat = backendEventToEvent(wire({ seat_map: "balcony" }));
    expect(badSeat.seatMap).toBeUndefined();

    const badSections = backendEventToEvent(
      wire({ seat_map: { sections: "all" } }),
    );
    expect(badSections.seatMap).toBeUndefined();

    const badReqs = backendEventToEvent(
      wire({ rsvp_requirements: "just come" }),
    );
    expect(badReqs.rsvpRequirements).toBeUndefined();
  });

  it("rejects wrong-typed scalars", () => {
    const ev = backendEventToEvent(
      wire({ rating: "4.5", tickets_left: "many", featured: "yes" }),
    );

    expect(ev.rating).toBeUndefined();
    expect("ticketsLeft" in ev).toBe(false);
    expect(ev.featured).toBeUndefined();
  });

  it("preserves an explicit null answer-edit window", () => {
    const ev = backendEventToEvent(
      wire({ answer_edit_window_hours: null }),
    );

    expect(ev.answerEditWindowHours).toBeNull();
  });
});
