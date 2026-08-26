import {
  LayoutGrid,
  Music,
  Landmark,
  Cpu,
  Palette,
  UtensilsCrossed,
  Trophy,
  Dumbbell,
  Laugh,
  Clapperboard,
  Mic2,
  PartyPopper,
  GraduationCap,
  Heart,
  type LucideIcon,
} from 'lucide-react';

/**
 * The one place category identity lives. Every surface that paints a category —
 * the discovery filter pills, the badge on an event card, hero chips — reads its
 * hue and icon from here so a category looks the same everywhere in the app.
 */
export interface CategoryMeta {
  name: string;
  Icon: LucideIcon;
  hex: string;
  /** "r,g,b" of `hex`, for rgba() interpolation. */
  rgb: string;
}

/** Digis brand lime — used for "All" and for any category we don't know. */
export const FALLBACK_CATEGORY_HEX = '#d6f905';

export function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  return `rgba(${hexToRgb(hex)},${alpha})`;
}

const DEFINITIONS: [name: string, Icon: LucideIcon, hex: string][] = [
  ['All', LayoutGrid, FALLBACK_CATEGORY_HEX],
  ['Music', Music, '#a855f7'],
  ['Sports', Trophy, '#22c55e'],
  ['Nightlife', PartyPopper, '#ec4899'],
  ['Culture', Landmark, '#f59e0b'],
  ['Food', UtensilsCrossed, '#f97316'],
  ['Art', Palette, '#8b5cf6'],
  ['Comedy', Laugh, '#eab308'],
  ['Fitness', Dumbbell, '#ef4444'],
  ['Film', Clapperboard, '#3b82f6'],
  ['Tech', Cpu, '#06b6d4'],
  ['Wellness', Heart, '#14b8a6'],
  ['Education', GraduationCap, '#6366f1'],
  ['Spoken Word', Mic2, '#f43f5e'],
];

export const CATEGORIES: CategoryMeta[] = DEFINITIONS.map(([name, Icon, hex]) => ({
  name,
  Icon,
  hex,
  rgb: hexToRgb(hex),
}));

const BY_NAME = new Map(CATEGORIES.map((c) => [c.name.toLowerCase(), c]));

export function categoryMeta(category?: string): CategoryMeta | undefined {
  return category ? BY_NAME.get(category.trim().toLowerCase()) : undefined;
}

/** Category hue as a hex string, falling back to the brand lime. */
export function categoryHex(category?: string): string {
  return categoryMeta(category)?.hex ?? FALLBACK_CATEGORY_HEX;
}

/**
 * Lift a hue into a readable band. Category hues are picked for pills on a flat
 * page background; on top of poster artwork the darker ones (blue, indigo,
 * violet) fail contrast, so badges over imagery use a lightened variant.
 */
function shiftLightness(rgbStr: string, targetMin: number, targetMax: number): string {
  const [r, g, b] = rgbStr.split(',').map((p) => (parseInt(p, 10) || 0) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  let s = 0;
  const l0 = (max + min) / 2;
  if (d !== 0) {
    s = l0 > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  s = Math.max(s, 0.35);
  const l = Math.min(Math.max(l0, targetMin), targetMax);
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let R: number, G: number, B: number;
  if (s === 0) {
    R = G = B = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    R = hue2rgb(p, q, h + 1 / 3);
    G = hue2rgb(p, q, h);
    B = hue2rgb(p, q, h - 1 / 3);
  }
  return `${Math.round(R * 255)},${Math.round(G * 255)},${Math.round(B * 255)}`;
}

/**
 * The category hue as "r,g,b", pushed into a band that reads against a flat page
 * background in the current theme — lifted in dark mode, deepened in light mode.
 * Use this for pill icons/labels, where the hue has to carry text contrast.
 */
export function readableCategoryRgb(category: string, isDark: boolean): string {
  const rgb = categoryMeta(category)?.rgb ?? hexToRgb(FALLBACK_CATEGORY_HEX);
  return isDark ? shiftLightness(rgb, 0.6, 0.74) : shiftLightness(rgb, 0.3, 0.44);
}

export interface CategoryBadgeTokens {
  /** Hue to tint the badge with, already lifted for contrast over artwork. */
  rgb: string;
  tint: number;
  border: number;
  text: number;
  /** Dark scrim behind the tint, so light artwork can't wash the label out. */
  scrim: string;
}

/**
 * Tokens for a category badge sitting on top of poster artwork (event cards,
 * hero images). `fallbackRgb` — usually the poster's dominant color — is used
 * for categories outside the known set.
 */
export function getCategoryColor(category: string, fallbackRgb: string): CategoryBadgeTokens {
  const meta = categoryMeta(category);
  return {
    rgb: shiftLightness(meta?.rgb ?? fallbackRgb, 0.7, 0.82),
    tint: 0.2,
    border: 0.45,
    text: 1,
    scrim: 'rgba(10,8,20,0.5)',
  };
}
