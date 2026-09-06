import { useState } from "react";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { useImageColor } from "@/lib/hooks/useImageColor";
import { useTheme } from "@/app/components/ThemeContext";
import type { Event } from "@/types";
import { parseDateParts, readableAccent } from "./discoveryCardUtils";
import { useProminentHue } from "@/lib/hooks/useProminentHue";
import { PosterCarousel } from "./PosterCarousel";
import { FeaturedEventCard } from "./FeaturedEventCard";
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

function MagazineMeta({
  label,
  value,
  isDark,
  grow = false,
  truncate = false,
  valueColor,
}: {
  label: string;
  value: string;
  isDark: boolean;
  grow?: boolean;
  truncate?: boolean;
  valueColor?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-1 px-4 py-3 ${grow ? "flex-1 min-w-0" : "flex-shrink-0"}`}
    >
      <span
        className="text-[9px] tracking-[2px] uppercase leading-none"
        style={{
          fontFamily: "'Inter', sans-serif",
          color: isDark
            ? "rgba(255,255,255,0.4)"
            : "rgba(0,0,0,0.4)",
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <span
        className={`text-[15px] leading-none tracking-[-0.3px] ${truncate ? "truncate" : ""}`}
        style={{
          fontFamily: "'Zalando Sans Expanded', sans-serif",
          color: valueColor ?? (isDark ? "#fff" : "#0a0a0a"),
          fontWeight: 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function FeaturedMagazine({
  events,
  onSelectEvent,
  initialActiveIdx = 0,
  onActiveIdxChange,
}: {
  events: Event[];
  onSelectEvent: (e: Event) => void;
  initialActiveIdx?: number;
  onActiveIdxChange?: (i: number) => void;
}) {
  const { isDark } = useTheme();
  const [activeIdx, setActiveIdx] = useState(initialActiveIdx);
  const [paused, setPaused] = useState(false);
  const safeIdx = Math.min(activeIdx, events.length - 1);
  const hero = events[safeIdx];
  const { rgb } = useImageColor(hero?.image || "");
  const hued = useProminentHue(hero?.image || "", rgb, isDark);
  const { day, month } = parseDateParts(hero?.date || "");
  const accent = isDark ? "#d6f905" : "#d6f905";
  const accentText = isDark ? "#d6f905" : "#0a0a0a";

  // Readable accent derived from the poster — keeps the poster's actual hue
  // (and a little saturation) but clamps lightness so it stays legible without
  // washing out to plain white/black.
  const dateRgb = readableAccent(rgb, isDark);

  if (!hero) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Bold poster-card layout — image clipped on a grid, with oversized typography breaking out */}
      <div
        className="relative rounded-[36px] overflow-hidden"
        style={{
          background: isDark
            ? `radial-gradient(ellipse 60% 80% at 0% 0%, rgba(${hued},0.22) 0%, rgba(${hued},0.06) 45%, transparent 75%), #0a0a0a`
            : `radial-gradient(ellipse 60% 80% at 0% 0%, rgba(${hued},0.18) 0%, rgba(${hued},0.05) 45%, transparent 75%), #ffffff`,
          border: "none",
        }}
      >
        <GlassReflection isDark={isDark} />
        {/* Ticker strip across top */}
        <div
          className="relative overflow-hidden border-b"
          style={{
            borderColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.06)",
            background: isDark
              ? "rgba(0,0,0,0.4)"
              : "rgba(0,0,0,0.02)",
          }}
        >
          <div className="flex items-center gap-12 py-2.5 px-6 whitespace-nowrap overflow-hidden">
            <motion.div
              className="flex items-center gap-12"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                duration: 40,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              {[...events, ...events, ...events].map((e, i) => (
                <span
                  key={i}
                  className="flex items-center gap-3 text-[10px] tracking-[2.5px] uppercase"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: isDark
                      ? "rgba(255,255,255,0.5)"
                      : "rgba(0,0,0,0.45)",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: accent }}>★</span>
                  {e.name}
                  <span
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.15)",
                    }}
                  >
                    ·
                  </span>
                  {parseDateParts(e.date).day}{" "}
                  {parseDateParts(e.date).month}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-0 h-[560px] lg:h-[600px]">
          {/* LEFT — typography column with stylized date */}
          <motion.div
            key={`text-${hero.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="col-span-12 lg:col-span-7 relative px-8 lg:px-12 py-8 flex flex-col justify-center gap-6 h-full"
          >
            {/* TOP — square date stamp (dynamic color, mobile-style) */}
            <div className="flex items-start">
              <div
                className="flex flex-col items-center justify-center rounded-2xl flex-shrink-0"
                style={{
                  width: 100,
                  height: 100,
                  border: `1.5px solid rgba(${dateRgb},0.75)`,
                  background: isDark
                    ? `rgba(${rgb},0.1)`
                    : `rgba(${rgb},0.08)`,
                }}
              >
                <span
                  className="leading-none tracking-[3px] uppercase text-[12px] mb-1.5"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: `rgb(${dateRgb})`,
                    fontWeight: 700,
                  }}
                >
                  {month}
                </span>
                <span
                  className="leading-[0.8] tracking-[-2px] text-[46px]"
                  style={{
                    fontFamily:
                      "'Zalando Sans Expanded', sans-serif",
                    color: isDark ? "#fff" : "#0a0a0a",
                    fontWeight: 300,
                  }}
                >
                  {day}
                </span>
              </div>
            </div>

            {/* MIDDLE — title with the category tag stuck on its bottom-left */}
            <div className="relative inline-block pb-4">
              {/* Title — full text, font scales down with length so it fits ~2 lines without truncating */}
              <h3
                className="tracking-[-2px] leading-[0.95]"
                style={{
                  fontFamily:
                    "'Zalando Sans Expanded', sans-serif",
                  fontWeight: 300,
                  fontSize:
                    hero.name.length > 34
                      ? "clamp(32px, 3.2vw, 46px)"
                      : hero.name.length > 22
                        ? "clamp(38px, 4vw, 58px)"
                        : "clamp(46px, 5vw, 74px)",
                  color: isDark ? "#fff" : "#0a0a0a",
                }}
              >
                {hero.name}
              </h3>
              {/* Category tag — event-card style (translucent dynamic color),
                  stuck like a sticker on the bottom-left of the title text */}
              {/* <div
                className="absolute bottom-0 left-0 inline-flex items-center h-7 px-3 rounded-full"
                style={{
                  background: isDark ? `rgba(${rgb},0.16)` : `rgba(${rgb},0.14)`,
                  border: `1px solid rgba(${rgb},0.45)`,
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  transform: "rotate(-3deg)",
                  boxShadow: isDark
                    ? "0 8px 20px rgba(0,0,0,0.4)"
                    : "0 8px 20px rgba(0,0,0,0.18)",
                }}
              >
                <span
                  className="text-[10px] tracking-[2px] uppercase leading-none"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    color: `rgb(${dateRgb})`,
                  }}
                >
                  {hero.category}
                </span>
              </div> */}
            </div>

            {/* BOTTOM — meta row + CTA */}
            <div className="flex flex-col gap-5">
              {/* Doors · Venue · Tickets left — fixed width so the width stays
                  constant across events and the switch animation is consistent.
                  Venue flexes + truncates within so it never hogs the row. */}
              <div
                className="flex items-stretch self-start rounded-2xl overflow-hidden"
                style={{
                  width: 440,
                  maxWidth: "100%",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
                  background: isDark
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(0,0,0,0.015)",
                }}
              >
                <MagazineMeta
                  label="Doors"
                  value={hero.time}
                  isDark={isDark}
                />
                <div
                  className="w-px self-stretch my-3"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.07)",
                  }}
                />
                <MagazineMeta
                  label="Venue"
                  value={hero.venue}
                  isDark={isDark}
                  grow
                  truncate
                />
                <div
                  className="w-px self-stretch my-3"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.07)",
                  }}
                />
                <MagazineMeta
                  label="Tickets left"
                  value={String(hero.ticketsLeft)}
                  isDark={isDark}
                  valueColor={accentText}
                />
              </div>

              {/* CTA */}
              <AppButton
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectEvent(hero)}
                className="group relative flex items-center justify-between gap-3 pl-7 pr-2 py-2.5 rounded-full w-full sm:w-auto self-start"
                style={{
                  background: isDark ? accent : "#0a0a0a",
                  color: isDark ? "#0a0a0a" : accent,
                }}
              >
                <span
                  className="text-[13px] tracking-[1.8px] uppercase"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                  }}
                >
                  Get tickets
                </span>
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    background: isDark
                      ? "rgba(0,0,0,0.15)"
                      : "rgba(214,249,5,0.18)",
                  }}
                >
                  <ChevronRight
                    className="w-4 h-4"
                    strokeWidth={3}
                  />
                </span>
              </AppButton>
            </div>
          </motion.div>

          {/* RIGHT — poster coverflow slider (same interaction as mobile) */}
          <div className="col-span-12 lg:col-span-5 relative h-full py-8 lg:py-12 px-4">
            <PosterCarousel
              events={events}
              onSelectEvent={onSelectEvent}
              controlledActive={safeIdx}
              onActiveChange={(i) => { setActiveIdx(i); onActiveIdxChange?.(i); }}
              paused={paused}
            />
          </div>
        </div>

        {/* Bottom navigator strip — Headliners label + equal-width thumbnails */}
        <div
          className="relative border-t px-4 py-3 flex items-center gap-3"
          style={{
            borderColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.06)",
            background: isDark
              ? "rgba(0,0,0,0.3)"
              : "rgba(0,0,0,0.015)",
          }}
        >
          {/* Headliners label */}
          {/* <div
            className="flex items-center gap-2 flex-shrink-0 pr-3 mr-1"
            style={{
              borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
            }}
          >
            <div className="relative flex items-center justify-center w-2 h-2 flex-shrink-0">
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: accent, opacity: 0.5 }}
              />
              <span
                className="relative w-2 h-2 rounded-full"
                style={{ background: accent }}
              />
            </div>
            <span
              className="text-[11px] tracking-[1.5px] uppercase whitespace-nowrap"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                color: isDark
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(0,0,0,0.8)",
              }}
            >
              Headliners
            </span>
          </div> */}
          {events.map((e, i) => {
            const isActive = i === safeIdx;
            return (
              <AppButton
                key={e.id}
                onClick={() => { setActiveIdx(i); onActiveIdxChange?.(i); }}
                onMouseEnter={() => { setActiveIdx(i); onActiveIdxChange?.(i); }}
                whileTap={{ scale: 0.98 }}
                className="relative flex-1 min-w-0 flex items-center gap-2.5 overflow-hidden px-2 py-2 rounded-xl transition-colors"
                style={{
                  background: isActive
                    ? isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.05)"
                    : "transparent",
                  border: "none",
                }}
              >
                {isActive && <GlassReflection isDark={isDark} />}
                <div className="relative z-10 w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={e.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-lg"
                      style={{
                        boxShadow: `inset 0 0 0 2px ${accent}`,
                      }}
                    />
                  )}
                </div>
                <div className="relative z-10 flex flex-col items-start min-w-0">
                  <span
                    className="text-[9px] tracking-[1.5px] uppercase leading-none"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      color: isActive
                        ? accentText
                        : isDark
                          ? "rgba(255,255,255,0.4)"
                          : "rgba(0,0,0,0.35)",
                      fontWeight: 700,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="mt-1 text-[11px] leading-none truncate w-full text-left"
                    style={{
                      fontFamily:
                        "'Zalando Sans Expanded', sans-serif",
                      color: isActive
                        ? isDark
                          ? "#fff"
                          : "#0a0a0a"
                        : isDark
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.5)",
                      fontWeight: 400,
                    }}
                  >
                    {e.name}
                  </span>
                </div>
              </AppButton>
            );
          })}
        </div>
      </div>
    </div>
  );
}
