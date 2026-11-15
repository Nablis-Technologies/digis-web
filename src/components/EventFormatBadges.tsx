import { motion } from "motion/react";
import { CalendarRange, Repeat } from 'lucide-react';

/**
 * Card-level vocabulary for multi-day and recurring events.
 * Everything sits on imagery or the card footer and follows the app rules:
 * lime only on dark surfaces, olive ink in light mode.
 * Pure visuals: all labels arrive preformatted.
 */

const INTER = "'Inter', sans-serif";

export interface FeaturedDateRangeBadgeProps {
  /** Preformatted month label, e.g. "AUG" or "AUG–SEP". */
  month: string;
  /** Preformatted day range, e.g. "28–30". */
  range: string;
  accentRgb: string;
  size?: "regular" | "featured";
  tone?: "standard" | "featured";
  className?: string;
}

/** Multi-day badge: same month/day construction as EventDateBadge, day range in the body. */
export function FeaturedDateRangeBadge({ month, range, accentRgb, size = "regular", tone = "standard", className = "" }: FeaturedDateRangeBadgeProps) {
  const featured = tone === "featured";
  const dims = size === "featured" ? "h-8 min-w-8" : "h-11 min-w-11";
  const daySize = size === "featured" ? "text-[10px]" : "text-[13px]";
  const header = featured ? `linear-gradient(rgba(7,10,14,0.39), rgba(7,10,14,0.39)), rgba(${accentRgb},0.35)` : `linear-gradient(rgba(255,255,255,0.90), rgba(255,255,255,0.90)), rgba(${accentRgb},0.14)`;
  const body = featured ? `linear-gradient(rgba(7,10,14,0.24), rgba(7,10,14,0.24)), rgba(${accentRgb},0.45)` : `linear-gradient(rgba(255,255,255,0.74), rgba(255,255,255,0.74)), rgba(${accentRgb},0.20)`;
  return (
    <div className={`inline-flex flex-col ${dims} overflow-hidden rounded-[10px] ${className}`}
      style={{ background: featured ? `rgba(${accentRgb},0.32)` : "rgba(255,255,255,0.78)", boxShadow: featured ? "none" : "0 6px 16px rgba(0,0,0,0.16)" }}>
      <div className="h-[38%] px-1.5 flex items-center justify-center" style={{ background: header }}>
        <span className="text-[8px] tracking-[1px] leading-none whitespace-nowrap translate-y-[1px]" style={{ fontFamily: INTER, fontWeight: 800, color: featured ? "rgba(255,255,255,0.66)" : "rgba(10,10,10,0.58)" }}>{month}</span>
      </div>
      <div className="h-[62%] px-1.5 flex items-center justify-center" style={{ background: body }}>
        <span className={`leading-none -translate-y-[2px] whitespace-nowrap tabular-nums ${daySize}`} style={{ fontFamily: INTER, fontWeight: 800, color: featured ? "#fff" : "#111214" }}>{range}</span>
      </div>
    </div>
  );
}

export interface DateRangeBadgeProps {
  /** Preformatted month label, e.g. "AUG" or "AUG–SEP". */
  month: string;
  /** Preformatted day range, e.g. "28–30". */
  range: string;
  /** Number of days shown in the "N DAYS" strip. */
  dayCount: number;
  accentRgb: string;
  className?: string;
}

