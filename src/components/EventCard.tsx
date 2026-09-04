import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, Clock, Hourglass, Lock, MapPin, Radio } from "lucide-react";
import { useImageColor } from "@/lib/hooks/useImageColor";
import { useTheme } from "@/app/components/ThemeContext";
import type { Event } from "@/types";
import { Money } from "@/lib/money";
import { getCategoryColor } from "@/lib/categoryColors";
import { EventDateBadge } from "@/components/EventDateBadge";

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
          border: `1px solid ${isLive ? "rgba(255,255,255,0.3)" : "rgba(214,249,5,0.4)"}`,
          boxShadow: isLive
            ? "0 8px 20px rgba(220,38,38,0.3)"
            : "0 8px 20px rgba(0,0,0,0.3)",
        }}
      >
        {isLive ? (
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center"
          >
            <Radio className="w-2.5 h-2.5" strokeWidth={2.5} />
          </motion.span>
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
}: {
  event: Event;
  onClick: () => void;
}) {
  const { rgb } = useImageColor(event.image);
  const { isDark } = useTheme();
  const isSoldOut = event.ticketsLeft <= 0;
  const isLow =
    event.ticketsLeft > 0 && event.ticketsLeft <= 45;
  const accent = isDark ? "#d6f905" : "#d6f905";
  const accentRgb = "214,249,5";
  const priceColor = isDark ? "#d6f905" : "#0a0a0a";
  const priceLabel =
    event.eventType === "rsvp"
      ? "Free RSVP"
      : event.eventType === "inviteOnly" && !event.inviteOnlyPaid
        ? "Invite only"
        : Money.fromMinor(event.priceFromMinor, event.currency ?? "ETB").format();

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="relative cursor-pointer group rounded-[24px] overflow-hidden flex flex-col"
      style={{
        background: isDark ? "#101010" : "#fff",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        boxShadow: isDark
          ? `0 1px 0 rgba(255,255,255,0.03) inset, 0 16px 40px -20px rgba(0,0,0,0.7)`
          : `0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 32px -18px rgba(0,0,0,0.2)`,
      }}
    >
      {/* Image — dominant, full-bleed */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: "343/429",
        }}
      >
        <img
          src={event.image}
          alt={event.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          loading="lazy"
          decoding="async"
          style={{
            filter: isSoldOut
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

        {isSoldOut && (
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
                border: `1.5px solid rgba(${accentRgb},0.85)`,
                background: isDark
                  ? "rgba(10,10,10,0.34)"
                  : "rgba(10,10,10,0.42)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: `0 12px 30px rgba(0,0,0,0.28)`,
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
                Sold Out
              </span>
            </div>
          </motion.div>
        )}

        {/* Top-left: tickets left chip */}
        {!isSoldOut && (
          <div className="absolute top-3 left-3 z-20">
            <motion.span
              animate={
                isLow
                  ? { opacity: [0.72, 1, 0.72] }
                  : { opacity: 1 }
              }
              transition={
                isLow
                  ? {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
                  : undefined
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] tracking-[1.6px] uppercase leading-none"
              style={{
                fontFamily: "'Inter', sans-serif",
                background: isLow
                  ? "rgba(220,38,38,0.88)"
                  : "rgba(0,0,0,0.5)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                color: "#fff",
                fontWeight: 600,
                border: `1px solid ${
                  isLow
                    ? "rgba(255,255,255,0.28)"
                    : "rgba(255,255,255,0.18)"
                }`,
                boxShadow: isLow
                  ? "0 8px 20px rgba(220,38,38,0.25)"
                  : "none",
              }}
            >
              {isLow && (
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: "#fff" }}
                />
              )}
              {event.ticketsLeft} Left
            </motion.span>
          </div>
        )}
        <EventDateBadge date={event.date} accentRgb={rgb} className="absolute top-3 right-3 rounded-[13px]" />

        {/* Bottom-left of image: category + optional invite */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          {(() => {
            const c = getCategoryColor(event.category, rgb);
            return (
              <span
                className="inline-flex items-center h-[22px] px-2.5 rounded-full text-[9px] tracking-[1.5px] uppercase leading-none"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  background: `linear-gradient(${c.scrim}, ${c.scrim}), rgba(${c.rgb},${c.tint})`,
                  backdropFilter: "blur(10px)",
                  color: `rgba(${c.rgb},${c.text})`,
                  border: `1px solid rgba(${c.rgb},${c.border})`,
                  fontWeight: 600,
                }}
              >
                {event.category}
              </span>
            );
          })()}
          {event.eventType === "inviteOnly" && (
            <span
              className="inline-flex items-center h-[22px] gap-1 px-2 rounded-full text-[9px] tracking-[1.4px] uppercase leading-none"
              style={{
                fontFamily: "'Inter', sans-serif",
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(10px)",
                color: "#fff",
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              {event.inviteWaitlistOnly ? (
                <Hourglass
                  className="w-2.5 h-2.5"
                  strokeWidth={2.25}
                />
              ) : (
                <Lock
                  className="w-2.5 h-2.5"
                  strokeWidth={2.5}
                />
              )}
              {event.inviteWaitlistOnly ? "Waitlist" : "Invite"}
            </span>
          )}
        </div>

        {/* Live countdown — same-day & tomorrow only */}
        {!isSoldOut && <CountdownBadge event={event} />}
      </div>

      {/* Footer */}
      <div className="px-3.5 pt-3 pb-3 flex flex-col gap-2">
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
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full"
            style={{
              background: isSoldOut
                ? isDark
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(0,0,0,0.10)"
                : accent,
              color: isSoldOut
                ? isDark
                  ? "rgba(255,255,255,0.55)"
                  : "rgba(0,0,0,0.55)"
                : "#0a0a0a",
              border: isSoldOut
                ? `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}`
                : "1px solid transparent",
              boxShadow: "none",
            }}
          >
            <span
              className="text-[9px] tracking-[1.1px] uppercase"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
              }}
            >
              {isSoldOut ? "Sold Out" : "Tickets"}
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


