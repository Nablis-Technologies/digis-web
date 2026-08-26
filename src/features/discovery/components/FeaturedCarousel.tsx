import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { useTheme } from "@/app/components/ThemeContext";
import type { Event } from "@/types";
import { FeaturedEventCard } from "./FeaturedEventCard";
import { AppButton } from '@/components/primitives/AppButton';

const CARD_W_FRAC = 0.84; // active card width as fraction of container
const AUTO_SCROLL_MS = 4500; // auto-advance interval
const INTERACT_PAUSE_MS = 8000; // pause auto-scroll after a user interaction

function wrapDelta(
  index: number,
  v: number,
  n: number,
): number {
  let d = (((index - v) % n) + n) % n; // 0..n
  if (d > n / 2) d -= n; // -n/2..n/2
  return d;
}

export function FeaturedCarousel({
  events,
  onSelectEvent,
  onActiveChange,
  showDots = true,
  initialActive = 0,
}: {
  events: Event[];
  onSelectEvent: (event: Event) => void;
  onActiveChange?: (i: number) => void;
  showDots?: boolean;
  initialActive?: number;
}) {
  const n = events.length;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [active, setActive] = useState(initialActive);
  const activeRef = useRef(initialActive);
  const movedRef = useRef(false);
  const pausedUntilRef = useRef(0);
  const pos = useMotionValue(initialActive); // continuous position (index space, unbounded)

  const activeMod = ((active % n) + n) % n;
  const cardW = containerW * CARD_W_FRAC;
  // Step between card centers — tight enough that neighbors tuck behind the
  // active card (coverflow overlap), while the active card (higher z-index)
  // stays in front.
  const step = cardW * 0.6;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setContainerW(el.clientWidth);
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

  // Jump to a specific (mod-n) index via the shortest looped path.
  const goTo = (i: number) => {
    pause();
    const cur = activeRef.current;
    const curMod = ((cur % n) + n) % n;
    let diff = i - curMod;
    if (diff > n / 2) diff -= n;
    if (diff < -n / 2) diff += n;
    commit(cur + diff);
  };

  // Auto-scroll
  useEffect(() => {
    if (n <= 1) return;
    const id = setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      commit(activeRef.current + 1);
    }, AUTO_SCROLL_MS);
    return () => clearInterval(id);
  }, [n]);

  return (
    <div className="md:hidden">
      <div
        ref={wrapRef}
        className="relative overflow-hidden select-none isolate"
        style={{ touchAction: "pan-y" }}
      >
        {/* Invisible spacer in normal flow sets the container height */}
        <div
          className="invisible pointer-events-none mx-auto"
          style={{ width: cardW || "70%" }}
        >
          <FeaturedEventCard
            event={events[activeMod]}
            onClick={() => {}}
          />
        </div>

        {/* Absolutely-positioned cards */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ perspective: 1200 }}
        >
          {cardW > 0 &&
            events.map((event, i) => (
              <CarouselCard
                key={event.id}
                event={event}
                index={i}
                n={n}
                pos={pos}
                step={step}
                cardW={cardW}
              />
            ))}
        </div>

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
            // Reset moved flag so subsequent taps work
            movedRef.current = false;
          }}
          onClick={(e) => {
            if (movedRef.current) return;
            const rect =
              wrapRef.current?.getBoundingClientRect();
            if (rect) {
              // Only the thin peeking slivers at the very edges advance; the
              // whole active card (incl. the Tickets button) opens the event.
              const rel = (e.clientX - rect.left) / rect.width;
              if (rel < 0.07) {
                pause();
                commit(activeRef.current - 1);
                return;
              }
              if (rel > 0.93) {
                pause();
                commit(activeRef.current + 1);
                return;
              }
            }
            onSelectEvent(
              events[((activeRef.current % n) + n) % n],
            );
          }}
        />
      </div>

      {/* Pagination dots */}
      {showDots && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {events.map((event, i) => (
            <Dot
              key={event.id}
              index={i}
              n={n}
              pos={pos}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CarouselCard({
  event,
  index,
  n,
  pos,
  step,
  cardW,
}: {
  event: Event;
  index: number;
  n: number;
  pos: MotionValue<number>;
  step: number;
  cardW: number;
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
    // Dark mode: darken inactive cards. Light mode: keep brightness so cards
    // fade into the white background via opacity instead of going dark.
    const brightness = isDark ? 1 - d * 0.42 : 1;
    return `brightness(${brightness}) saturate(${1 - d * 0.25}) blur(${d * 1.5}px)`;
  });
  // Subtle coverflow tilt as cards move along the x-axis: side cards angle
  // inward toward the active one. Capped so it stays subtle.
  const rotateY = useTransform(pos, (v: number) => {
    const d = Math.max(
      -1.4,
      Math.min(1.4, wrapDelta(index, v, n)),
    );
    return -d * 18;
  });
  const zIndex = useTransform(
    pos,
    (v: number) =>
      100 - Math.round(Math.abs(wrapDelta(index, v, n)) * 10),
  );
  const display = useTransform(pos, (v: number) =>
    Math.abs(wrapDelta(index, v, n)) > 2.3 ? "none" : "block",
  );

  return (
    <motion.div
      className="absolute top-0"
      style={{
        width: cardW,
        left: "50%",
        marginLeft: -cardW / 2,
        x,
        scale,
        rotateY,
        opacity,
        filter,
        zIndex,
        display,
        transformPerspective: 1200,
        transformStyle: "preserve-3d",
      }}
    >
      <FeaturedEventCard event={event} onClick={() => {}} />
    </motion.div>
  );
}

function Dot({
  index,
  n,
  pos,
  onClick,
}: {
  index: number;
  n: number;
  pos: MotionValue<number>;
  onClick: () => void;
}) {
  const { isDark } = useTheme();
  const width = useTransform(pos, (v: number) =>
    Math.abs(wrapDelta(index, v, n)) < 0.5 ? 18 : 6,
  );
  const opacity = useTransform(pos, (v: number) =>
    Math.abs(wrapDelta(index, v, n)) < 0.5 ? 1 : 0.35,
  );
  return (
    <AppButton
      onClick={onClick}
      className="h-1.5 rounded-full cursor-pointer"
      style={{
        width,
        opacity,
        background: isDark ? "#d6f905" : "#0a0a0a",
      }}
      aria-label={`Go to featured ${index + 1}`}
    />
  );
}


