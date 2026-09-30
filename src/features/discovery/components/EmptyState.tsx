import { motion } from "motion/react";
import { useMemo } from "react";
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
  Bell,
  Compass,
  Search,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/app/components/ThemeContext";
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge } from '@/lib/ui/glass';

const categoryIcons: Record<string, typeof Music> = {
  All: LayoutGrid,
  Music: Music,
  Sports: Trophy,
  Nightlife: PartyPopper,
  Culture: Landmark,
  Food: UtensilsCrossed,
  Art: Palette,
  Comedy: Laugh,
  Fitness: Dumbbell,
  Film: Clapperboard,
  Tech: Cpu,
  Wellness: Heart,
  Education: GraduationCap,
  "Spoken Word": Mic2,
};

// Short, playful copy per category — the headline stays human, never error-y.
const categoryCopy: Record<string, string> = {
  Music: "The stage is set — no acts have been announced just yet.",
  Sports: "The field is empty. The next fixture hasn't been scheduled.",
  Nightlife: "Lights are low and the floor is quiet. No parties dropped yet.",
  Culture: "We're between exhibitions right now. Something's coming.",
  Food: "Kitchen's prepping — no tastings on the menu just yet.",
  Art: "The walls are blank, waiting for the next show.",
  Comedy: "Mic's on the stand, but no sets are booked yet.",
  Fitness: "Mats are rolled out — no sessions scheduled yet.",
  Film: "Projector's warm, but the reel's empty for now.",
  Tech: "No talks or meetups on the calendar right now.",
  Wellness: "Breathe easy — no sessions are scheduled yet.",
  Education: "The chalkboard's clean. No classes posted yet.",
  "Spoken Word": "The mic awaits its next voice.",
};

interface EmptyStateProps {
  selectedCategory: string;
  searchQuery?: string;
  onReset: () => void;
}

const brand = "#d6f905";

