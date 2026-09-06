import { motion } from "motion/react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useImageColor } from "@/lib/hooks/useImageColor";
import { useTheme } from "@/app/components/ThemeContext";
import type { Event } from "@/types";
import { formatETB } from "@/lib/utils/format";
import { readableAccent } from "@/lib/utils/color";
import { useProminentHue } from "@/lib/hooks/useProminentHue";
import { EventDateBadge } from "@/components/EventDateBadge";
import { GlassReflection } from "@/components/primitives/GlassReflection";
import { AppButton } from '@/components/primitives/AppButton';

export function FeaturedEventCard({
  event,
  onClick,
  large = false,
  variant,
}: {
  event: Event;
  onClick: () => void;
  large?: boolean;
  variant?: "regular" | "large";
}) {
  const { rgb } = useImageColor(event.image);
  const { isDark } = useTheme();

  // Most-prominent hue from the actual image (hue-bucketed voting),
  // capped to a muted saturation so the stub bg doesn't read as neon.
  const hued = useProminentHue(event.image, rgb, isDark);

  const isLarge = variant === "large" || large;
  const priceLabel =
    event.eventType === "rsvp"
      ? "Free"
      : event.eventType === "inviteOnly" && !event.inviteOnlyPaid
        ? "Invite only"
        : formatETB(event.priceFrom);

  // Desktop magazine layout — unchanged
  if (isLarge) {
    return (
      <motion.div
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        className="relative cursor-pointer group rounded-[28px] overflow-hidden h-full"
        style={{
          background: isDark ? "#0a0a0a" : "#fff",
          boxShadow: isDark
            ? "0 24px 60px -30px rgba(0,0,0,0.5)"
            : "0 24px 60px -30px rgba(0,0,0,0.25)",
        }}
      >
        <GlassReflection isDark={isDark} />
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: "16/11" }}
        >
          <img
            src={event.image}
            alt={event.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%)",
            }}
          />

          <div className="absolute top-5 left-5">
            <div
              className="px-3 py-1.5 rounded-full text-[10px] tracking-[2px] uppercase"
              style={{
                fontFamily: "'Inter', sans-serif",
                color: `rgb(${hued})`,
                background: `rgba(${hued},0.16)`,
                border: `1px solid rgba(${hued},0.4)`,
                backdropFilter: "blur(12px)",
                fontWeight: 600,
              }}
            >
              {event.category}
            </div>
          </div>
          <EventDateBadge date={event.date} accentRgb={hued} size="featured" tone="featured" className="absolute top-3 right-3 scale-90 origin-top-right rounded-[13px]" />
          <div className="absolute bottom-3 left-5 right-5">
            <h3
              className="text-[42px] xl:text-[52px] font-light tracking-[-0.5px] leading-[1.02] text-white"
              style={{
                fontFamily:
                  "'Zalando Sans Expanded', sans-serif",
              }}
            >
              {event.name}
            </h3>
            <p
              className="mt-3 text-[12px] tracking-[1.5px] uppercase text-white/70"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
              }}
            >
              {event.city} · {event.date}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Mobile/tablet — ticket-stub style, unique to featured
  const surface = isDark ? "#101010" : "#fff";

  const lightStubRgb = readableAccent(hued, false);

  // Brand-lime is the default from useImageColor before a real colour extracts.
  // Default (no real colour yet): dark bg + hued glow — works on both themes.
  // Extracted colour: use the light-mode coloured-bg style for both themes.
  const colorExtracted = rgb !== '217,255,0' && rgb !== '214,249,5';

  const stubBg = colorExtracted
    ? isDark
      ? `
        linear-gradient(
          180deg,
          rgba(0,0,0,0) 0%,
          rgba(0,0,0,0.04) 18%,
          rgba(0,0,0,0.18) 58%,
          rgba(0,0,0,0.34) 100%
        ),
        radial-gradient(
          ellipse 90% 120% at 15% 100%,
          rgba(255,255,255,0.07) 0%,
          transparent 62%
        ),
        radial-gradient(
          ellipse 80% 100% at 100% 100%,
          rgba(0,0,0,0.20) 0%,
          transparent 68%
        ),
        linear-gradient(
          180deg,
          rgb(${lightStubRgb}) 0%,
          rgb(${lightStubRgb}) 42%,
          rgba(${lightStubRgb},0.94) 100%
        )
      `
      : `
        radial-gradient(ellipse 90% 120% at 15% 100%, rgba(255,255,255,0.10) 0%, transparent 62%),
        radial-gradient(ellipse 80% 100% at 100% 100%, rgba(0,0,0,0.14) 0%, transparent 68%),
        linear-gradient(
          180deg,
          rgb(${lightStubRgb}) 0%,
          rgb(${lightStubRgb}) 42%,
          rgba(${lightStubRgb},0.94) 100%
        )
      `
    : `
      radial-gradient(ellipse 75% 120% at 50% 100%, rgba(${hued},0.55) 0%, rgba(${hued},0.18) 45%, transparent 75%),
      #101010
    `;
  const posterOverlay = colorExtracted
    ? `
      linear-gradient(
        180deg,
        rgba(0,0,0,0.02) 0%,
        transparent 34%,
        rgba(${lightStubRgb},0.08) 52%,
        rgba(${lightStubRgb},0.32) 68%,
        rgba(${lightStubRgb},0.68) 84%,
        rgb(${lightStubRgb}) 100%
      )
    `
    : `
      linear-gradient(
        180deg,
        rgba(0,0,0,0.04) 0%,
        transparent 35%,
        rgba(0,0,0,0.18) 58%,
        rgba(0,0,0,0.52) 82%,
        rgba(0,0,0,0.88) 100%
      )
    `;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="relative cursor-pointer group h-full"
      style={{
        background: surface,
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: isDark
          ? undefined
          : "0 24px 55px -34px rgba(0,0,0,0.42)",
      }}
    >
      <GlassReflection isDark={isDark} />
      {/* Poster image + title overlay */}
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: "5/4" }}
      >
        <img
          src={event.image}
          alt={event.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          draggable={false}
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: posterOverlay }}
        />

        {/* Title + venue over poster */}
        <div className="absolute bottom-0 left-4 right-4">
          <h3
            className="text-[21px] font-light tracking-[-0.4px] leading-[1.05] line-clamp-2 text-[20px]"
            style={{
              fontFamily: "'Zalando Sans Expanded', sans-serif",
              color: "#fff",
              textShadow: "0 2px 16px rgba(0,0,0,0.45)",
            }}
          >
            {event.name}
          </h3>

          <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
            <MapPin
              className="w-3 h-3 flex-shrink-0"
              style={{ color: "rgba(255,255,255,0.85)" }}
              strokeWidth={2}
            />
            <span
              className="text-[10.5px] truncate"
              style={{
                fontFamily: "'Inter', sans-serif",
                color: "rgba(255,255,255,0.9)",
                fontWeight: 500,
                textShadow: "0 1px 10px rgba(0,0,0,0.35)",
              }}
            >
              {event.venue}
            </span>
          </div>
        </div>
      </div>

      {/* subtle glass divider */}
      {/* <div
        className="absolute left-4 right-4 bottom-[70px] h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
        }}
      /> */}

      {/* Dynamic colored bottom stub only */}
      <div
        className="relative px-4 py-3"
        style={{
          background: stubBg,
          marginTop: -1,
        }}
      >
        <div className="flex items-center gap-3">
          <EventDateBadge date={event.date} accentRgb={hued} tone="featured" className="rounded-[13px]" />

          {/* Price */}
          <div className="flex flex-col min-w-0 flex-1">
            <span
              className="text-[8.5px] tracking-[1.4px] uppercase leading-none"
              style={{
                fontFamily: "'Inter', sans-serif",
                color: "rgba(255,255,255,0.62)",
                fontWeight: 600,
              }}
            >
              {event.eventType === "rsvp" ? "RSVP" : "From"}
            </span>
            <span
              className="mt-1 text-[15px] leading-none truncate"
              style={{
                fontFamily:
                  "'Zalando Sans Expanded', sans-serif",
                color: "#fff",
                fontWeight: 400,
                textShadow: "0 1px 10px rgba(0,0,0,0.18)",
              }}
            >
              {priceLabel}
            </span>
          </div>

          {/* CTA pill */}
          <AppButton
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 pl-4 pr-2 py-2 rounded-full flex-shrink-0 transition-all group-hover:gap-3"
            style={{
              background: "#d6f905",
              color: "#0a0a0a",
              boxShadow: isDark
                ? undefined
                : "0 10px 24px rgba(0,0,0,0.18)",
            }}
          >
            <span
              className="text-[11px] tracking-[1.4px] uppercase leading-none whitespace-nowrap"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
              }}
            >
              {event.eventType === "rsvp" ? "RSVP" : "Tickets"}
            </span>
            <span
              className="flex items-center justify-center w-7 h-7 rounded-full"
              style={{ background: "rgba(0,0,0,0.12)" }}
            >
              <ArrowUpRight
                className="w-3.5 h-3.5"
                strokeWidth={2.5}
              />
            </span>
          </AppButton>
        </div>
      </div>
    </motion.div>
  );
}

