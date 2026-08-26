/** Combine an event's date ("June 29, 2026") + time ("8:00 PM") into a Date. */
export function getEventStart(dateStr: string, timeStr?: string): Date {
  const base = new Date(dateStr);
  if (isNaN(base.getTime())) return new Date(NaN);
  const m = timeStr?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ap = m[3]?.toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    base.setHours(h, min, 0, 0);
  } else {
    base.setHours(23, 59, 0, 0);
  }
  return base;
}

export type EventUrgency = "today" | "tomorrow" | null;

/** Same-day / next-day classification, based on calendar day (not 24h windows). */
export function getEventUrgency(start: Date): EventUrgency {
  if (isNaN(start.getTime())) return null;
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (startDay.getTime() - today.getTime()) / 86400000,
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  return null;
}

/** Human countdown string from a millisecond delta, e.g. "2h 04m" / "48m 12s". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, "0")}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function parseDateParts(dateStr: string): {
  day: string;
  month: string;
} {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const m = dateStr.match(/([A-Za-z]+)\s+(\d{1,2})/);
    if (m)
      return {
        day: m[2].padStart(2, "0"),
        month: m[1].slice(0, 3).toUpperCase(),
      };
    return { day: "--", month: "---" };
  }
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: d
      .toLocaleString("en-US", { month: "short" })
      .toUpperCase(),
  };
}

export { getCategoryColor } from "@/lib/categoryColors";

// Derive a legible accent from a poster color ("r,g,b"): keep the hue, ensure
// some saturation, and clamp lightness to a readable band per theme — so the
// result clearly comes from the poster rather than washing out to white/black.
export function readableAccent(
  rgbStr: string,
  isDark: boolean,
): string {
  const parts = rgbStr
    .split(",")
    .map((p) => parseInt(p.trim(), 10) || 0);
  const [r, g, b] = (
    parts.length === 3 ? parts : [214, 249, 5]
  ).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  s = Math.max(s, 0.4); // give muted poster colors a bit of life
  l = isDark
    ? Math.min(Math.max(l, 0.6), 0.72)
    : Math.min(Math.max(l, 0.32), 0.46);
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