export function EmptyState({
  selectedCategory,
  searchQuery,
  onReset,
}: EmptyStateProps) {
  const { isDark } = useTheme();
  const isSearch = !!searchQuery?.trim();
  const Icon = isSearch
    ? Search
    : categoryIcons[selectedCategory] ?? Compass;

  const headline = isSearch
    ? "Nothing matched that"
    : selectedCategory === "All"
      ? "A clean slate"
      : `No ${selectedCategory.toLowerCase()} events — yet`;

  const subline = isSearch
    ? `We couldn't find anything for "${searchQuery!.trim()}". Try a different spelling or a broader search.`
    : selectedCategory === "All"
      ? "There are no upcoming events on Digis right now. New drops land all the time — check back soon."
      : categoryCopy[selectedCategory] ??
        "No upcoming events in this category right now.";

  const subtle = isDark ? "rgba(255,255,255,0.55)" : "rgba(26,26,46,0.6)";

  // Deterministic drifting starfield — generated once.
  const stars = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        id: i,
        left: `${(i * 47) % 100}%`,
        top: `${(i * 83) % 100}%`,
        size: (i % 3) + 1.5,
        delay: (i % 7) * 0.4,
        dur: 2.4 + (i % 5) * 0.6,
      })),
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="px-4 sm:px-6 lg:px-8"
    >
      <div
        className="relative overflow-hidden rounded-[32px] px-6 py-16 sm:py-24 mx-auto max-w-2xl"
        style={{
          background: isDark
            ? "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.012) 100%)"
            : "linear-gradient(180deg, #edecf7 0%, #f4f3ee 42%, #e7e6f1 100%)",
          border: 'none',
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <GlassReflection isDark={isDark} />
        {/* Drifting aurora blobs */}
        <motion.div
          className="absolute -top-32 -left-20 w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${isDark ? "rgba(217,255,0,0.16)" : "rgba(214,249,5,0.2)"} 0%, transparent 62%)`,
            filter: "blur(8px)",
          }}
          animate={{ x: [0, 40, 0], y: [0, 24, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-16 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${isDark ? "rgba(120,200,255,0.12)" : "rgba(150,180,255,0.16)"} 0%, transparent 62%)`,
            filter: "blur(8px)",
          }}
          animate={{ x: [0, -36, 0], y: [0, -20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Bottom vignette for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? "radial-gradient(ellipse 120% 80% at 50% 120%, rgba(0,0,0,0.5), transparent 70%)"
              : "radial-gradient(ellipse 120% 80% at 50% 120%, rgba(0,0,0,0.04), transparent 70%)",
          }}
        />

        {/* Twinkling starfield */}
        {stars.map((s) => (
          <motion.span
            key={s.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              background: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.25)",
            }}
            animate={{ opacity: [0, 1, 0], scale: [0.6, 1, 0.6] }}
            transition={{
              duration: s.dur,
              delay: s.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        <div className="relative flex flex-col items-center text-center">
          {/* Floating stack of colorful Digis event-pass tickets */}
          <div className="relative w-[220px] h-[180px] mb-10">
            {[
              // back-left — violet
              {
                rot: -16, x: -56, delay: 0, scale: 0.85, op: 0.95,
                grad: "linear-gradient(155deg, #a78bfa 0%, #6d28d9 100%)",
                text: "#fff", sub: "rgba(255,255,255,0.7)",
                glow: "rgba(124,58,237,0.45)", border: "rgba(167,139,250,0.6)",
              },
              // back-right — cyan
              {
                rot: 14, x: 56, delay: 0.1, scale: 0.9, op: 0.97,
                grad: "linear-gradient(155deg, #22d3ee 0%, #0e7490 100%)",
                text: "#fff", sub: "rgba(255,255,255,0.75)",
                glow: "rgba(34,211,238,0.45)", border: "rgba(103,232,249,0.6)",
              },
              // front — brand lime
              {
                rot: 0, x: 0, delay: 0.2, scale: 1, op: 1,
                grad: "linear-gradient(155deg, #e9ff4d 0%, #b6dd00 100%)",
                text: "#0a0a0a", sub: "rgba(10,10,10,0.6)",
                glow: "rgba(214,249,5,0.6)", border: "rgba(180,221,0,0.9)",
              },
            ].map((card, i) => {
              const front = i === 2;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 36, rotate: card.rot * 0.4 }}
                  animate={{
                    opacity: card.op,
                    y: [0, front ? -10 : -5, 0],
                    rotate: card.rot,
                  }}
                  transition={{
                    opacity: { delay: card.delay, duration: 0.5 },
                    rotate: { delay: card.delay, duration: 0.5 },
                    y: {
                      delay: card.delay + 0.5,
                      duration: 3.6 + i * 0.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }}
                  className="absolute left-1/2 top-1/2 w-[130px] h-[158px] rounded-[18px] overflow-hidden"
                  style={{
                    marginLeft: -65 + card.x,
                    marginTop: -79,
                    scale: card.scale,
                    background: card.grad,
                    border: `1px solid ${card.border}`,
                    boxShadow: `0 22px 50px -16px rgba(0,0,0,0.45), 0 6px 16px -8px rgba(0,0,0,0.4)`,
                  }}
                >
                  {/* Glossy diagonal sheen */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 42%)",
                    }}
                  />
                  {/* Top: icon chip + ADMIT ONE */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{
                        background: front ? "rgba(10,10,10,0.12)" : "rgba(255,255,255,0.22)",
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={2} style={{ color: card.text }} />
                    </div>
                    <span
                      className="text-[6px] tracking-[1.5px] uppercase"
                      style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: card.sub }}
                    >
                      Admit One
                    </span>
                  </div>

                  {/* Digis wordmark */}
                  <div className="absolute inset-x-0 top-[34%] -translate-y-1/2 flex flex-col items-center">
                    <span
                      className="leading-none"
                      style={{
                        fontFamily: "'Zalando Sans Expanded', sans-serif",
                        fontWeight: 600,
                        fontSize: front ? "22px" : "18px",
                        letterSpacing: "-0.5px",
                        color: card.text,
                      }}
                    >
                      Digis
                    </span>
                    <span
                      className="mt-1 text-[6px] tracking-[2px] uppercase"
                      style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: card.sub }}
                    >
                      Event Pass
                    </span>
                  </div>

                  {/* Ticket notches */}
                  <div
                    className="absolute -left-[6px] top-[62%] -translate-y-1/2 w-3 h-3 rounded-full"
                    style={{ background: isDark ? "#0a0a0a" : "#ecebf4" }}
                  />
                  <div
                    className="absolute -right-[6px] top-[62%] -translate-y-1/2 w-3 h-3 rounded-full"
                    style={{ background: isDark ? "#0a0a0a" : "#ecebf4" }}
                  />
                  {/* Dashed perforation */}
                  <div
                    className="absolute left-2.5 right-2.5"
                    style={{
                      top: "62%",
                      borderTop: `1px dashed ${front ? "rgba(10,10,10,0.25)" : "rgba(255,255,255,0.4)"}`,
                    }}
                  />
                  {/* Faux barcode stub */}
                  <div className="absolute left-2.5 right-2.5 bottom-3 flex items-end gap-[2px] h-6">
                    {[3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 1, 2, 3, 1, 2].map((w, b) => (
                      <div
                        key={b}
                        className="rounded-[1px]"
                        style={{
                          width: w,
                          height: "100%",
                          background: card.text,
                          opacity: b % 2 === 0 ? 0.85 : 0.5,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}

            {/* Twinkle sparkle */}
            <motion.div
              className="absolute -top-1 right-3"
              animate={{ scale: [0.8, 1.15, 0.8], opacity: [0.4, 1, 0.4], rotate: [0, 15, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles
                className="w-5 h-5"
                strokeWidth={1.5}
                style={{ color: isDark ? brand : "#9bbf00" }}
              />
            </motion.div>
          </div>

          <h3
            className="text-[26px] sm:text-[32px] font-light tracking-[-0.6px] mb-3"
            style={{
              fontFamily: "'Zalando Sans Expanded', sans-serif",
              color: isDark ? "#fff" : "#0a0a0a",
              textShadow: "none",
            }}
          >
            {headline}
          </h3>

          <p
            className="text-[14px] leading-relaxed max-w-[380px] mb-9"
            style={{ fontFamily: "'Inter', sans-serif", color: subtle }}
          >
            {subline}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <AppButton
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onReset}
              className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full cursor-pointer overflow-hidden"
              style={{
                background: isDark
                  ? "linear-gradient(135deg, #d9ff00, #d6f905)"
                  : "#0a0a0a",
                color: isDark ? "#000" : "#fff",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                letterSpacing: "0.3px",
                fontWeight: 600,
                boxShadow: isDark
                  ? "0 10px 30px -8px rgba(217,255,0,0.5)"
                  : "0 10px 30px -10px rgba(0,0,0,0.4)",
              }}
            >
              {/* Shine sweep */}
              <motion.span
                className="absolute inset-y-0 w-1/3 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent)",
                }}
                initial={{ x: "-150%" }}
                animate={{ x: "350%" }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  repeatDelay: 1.6,
                  ease: "easeInOut",
                }}
              />
              <Compass className="relative w-4 h-4" strokeWidth={2} />
              <span className="relative">
                {isSearch ? "Clear search" : "Explore all events"}
              </span>
            </AppButton>

            {!isSearch && selectedCategory !== "All" && (
              <AppButton
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full cursor-pointer"
                style={{
                  background: "transparent",
                  color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  letterSpacing: "0.3px",
                  fontWeight: 600,
                  ...glassEdge(isDark),
                }}
              >
                <Bell className="w-4 h-4" strokeWidth={2} />
                Notify me
              </AppButton>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
