import { describe, it, expect } from "vitest";
import { artworkPalette } from "./artworkPalette";

describe("artworkPalette", () => {
  it("returns the export fallback verbatim when there is no artwork", () => {
    expect(artworkPalette(null, true)).toEqual({
      bg0: "hsla(247, 75%, 20%, 1)",
      bg1: "hsla(247, 60%, 9%, 1)",
      glow: "hsla(247, 90%, 46%, 0.55)",
      glass: "rgba(255,255,255,0.08)",
    });

    const light = artworkPalette(undefined, false);
    expect(light.bg0).toBe("hsla(247, 30%, 90%, 1)");
    expect(light.bg1).toBe("hsla(247, 30%, 85%, 1)");
    expect(light.glow).toBe("hsla(247, 40%, 72%, 0.3)");
    expect(light.glass).toBe("rgba(20,18,31,0.06)");
  });

  it("takes the hue from the artwork, keeping theme-driven contrast", () => {
    // A saturated red artwork → hue 0.
    expect(artworkPalette([220, 40, 40], true)).toMatchObject({
      bg0: "hsla(0, 75%, 20%, 1)",
      bg1: "hsla(0, 60%, 9%, 1)",
      glow: "hsla(0, 90%, 46%, 0.55)",
    });
    // A saturated blue artwork → hue ~223, rounded for tidy CSS.
    const blue = artworkPalette([40, 90, 220], false);
    expect(blue.bg0).toBe("hsla(223.3, 30%, 90%, 1)");
    // glass is theme-driven, so a wild artwork can never wreck contrast.
    expect(blue.glass).toBe("rgba(20,18,31,0.06)");
  });

  it("keeps the brand hue for a greyscale artwork", () => {
    expect(artworkPalette([128, 128, 128], true).bg0).toBe("hsla(247, 75%, 20%, 1)");
    expect(artworkPalette([0, 0, 0], true).bg0).toBe("hsla(247, 75%, 20%, 1)");
    expect(artworkPalette([255, 255, 255], true).bg0).toBe("hsla(247, 75%, 20%, 1)");
  });
});
