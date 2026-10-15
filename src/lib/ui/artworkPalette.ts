/**
 * Artwork-derived colour palette for the profile sheets (artist / organizer /
 * venue). Ported from the `digis-web2` export, where the palette is "computed by
 * the caller" and drives the sheet's *environment* — see `SheetEnvironment`.
 *
 * What it derives, and why it is safe:
 * - The **hue** comes from the artwork (its average colour). That is
 *   presentation only — it tints the sheet to the artist's own colour world and
 *   never invents data (ADR-0002). A near-greyscale artwork keeps the brand hue.
 * - The **glass** token follows the app theme (`isDark`), not the artwork, so
 *   contrast is predictable in both themes. This matches the export's own
 *   `FALLBACK_PALETTE(isDark)` exactly.
 *
 * With no artwork (`rgb` null) this returns the export's fallback verbatim.
 *
 * Scope note: the export's `ArtworkPalette` also carries content tokens (`ink`,
 * `muted`, `faint`, `glassStrong`, `hair`, `onInk`, `inkIsLight`). They are not
 * ported yet — the sheets still colour their content from `isDark` — so they are
 * left out rather than shipped unused. Add each back with the consumer that
 * needs it.
 */

export interface ArtworkPalette {
  /** Top of the sheet's base gradient. */
  bg0: string;
  /** Bottom of the sheet's base gradient (also the sheet's fill). */
  bg1: string;
  /** Radial colour glow behind the header. */
  glow: string;
  /** Quiet glass fill on the environment — e.g. the avatar ring. */
  glass: string;
}

/** Digis brand hue — used when the artwork has no usable colour. */
const BRAND_HUE = 247;

/** Below this saturation the artwork reads as greyscale; keep the brand hue. */
const GREYSCALE_SATURATION = 0.12;

function hueOf(rgb: [number, number, number]): number | null {
  const [r, g, b] = (rgb.map((c) => c / 255) as [number, number, number]);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (l > 0.5 ? 2 - max - min : max + min);
  if (s < GREYSCALE_SATURATION) return null;
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  // Round so the generated CSS stays tidy (a raw float reads as noise).
  return Math.round(((h / 6) * 360) * 10) / 10;
}

export function artworkPalette(
  rgb: [number, number, number] | null | undefined,
  isDark: boolean,
): ArtworkPalette {
  const hue = (rgb && hueOf(rgb)) ?? BRAND_HUE;

  return {
    bg0: isDark ? `hsla(${hue}, 75%, 20%, 1)` : `hsla(${hue}, 30%, 90%, 1)`,
    bg1: isDark ? `hsla(${hue}, 60%, 9%, 1)` : `hsla(${hue}, 30%, 85%, 1)`,
    glow: isDark ? `hsla(${hue}, 90%, 46%, 0.55)` : `hsla(${hue}, 40%, 72%, 0.3)`,
    glass: isDark ? "rgba(255,255,255,0.08)" : "rgba(20,18,31,0.06)",
  };
}
