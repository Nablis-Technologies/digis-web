import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { useTheme } from "@/app/components/ThemeContext";
import type { Event } from "@/types";
import { GlassReflection } from "@/components/primitives/GlassReflection";

const AUTO_SCROLL_MS = 4500; // auto-advance interval
const INTERACT_PAUSE_MS = 8000; // pause auto-scroll after a user interaction

// Shortest signed distance from a card index to the continuous position,
// wrapped around so the carousel loops seamlessly (no empty side).
function wrapDelta(
  index: number,
  v: number,
  n: number,
): number {
  let d = (((index - v) % n) + n) % n; // 0..n
  if (d > n / 2) d -= n; // -n/2..n/2
  return d;
}

/* ─── Desktop poster coverflow ─────────────────────────────
   Same coverflow interaction/animation as the mobile carousel, but renders
   ONLY the poster images (no date/price/CTA card chrome). Controlled by the
   parent so it stays in sync with the magazine's text column + thumbnails. */
export function PosterCarousel({
  events,
  onSelectEvent,
  controlledActive,
  onActiveChange,
  paused = false,
}: {
  events: Event[];
  onSelectEvent: (event: Event) => void;
  controlledActive?: number;
  onActiveChange?: (i: number) => void;
  paused?: boolean;
}) {
  const n = events.length;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [active, setActive] = useState(0); // unbounded — loops via modulo
  const activeRef = useRef(0);
  const movedRef = useRef(false);
  const pausedUntilRef = useRef(0);
  const pos = useMotionValue(0);

  // Portrait posters (4:5), sized to fit the column height, capped by width.
  const posterH = Math.min(Math.max(size.h - 24, 0), 460);
  const byHeight = posterH * 0.8; // width from 4:5 ratio
  const byWidth = size.w * 0.66;
  const cardW = Math.min(byHeight, byWidth);
  const cardH = cardW * 1.25;
  // Tighter step → inactive posters tuck closer behind the active one.
  const step = cardW * 0.42;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () =>
      setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    const controls = animate(pos, active, {
      type: "spring",
      stiffness: 300,
      damping: 36,
    });
    return () => controls.stop();
  }, [active, pos]);

  const pause = () => {
    pausedUntilRef.current = Date.now() + INTERACT_PAUSE_MS;
  };

  const commit = (next: number) => {
    activeRef.current = next;
    setActive(next);
    onActiveChange?.(((next % n) + n) % n);
  };

  // Follow externally-driven active index (thumbnail nav).
  useEffect(() => {
    if (controlledActive == null) return;
    const cur = activeRef.current;
    const curMod = ((cur % n) + n) % n;
    if (controlledActive === curMod) return;
    let diff = controlledActive - curMod;
    if (diff > n / 2) diff -= n;
    if (diff < -n / 2) diff += n;
    activeRef.current = cur + diff;
    setActive(cur + diff);
  }, [controlledActive, n]);

  // Auto-scroll (paused on hover or recent interaction)
  useEffect(() => {
    if (paused || n <= 1) return;
    const id = setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      commit(activeRef.current + 1);
    }, AUTO_SCROLL_MS);
    return () => clearInterval(id);
  }, [paused, n]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-full flex items-center justify-center select-none isolate"
      style={{ perspective: 2000, touchAction: "pan-y" }}
    >
      {cardW > 0 &&
        events.map((event, i) => (
          <PosterCard
            key={event.id}
            event={event}
            index={i}
            n={n}
            pos={pos}
            step={step}
            cardW={cardW}
            cardH={cardH}
          />
        ))}

      {/* Drag / tap layer */}
      <motion.div
        className="absolute inset-0 z-20"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDragStart={() => {
          movedRef.current = false;
          pause();
        }}
        onDrag={(_, info) => {
          if (!step) return;
          if (Math.abs(info.offset.x) > 6)
            movedRef.current = true;
          pos.set(activeRef.current - info.offset.x / step);
        }}
        onDragEnd={(_, info) => {
          pause();
          const threshold = step * 0.18;
          if (
            info.offset.x < -threshold ||
            info.velocity.x < -350
          )
            commit(activeRef.current + 1);
          else if (
            info.offset.x > threshold ||
            info.velocity.x > 350
          )
            commit(activeRef.current - 1);
          else
            animate(pos, activeRef.current, {
              type: "spring",
              stiffness: 300,
              damping: 36,
            });
        }}
        onClick={(e) => {
          if (movedRef.current) return;
          const rect = wrapRef.current?.getBoundingClientRect();
          if (rect) {
            const rel = (e.clientX - rect.left) / rect.width;
            if (rel < 0.3) {
              pause();
              commit(activeRef.current - 1);
              return;
            }
            if (rel > 0.7) {
              pause();
              commit(activeRef.current + 1);
              return;
            }
          }
          onSelectEvent(
            events[((activeRef.current % n) + n) % n],
          );
        }}
        style={{ cursor: "grab" }}
      />
    </div>
  );
}

function PosterCard({
  event,
  index,
  n,
  pos,
  step,
  cardW,
  cardH,
}: {
  event: Event;
  index: number;
  n: number;
  pos: MotionValue<number>;
  step: number;
  cardW: number;
  cardH: number;
}) {
  const { isDark } = useTheme();
  const x = useTransform(
    pos,
    (v: number) => wrapDelta(index, v, n) * step,
  );
  const scale = useTransform(
    pos,
    (v: number) =>
      1 - Math.min(Math.abs(wrapDelta(index, v, n)), 2) * 0.14,
  );
  const opacity = useTransform(
    pos,
    (v: number) =>
      1 - Math.min(Math.abs(wrapDelta(index, v, n)), 2.4) * 0.4,
  );
  const filter = useTransform(pos, (v: number) => {
    const d = Math.min(Math.abs(wrapDelta(index, v, n)), 1);
    return `brightness(${1 - d * 0.42}) saturate(${1 - d * 0.25}) blur(${d * 1.5}px)`;
  });
  const rotateY = useTransform(pos, (v: number) => {
    // Cap at ±1 so the far posters don't over-rotate and look stretched,
    // but keep the tilt clearly visible.
    const d = Math.max(-1, Math.min(1, wrapDelta(index, v, n)));
    return -d * 24;
  });
  const zIndex = useTransform(
    pos,
    (v: number) =>
      100 - Math.round(Math.abs(wrapDelta(index, v, n)) * 10),
  );
  const display = useTransform(pos, (v: number) =>
    Math.abs(wrapDelta(index, v, n)) > 2.1 ? "none" : "block",
  );

  return (
    <motion.div
      className="pointer-events-none absolute overflow-hidden rounded-[20px]"
      style={{
        width: cardW,
        height: cardH,
        left: "50%",
        top: "50%",
        marginLeft: -cardW / 2,
        marginTop: -cardH / 2,
        x,
        scale,
        rotateY,
        opacity,
        filter,
        zIndex,
        display,
        transformPerspective: 2000,
        transformStyle: "preserve-3d",
        boxShadow: isDark
          ? "0 30px 70px -30px rgba(0,0,0,0.7)"
          : "0 30px 70px -30px rgba(0,0,0,0.35)",
      }}
    >
      <GlassReflection isDark={isDark} />
      <img
        src={event.image}
        alt={event.name}
        className="relative z-10 w-full h-full object-cover"
        draggable={false}
      />
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </motion.div>
  );
}
