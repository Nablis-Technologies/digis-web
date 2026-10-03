import { motion } from "motion/react";
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
} from "lucide-react";
import { useTheme } from "@/app/components/ThemeContext";
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glass, glassEdge } from '@/lib/ui/glass';

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

/**
 * Discovery empty state. Uses the app's standard glass surface
 * (`glass()` + `GlassReflection` + `glassEdge`) with a single restrained
 * event-pass motif — no aurora blobs, starfields, or glow shadows.
 */
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
  const cardText = isDark ? "rgba(255,255,255,0.5)" : "rgba(10,10,10,0.45)";
  const dashed = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="px-4 sm:px-6 lg:px-8"
    >
      <div
        className="relative overflow-hidden rounded-[32px] px-6 py-16 sm:py-24 mx-auto max-w-2xl"
        style={{ ...glass(isDark) }}
      >
        <GlassReflection isDark={isDark} />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Ticket stack — one front card on the standard glass, two behind */}
          <div className="relative w-[200px] h-[170px] mb-10">
            {/* back-left */}
            <motion.div
              className="absolute left-1/2 top-1/2 w-[118px] h-[146px] rounded-[18px] overflow-hidden"
              style={{
                marginLeft: -59 - 48, marginTop: -73, rotate: -14,
                background: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
              }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* back-right */}
            <motion.div
              className="absolute left-1/2 top-1/2 w-[118px] h-[146px] rounded-[18px] overflow-hidden"
              style={{
                marginLeft: -59 + 48, marginTop: -73, rotate: 14,
                background: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
              }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            />
            {/* front — the standard glass surface */}
            <motion.div
              className="absolute left-1/2 top-1/2 w-[118px] h-[146px] rounded-[18px] overflow-hidden"
              style={{ marginLeft: -59, marginTop: -73, ...glass(isDark), border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}` }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
            >
              <GlassReflection isDark={isDark} />
              {/* Top: icon chip + ADMIT ONE */}
              <div className="relative z-10 absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.22)' }}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} style={{ color: isDark ? brand : '#5a6b00' }} />
                </span>
                <span className="text-[6px] tracking-[1.5px] uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: cardText }}>
                  Admit One
                </span>
              </div>
              {/* Digis wordmark */}
              <div className="relative z-10 absolute inset-x-0 top-[40%] -translate-y-1/2 flex flex-col items-center">
                <span className="text-[22px] leading-none"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 600, letterSpacing: '-0.5px', color: isDark ? '#fff' : '#1a1a1a' }}>
                  Digis
                </span>
                <span className="mt-1 text-[6px] tracking-[2px] uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: cardText }}>
                  Event Pass
                </span>
              </div>
              {/* Dashed perforation */}
              <div className="absolute left-2.5 right-2.5" style={{ top: '62%', borderTop: `1px dashed ${dashed}` }} />
            </motion.div>
          </div>

          <h3
            className="text-[26px] sm:text-[32px] font-light tracking-[-0.6px] mb-3"
            style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? "#fff" : "#0a0a0a" }}
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
                background: isDark ? "#d6f905" : "#0a0a0a",
                color: isDark ? "#000" : "#fff",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                letterSpacing: "0.3px",
                fontWeight: 600,
                ...glassEdge(isDark),
              }}
            >
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
