// Hash-based flat colorful background for profile placeholders.
// Returns a vibrant solid hue that stays consistent for a given name.

const PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#e11d48', // rose
];

export function flatAvatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}

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
