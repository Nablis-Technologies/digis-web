import { describe, it, expect, vi, beforeEach } from "vitest";

import { apiFetch } from "@/lib/api";
import { eventsModule } from "@/lib/events";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const mockedApiFetch = vi.mocked(apiFetch);

function wireEvent(slug: string, patch: Record<string, unknown> = {}) {
  return {
    id: `id-${slug}`,
    slug,
    title: slug,
    currency: "ETB",
    price_from_minor: 10000,
    ...patch,
  };
}

beforeEach(() => {
  mockedApiFetch.mockReset();
});

describe("eventsModule.fetchAll — the Featured entitlement", () => {
  it("marks the events the Featured endpoint serves, leaving the rest unmarked", async () => {
    mockedApiFetch.mockImplementation((async (path: string) => {
      if (path.startsWith("public/events?")) {
        return { data: [wireEvent("on-on"), wireEvent("jazz")] };
      }
      if (path === "public/featured_events") {
        return { data: [wireEvent("jazz", { placement_label: "featured" })] };
      }
      throw new Error(`unexpected path ${path}`);
    }) as never);

    const events = await eventsModule.fetchAll();

    expect(events.map((e) => e.slug)).toEqual(["on-on", "jazz"]);
    expect(events.find((e) => e.slug === "jazz")?.featured).toBe(true);
    // A list-only event carries no featured flag — absence stays absent (#53).
    expect(events.find((e) => e.slug === "on-on")?.featured).toBeUndefined();
  });

  it("still returns the list when Featured resolution fails — enrichment degrades, the grid does not", async () => {
    mockedApiFetch.mockImplementation((async (path: string) => {
      if (path.startsWith("public/events?")) return { data: [wireEvent("on-on")] };
      // `featured_events_unavailable` (503) must not take the whole page down.
      throw new Error("featured_events_unavailable");
    }) as never);

    const events = await eventsModule.fetchAll();

    expect(events.map((e) => e.slug)).toEqual(["on-on"]);
    expect(events[0].featured).toBeUndefined();
  });
});

describe("eventsModule.fetchAll — query + pagination (#49 / #70)", () => {
  it("maps the domain query onto the backend snake_case params", async () => {
    const seen: string[] = [];
    mockedApiFetch.mockImplementation((async (path: string) => {
      seen.push(path);
      if (path.startsWith("public/events?")) return { data: [wireEvent("jazz")] };
      return { data: [] }; // featured
    }) as never);

    await eventsModule.fetchAll({
      q: "jazz",
      category: "music",
      city: "Addis Ababa",
      dateFrom: "2026-11-01T00:00:00Z",
      dateTo: "2026-12-01T00:00:00Z",
      sort: "price_asc",
      currency: "ETB",
      minPriceMinor: 0,
      maxPriceMinor: 100000,
      organizationId: "org-1",
      venueId: "ven-1",
      artistId: "art-1",
    });

    const list = seen.find((p) => p.startsWith("public/events?"))!;
    expect(list).toContain("q=jazz");
    expect(list).toContain("category=music");
    expect(list).toContain("city=Addis+Ababa");
    expect(list).toContain("date_from=2026-11-01T00%3A00%3A00Z");
    expect(list).toContain("sort=price_asc");
    expect(list).toContain("currency=ETB");
    expect(list).toContain("min_price_minor=0");
    expect(list).toContain("max_price_minor=100000");
    expect(list).toContain("organization_id=org-1");
    expect(list).toContain("venue_id=ven-1");
    expect(list).toContain("artist_id=art-1");
    expect(list).toContain("per_page=100");
  });

  it("drains every page rather than silently showing only page 1", async () => {
    mockedApiFetch.mockImplementation((async (path: string) => {
      if (path.includes("page=2")) {
        return { data: [wireEvent("second")], pagination: { current_page: 2, per_page: 2, total_count: 3, total_pages: 2 } };
      }
      if (path.startsWith("public/events?")) {
        return { data: [wireEvent("a"), wireEvent("b")], pagination: { current_page: 1, per_page: 2, total_count: 3, total_pages: 2 } };
      }
      return { data: [] };
    }) as never);

    const events = await eventsModule.fetchAll();
    expect(events.map((e) => e.slug)).toEqual(["a", "b", "second"]);
  });
});

describe("eventsModule.fetchDates (#70)", () => {
  it("reads the schedule endpoint and maps the date wire shape", async () => {
    mockedApiFetch.mockImplementation((async (path: string) => {
      expect(path).toContain("public/events/jazz/dates?");
      return {
        data: [
          {
            id: "d1",
            starts_at: "2026-11-05T19:00:00Z",
            doors_at: "2026-11-05T18:00:00Z",
            status: "scheduled",
            series_id: "rule-1",
            venue: { id: "v1", name: "The Hub", city: "Addis Ababa" },
          },
        ],
      };
    }) as never);

    const dates = await eventsModule.fetchDates("jazz");
    expect(dates?.[0]).toMatchObject({ id: "d1", doorsAt: "2026-11-05T18:00:00Z", seriesId: "rule-1" });
  });
});

describe("eventsModule.fetchFeatured", () => {
  it("reads the dedicated Featured endpoint, not a list filter", async () => {
    mockedApiFetch.mockImplementation((async (path: string) => {
      if (path === "public/featured_events") {
        return { data: [wireEvent("jazz", { placement_label: "featured" })] };
      }
      throw new Error(`unexpected path ${path}`);
    }) as never);

    const featured = await eventsModule.fetchFeatured();

    expect(mockedApiFetch).toHaveBeenCalledWith("public/featured_events");
    expect(featured).toHaveLength(1);
    expect(featured[0].featured).toBe(true);
  });
});
