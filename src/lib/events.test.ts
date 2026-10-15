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
      if (path === "public/events") {
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
      if (path === "public/events") return { data: [wireEvent("on-on")] };
      // `featured_events_unavailable` (503) must not take the whole page down.
      throw new Error("featured_events_unavailable");
    }) as never);

    const events = await eventsModule.fetchAll();

    expect(events.map((e) => e.slug)).toEqual(["on-on"]);
    expect(events[0].featured).toBeUndefined();
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
