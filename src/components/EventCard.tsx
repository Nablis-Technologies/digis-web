import { glassEdge } from '@/lib/ui/glass';
import { FeaturedPlacementLabel } from '@/components/FeaturedPlacementLabel';
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, Clock, MapPin, Radio } from "lucide-react";
import { useImageColor } from "@/lib/hooks/useImageColor";
import { useTheme } from "@/app/components/ThemeContext";
import type { Event } from "@/types";
import { Money } from "@/lib/money";
import { EventCategoryTag } from "@/components/EventCategoryTag";
import { EventDateBadge } from "@/components/EventDateBadge";
import { FeaturedDateRangeBadge, FormatTag } from "@/components/EventFormatBadges";
import { glassShadow } from "@/lib/ui/glass";
import { GlassReflection } from "@/components/primitives/GlassReflection";
import { eventEnded } from "@/lib/eventDates";
import { isSeries } from "@/lib/recurring";
import { eventActionLabel } from "@/lib/eventAction";
import { availabilityMeta } from "@/lib/eventAvailability";

// Invite-only distinguisher accent — a fixed amber, deliberately not the
// per-event category hue, so a gated event reads distinctly.

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

/** Month abbreviation + day-of-month from an ISO date, for the range badge. */
function monthDayOf(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { month: "---", day: "--" };
  return {
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()).padStart(2, "0"),
  };
}

/**
 * Card format vocabulary. `recurring` is produced **only** when the backend
 * serves a series signal (`isSeries` in `lib/recurring.ts`) — never inferred
 * from the date count (ADR-0002: never invent).
 */
export type CardFormat = "single" | "multiDay" | "recurring";

/** Series when the backend signals one, else multi-day when >1 date. */
export function cardFormat(event: Pick<Event, "eventDates" | "recurrence" | "isRecurring">): CardFormat {
  if (isSeries(event)) return "recurring";
  return (event.eventDates?.length ?? 0) > 1 ? "multiDay" : "single";
}

/**
 * Uppercase label for a card format chip, e.g. "MULTI-DAY". A series reads
 * "RECURRING" — the cadence word ("weekly") is not derivable from the public
 * dates alone, so it is not claimed.
 */
export function cardFormatLabel(format: CardFormat): string {
  if (format === "multiDay") return "MULTI-DAY";
  if (format === "recurring") return "RECURRING";
  return "";
}

/** Month/day range across an event's dates, e.g. { month: "AUG–SEP", range: "28–30" }. */
export function cardDateRange(eventDates: Event["eventDates"]): { month: string; range: string } {
  const dates = (eventDates ?? [])
    .map((d) => new Date(d.startsAt))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length < 2) {
    const md = dates[0] ? monthDayOf(dates[0].toISOString()) : { month: "---", day: "--" };
    return { month: md.month, range: md.day };
  }
  const first = monthDayOf(dates[0].toISOString());
  const last = monthDayOf(dates[dates.length - 1].toISOString());
  const month = first.month === last.month ? first.month : `${first.month}–${last.month}`;
  return { month, range: first.day === last.day ? first.day : `${first.day}–${last.day}` };
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


export function CountdownBadge({ event }: { event: Event }) {
  const start = getEventStart(event.date, event.time);
  const urgency = getEventUrgency(start);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!urgency) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [urgency]);

  if (!urgency) return null;

  const diff = start.getTime() - now;
  // "Live now" window: started within the last 4 hours.
  const isLive = diff <= 0 && diff > -4 * 60 * 60 * 1000;
  if (diff <= 0 && !isLive) return null;

  const todayHot = urgency === "today";
  const label = isLive
    ? "Live now"
    : urgency === "today"
      ? `Starts in ${formatCountdown(diff)}`
      : `Tomorrow · ${formatCountdown(diff)}`;

  // Today = hot brand-red urgency; tomorrow = cool brand glass.
  const bg = isLive
    ? "rgba(220,38,38,0.92)"
    : todayHot
      ? "rgba(10,10,10,0.55)"
      : "rgba(10,10,10,0.5)";
  const accent = isLive ? "#fff" : "#d6f905";

  return (
    <div className="absolute bottom-3 right-3 z-20">
      <motion.span
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center h-[22px] gap-1.5 px-2.5 rounded-full text-[9px] tracking-[1.2px] uppercase leading-none tabular-nums"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          color: "#fff",
          background: bg,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: isLive
            ? "0 8px 20px rgba(220,38,38,0.3)"
            : "0 0 0 1px rgba(214,249,5,0.4), 0 8px 20px rgba(0,0,0,0.3)",
        }}
      >
        {isLive ? (
          <span className="flex items-center"><Radio className="w-2.5 h-2.5" strokeWidth={2.5} /></span>
        ) : (
          <motion.span
            animate={todayHot ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            transition={
              todayHot
                ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
            className="flex items-center"
            style={{ color: accent }}
          >
            <Clock className="w-2.5 h-2.5" strokeWidth={2.5} />
          </motion.span>
        )}
        <span style={{ color: isLive ? "#fff" : accent }}>{label}</span>
      </motion.span>
    </div>
  );
}


