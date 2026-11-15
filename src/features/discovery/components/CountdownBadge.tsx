import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Radio, Clock } from "lucide-react";
import {
  formatCountdown,
  getEventStart,
  getEventUrgency,
} from "./discoveryCardUtils";
import type { Event } from "@/types";

/**
 * Live, ticking countdown overlaid on the event card image.
 * Renders only for same-day ("today") and next-day ("tomorrow") events to
 * create urgency. Returns null otherwise so other cards are unaffected.
 */
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
            ? "0 0 0 1px rgba(255,255,255,0.3), 0 8px 20px rgba(220,38,38,0.3)"
            : "0 0 0 1px rgba(214,249,5,0.4), 0 8px 20px rgba(0,0,0,0.3)",
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