/** Event-card multi-day badge: month + day range on glass white, black "N DAYS" strip below. */
export function DateRangeBadge({ month, range, dayCount, accentRgb, className = "" }: DateRangeBadgeProps) {
  return (
    <div className={`inline-flex flex-col w-[66px] h-[67px] overflow-clip rounded-[12px] backdrop-blur-[10px] ${className}`}
      style={{ background: "rgba(255,255,255,0.8)", boxShadow: "0 6px 16px rgba(0,0,0,0.16)" }}>
      <div className="h-[37px] shrink-0 flex flex-col items-center justify-center gap-[3px]" style={{ backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0.9)), linear-gradient(90deg, rgba(${accentRgb},0.14), rgba(${accentRgb},0.14))` }}>
        <p className="text-[8px] leading-[8px] tracking-[1px] text-center whitespace-nowrap" style={{ fontFamily: INTER, fontWeight: 800, color: "rgba(10,10,10,0.58)" }}>{month}</p>
        <p className="text-[15px] leading-[15px] text-center whitespace-nowrap tabular-nums" style={{ fontFamily: INTER, fontWeight: 800, color: "#111214" }}>{range}</p>
      </div>
      <div className="flex-1 flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <p className="text-[7.5px] leading-[7.5px] tracking-[1.4px] pl-[1.4px] text-center whitespace-nowrap" style={{ fontFamily: INTER, fontWeight: 800, color: "#d6f905" }}>{dayCount} DAYS</p>
      </div>
    </div>
  );
}

export interface FormatTagProps {
  /** Event format; single-session events render nothing. */
  format: "single" | "multiDay" | "recurring";
  /** Preformatted uppercase label, e.g. "3-DAY FESTIVAL" or "WEEKLY · THU". */
  label: string;
  isDark: boolean;
  size?: "sm" | "md";
}

/** Format tag above the title: "▦ 3-DAY FESTIVAL" / "⟳ WEEKLY · THU" — the icon names the format. */
export function FormatTag({ format, label, isDark, size = "sm" }: FormatTagProps) {
  if (format === "single") return null;
  // Secondary info: a pale, softened lime and lighter weight so it sits under the title instead of competing with it.
  const ink = isDark ? "rgba(236,252,160,0.78)" : "rgba(74,88,0,0.72)";
  const text = size === "md" ? "text-[9.5px]" : "text-[8px]";
  return (
    <span className={`inline-flex items-center gap-1 ${text} tracking-[1.2px] leading-none`} style={{ fontFamily: INTER, fontWeight: 600, color: ink }}>
      {format === "recurring"
        ? <Repeat className={size === "md" ? "w-2.5 h-2.5" : "w-2 h-2"} strokeWidth={2.25} />
        : <CalendarRange className={size === "md" ? "w-2.5 h-2.5" : "w-2 h-2"} strokeWidth={2.25} />}
      <span>{label}</span>
    </span>
  );
}

export interface SessionPillProps {
  /** Relative label, e.g. "TONIGHT" or "THIS THU". */
  label: string;
  /** Trailing text, e.g. "8:00 PM" (tonight) or "AUG 28". */
  tail: string;
  isTonight: boolean;
  className?: string;
}

/** Next-session pill for imagery: "TONIGHT • 8:00 PM" (lime glow) or "THIS THU • AUG 28". */
export function SessionPill({ label, tail, isTonight, className = "" }: SessionPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-[24px] px-2.5 rounded-full text-[9px] tracking-[1.3px] leading-none whitespace-nowrap ${className}`}
      style={{
        fontFamily: INTER,
        fontWeight: 800,
        color: isTonight ? "#d6f905" : "#fff",
        background: "rgba(10,10,10,0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: isTonight
          ? `inset 0 0 0 1px rgba(214,249,5,0.75)`
          : `inset 0 1px 0 rgba(255,255,255,0.18)`,
      }}
    >
      {isTonight && (
        <motion.span className="w-1.5 h-1.5 rounded-full bg-[#d6f905]" animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
      )}
      {label} <span className="opacity-50">•</span> {tail}
    </span>
  );
}

export interface OccurrenceChip {
  id: string;
  /** Preformatted short date, e.g. "Thu Aug 28". */
  label: string;
  soldOut?: boolean;
}

export interface OccurrenceStripProps {
  /** Sessions to show (already sliced, max 3). */
  sessions: OccurrenceChip[];
  /** Count shown in the trailing "+N" chip; 0 hides it. */
  moreCount?: number;
  isDark: boolean;
}

/** Three upcoming-session micro chips: "Thu Aug 28 · Thu Sep 04 · Thu Sep 11 +". */
export function OccurrenceStrip({ sessions, moreCount = 0, isDark }: OccurrenceStripProps) {
  if (!sessions.length) return null;
  const chip = isDark ? { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.72)" } : { background: "rgba(0,0,0,0.045)", color: "rgba(0,0,0,0.66)" };
  return (
    <div className="flex items-center gap-1 min-w-0 overflow-hidden">
      {sessions.map((s) => (
        <span key={s.id} className="flex-shrink-0 h-[20px] inline-flex items-center px-1.5 rounded-[6px] text-[8.5px] leading-none tabular-nums whitespace-nowrap" style={{ fontFamily: INTER, fontWeight: 600, ...chip, textDecoration: s.soldOut ? "line-through" : undefined }}>
          {s.label}
        </span>
      ))}
      {moreCount > 0 && (
        <span className="flex-shrink-0 h-[20px] inline-flex items-center px-1.5 rounded-[6px] text-[8.5px] leading-none" style={{ fontFamily: INTER, fontWeight: 800, ...chip, color: isDark ? "#d6f905" : "#4a5800" }}>
          +{moreCount}
        </span>
      )}
    </div>
  );
}