export function EventCard({
  event,
  onClick,
  /** Above-the-fold cards skip lazy-loading so the first paint isn't gated. */
  eager = false,
  soldOutTreatment = "glass",
  statusRadius = 13,
}: {
  event: Event;
  onClick: () => void;
  eager?: boolean;
  statusRadius?: number;
  soldOutTreatment?: "stamp" | "badge" | "footer" | "banner" | "glass" | "rail" | "ribbon" | "capacity" | "poster" | "muted" | "archived" | "leftRibbon";
}) {
  const { rgb } = useImageColor(event.image);
  const { isDark } = useTheme();
  // G-44: prefer the server's sellability/lifecycle. Fall back to the local
  // derivation only when the backend omits them (ADR-0002 — never invent).
  const availability = availabilityMeta(event);
  const isSoldOut = availability.badge === 'Sold Out';
  // Ended: server lifecycle wins; else the local past-date gate (#34).
  const alternateSoldOut = isSoldOut && soldOutTreatment !== "stamp";
  const isEnded = event.eventLifecycle === 'ended' || eventEnded(event);
  const isInactive = isSoldOut || isEnded || event.ticketAvailability === 'sales_closed';
  const muteAction = isEnded || (availability.buyBlocked && event.ticketAvailability !== 'coming_soon' && event.ticketAvailability !== 'no_public_tickets');
  const ticketsUnavailable = event.ticketAvailability === 'unavailable' || event.ticketAvailability === 'no_eligible_dates';
  const showStatus = isInactive;
  const showGlassStatus = showStatus && (!isSoldOut || soldOutTreatment === "glass");
  const statusLabel = isEnded && !isSoldOut ? "Ended" : (availability.badge ?? "Unavailable");
  const isLow =
    typeof event.ticketsLeft === "number" && event.ticketsLeft > 0 && event.ticketsLeft <= 45;
  const accent = isDark ? "#d6f905" : "#d6f905";
  const accentRgb = "214,249,5";
  const priceColor = isDark ? "#d6f905" : "#0a0a0a";
  const priceLabel = event.priceFromMinor === 0 ? "Free" : Money.fromMinor(event.priceFromMinor, event.currency ?? "ETB").format();
  const format = cardFormat(event);
  const formatLabel = cardFormatLabel(format);
  const range = format === "multiDay" ? cardDateRange(event.eventDates) : null;
  const showDayPasses = format === "multiDay";

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="relative isolate cursor-pointer group rounded-[24px] overflow-hidden flex flex-col"
      style={{
        background: isDark ? "#101010" : "#fff",
        // Glass reflection instead of a full hairline: a lit top edge only,
        // no bottom/side outline. Drop shadow still lifts the card.
        ...glassShadow(isDark),
      }}
    >
      <GlassReflection isDark={isDark} />
      {/* Image — dominant, full-bleed */}
      <div
        className="relative z-10 overflow-hidden"
        style={{
          aspectRatio: "343/429",
        }}
      >
        <img
          src={event.imageThumb ?? event.image}
          {...(event.imageThumb
            ? { srcSet: `${event.imageThumb} 200w, ${event.image} 800w`, sizes: "(max-width: 768px) 100vw, 343px" }
            : {})}
          alt={event.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          style={{
            filter: isSoldOut && soldOutTreatment === "archived"
              ? "grayscale(1) brightness(0.52)"
              : ticketsUnavailable ? "saturate(0.65) brightness(0.85)"
              : isInactive && (!alternateSoldOut || !["badge", "footer"].includes(soldOutTreatment))
              ? "saturate(0.3) brightness(0.65)"
              : "none",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.15) 100%)",
          }}
        />

        {isSoldOut && soldOutTreatment === "badge" && (
          <span className="absolute right-3 top-3 z-20 rounded-lg bg-black/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
            Sold out
          </span>
        )}

        {isSoldOut && soldOutTreatment === "banner" && (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-[#d6f905] py-2 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#101010]">
            Sold out
          </div>
        )}
        {showGlassStatus && (
          <div className={`absolute inset-0 z-20 grid place-items-center ${isInactive ? "bg-black/35" : ""}`}>
            <span className="-rotate-6 bg-black/65 px-5 py-2.5 font-bold uppercase tracking-widest text-white backdrop-blur-md" style={{ ...glassEdge(true), borderRadius: statusRadius, fontSize: 13, fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
              {statusLabel}
            </span>
          </div>
        )}
        {isSoldOut && soldOutTreatment === "rail" && (
          <div className="absolute inset-y-0 right-0 z-20 grid w-10 place-items-center bg-[#101010]/90 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d6f905] backdrop-blur-md [writing-mode:vertical-rl]">
            Sold out
          </div>
        )}

        {isSoldOut && soldOutTreatment === "leftRibbon" && (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden bg-black/35">
            <span className="absolute -left-11 top-7 w-44 -rotate-45 bg-[#26272b]/95 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-[#e4e4e7]">
              Sold out
            </span>
          </div>
        )}
        {isSoldOut && soldOutTreatment === "ribbon" && (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
            <span className="absolute -right-11 top-7 w-44 rotate-45 bg-[#d6f905] py-2 text-center text-[10px] font-bold uppercase tracking-widest text-[#101010]">
              Sold out
            </span>
          </div>
        )}
        {isSoldOut && soldOutTreatment === "capacity" && (
          <div className="absolute inset-x-3 bottom-3 z-20 rounded-2xl bg-[#101010]/90 p-3 text-white backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs">
              <strong>Sold out</strong>
              <span className="text-white/75">At capacity</span>
            </div>
            <div aria-hidden="true" className="h-1 rounded-full bg-[#d6f905]" />
          </div>
        )}
        {isSoldOut && soldOutTreatment === "poster" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#101010]/75 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d6f905]">Event at capacity</span>
            <strong className="mt-1 text-3xl text-white" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>Sold out</strong>
          </div>
        )}

        {showStatus && !alternateSoldOut && !showGlassStatus && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -28 }}
            animate={{ opacity: 1, scale: 1, rotate: -28 }}
            transition={{
              duration: 0.35,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            <div
              className="px-5 py-2 rounded-lg"
              style={{
                background: isDark
                  ? "rgba(10,10,10,0.34)"
                  : "rgba(10,10,10,0.42)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: `0 0 0 1.5px rgba(${accentRgb},0.85), 0 12px 30px rgba(0,0,0,0.28)`,
              }}
            >
              <span
                className="text-[18px] tracking-[3px] uppercase"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: accent,
                  fontWeight: 900,
                  textShadow: `0 2px 10px rgba(0,0,0,0.5)`,
                }}
              >
                {isEnded && !isSoldOut ? "Ended" : (availability.badge ?? "Unavailable")}
              </span>
            </div>
          </motion.div>
        )}

        {/* Top-left format chip: names a multi-day/recurring schedule. */}
        {format !== "single" && (
          <div className="absolute top-3 left-3 z-20 inline-flex items-center h-[22px] px-2.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }}>
            <FormatTag format={format} label={formatLabel} isDark />
          </div>
        )}

        {/* Top-left status chip: remaining tickets, when the backend exposes a
            count (event.type is offer-driven now — no invite-only mode). */}
        {format === "single" && !isEnded && !isSoldOut && typeof event.ticketsLeft === "number" && (
          <div className="absolute top-3 left-3 z-20">
            <motion.span
              animate={isLow ? { opacity: [0.72, 1, 0.72] } : { opacity: 1 }}
              transition={
                isLow
                  ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  : undefined
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] tracking-[1.6px] uppercase leading-none"
              style={{
                fontFamily: "'Inter', sans-serif",
                background: isLow ? "rgba(220,38,38,0.88)" : "rgba(0,0,0,0.5)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                color: "#fff",
                fontWeight: 600,
                boxShadow: `${isLow ? "0 0 0 1px rgba(255,255,255,0.28)" : "0 0 0 1px rgba(255,255,255,0.18)"}${isLow ? ", 0 8px 20px rgba(220,38,38,0.25)" : ""}`,
              }}
            >
              {isLow && (
                <span className="w-1 h-1 rounded-full" style={{ background: "#fff" }} />
              )}
              {event.ticketsLeft} Left
            </motion.span>
          </div>
        )}
        {range ? (
          <FeaturedDateRangeBadge month={range.month} range={range.range} accentRgb={rgb} className="absolute top-3 right-3 rounded-[13px]" />
        ) : (
          <EventDateBadge date={event.date} accentRgb={rgb} className="absolute top-3 right-3 rounded-[13px]" />
        )}

        {/* Bottom-left of image: category + optional invite */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <EventCategoryTag category={event.category} rgb={rgb} isDark={isDark} />
        </div>

        {/* Live countdown — same-day & tomorrow only */}
        {!isInactive && <CountdownBadge event={event} />}
      </div>

      {/* Footer */}
      <div className="relative z-10 px-3.5 pt-3 pb-3 flex flex-col gap-2">
        {event.featured && <FeaturedPlacementLabel />}
            <h3
          className="text-[14px] tracking-[-0.2px] leading-[1.2] line-clamp-1"
          style={{
            fontFamily: "'Zalando Sans Expanded', sans-serif",
            color: isDark ? "#ffffff" : "#0a0a0a",
            fontWeight: 500,
          }}
        >
          {event.name}
        </h3>

        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin
            className="w-2.5 h-2.5 flex-shrink-0"
            strokeWidth={2}
            style={{
              color: isDark
                ? "rgba(255,255,255,0.45)"
                : "rgba(0,0,0,0.4)",
            }}
          />
          <span
            className="text-[10px] truncate"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: isDark
                ? "rgba(255,255,255,0.6)"
                : "rgba(0,0,0,0.55)",
            }}
          >
            {event.venue} · {event.time}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span
              className="text-[8px] tracking-[1.4px] uppercase"
              style={{
                fontFamily: "'Inter', sans-serif",
                color: isDark
                  ? "rgba(255,255,255,0.4)"
                  : "rgba(0,0,0,0.4)",
              }}
            >
              From
            </span>
            <span
              className="text-[12px] leading-none"
              style={{
                fontFamily:
                  "'Zalando Sans Expanded', sans-serif",
                color: priceColor,
                fontWeight: 500,
              }}
            >
              {priceLabel}
            </span>
            {showDayPasses && (
              <span className="text-[7.5px] tracking-[1.1px] truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
                · DAY PASSES
              </span>
            )}
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full"
            style={{
              background: muteAction
                ? isDark
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(0,0,0,0.10)"
                : accent,
              color: muteAction
                ? isDark
                  ? "rgba(255,255,255,0.55)"
                  : "rgba(0,0,0,0.55)"
                : "#0a0a0a",
              boxShadow: muteAction
                ? `0 0 0 1px ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}`
                : "none",
            }}
          >
            <span
              className="text-[9px] tracking-[1.1px] uppercase"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
              }}
            >
              {isEnded && !isSoldOut
                ? "Ended"
                : (["coming_soon", "no_eligible_dates"].includes(event.ticketAvailability ?? "")
                    ? availability.cta
                    : event.ticketAvailability === "unavailable"
                      ? availability.cta
                      : (availability.badge ?? eventActionLabel(event)))}
            </span>
            <ChevronRight
              className="w-2.5 h-2.5"
              strokeWidth={3}
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
