// How a portrait or avatar tile looks when it has no image: the initials helper,
// the theme surface and ink it sits on, and the halo that lifts it off a sheet.
//
// A tile with no image carries no data, so it never invents a hue — it wears the
// app's own dark/light surface (DESIGN.md — one accent, nothing decorative). This
// replaced a hash-based 12-colour palette that painted a "random" colour per name.

/** Background of a tile standing in for a missing image — a quiet theme surface. */
export function placeholderSurface(isDark: boolean): string {
  return isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
}

/** Ink for initials or labels drawn on `placeholderSurface`. */
export function placeholderInk(isDark: boolean): string {
  return isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.75)';
}

/** Initials for a name — up to two letters, uppercased. */
export function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * The halo that separates a profile avatar from the surface behind it (the
 * profile sheets). A quiet spread shadow in the theme's glass pair — not a
 * painted border (ADR-0007). Returns the `box-shadow` value for a 3px ring.
 */
export function avatarRing(isDark: boolean): string {
  return isDark ? '0 0 0 3px rgba(255,255,255,0.08)' : '0 0 0 3px rgba(20,18,31,0.06)';
}
