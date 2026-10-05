import { motion, useScroll, useTransform } from "motion/react";
import { ArrowLeft, Heart, Share2 } from "lucide-react";
import { ImageCarousel, CarouselDots } from "./ImageCarousel";
import type { Event } from "@/types";
import { EventInfoRail } from "./EventInfoRail";
import { getCategoryColor } from "@/lib/categoryColors";
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

export function EventHero({
  event,
  isDark,
  liked,
  onLikedChange,
  onBack,
  onShare,
  carouselImages,
  carouselIdx,
  onCarouselIdxChange,
  rgb,
  posterRgb,
}: {
  event: Event;
  isDark: boolean;
  liked: boolean;
  onLikedChange: (liked: boolean) => void;
  onBack: () => void;
  onShare: () => void;
  carouselImages: string[];
  carouselIdx: number;
  onCarouselIdxChange: (idx: number) => void;
  rgb: string;
  posterRgb?: [number, number, number] | null;
}) {
  const categoryTokens = getCategoryColor(event.category, rgb);
  const { scrollY } = useScroll();
  const heroScale = useTransform(
    scrollY,
    [0, 320],
    [1.08, 1.18],
  );

  return (
    <>
      {/* Desktop: split hero — image card on left, title on right */}
      <div className="hidden lg:block px-8 pt-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-10 items-start">
          {/* Back button row */}
          <div className="col-span-12 flex items-center justify-between mb-2">
            <AppButton
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onBack}
              className="relative flex items-center gap-2 overflow-hidden px-4 py-2 rounded-full"
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.04)",
                color: isDark
                  ? "rgba(255,255,255,0.8)"
                  : "rgba(0,0,0,0.7)",
              }}
            >
              <GlassReflection isDark={isDark} />
              <ArrowLeft
                className="relative z-10 w-4 h-4"
                strokeWidth={1.75}
              />
              <span
                className="relative z-10 text-[12px] tracking-[0.5px]"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                }}
              >
                Back
              </span>
            </AppButton>
            <div className="flex gap-2.5">
              <AppButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => onLikedChange(!liked)}
                className="relative w-11 h-11 overflow-hidden rounded-full flex items-center justify-center"
                style={{
                  background: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)",
                }}
              >
                <GlassReflection isDark={isDark} />
                <Heart
                  className={`relative z-10 w-4 h-4 ${liked ? "fill-red-400 text-red-400" : ""}`}
                  strokeWidth={1.75}
                  style={{
                    color: liked
                      ? undefined
                      : isDark
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.6)",
                  }}
                />
              </AppButton>
              <AppButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => onShare()}
                className="relative w-11 h-11 overflow-hidden rounded-full flex items-center justify-center"
                style={{
                  background: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)",
                  color: isDark
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(0,0,0,0.6)",
                }}
              >
                <GlassReflection isDark={isDark} />
                <Share2
                  className="relative z-10 w-4 h-4"
                  strokeWidth={1.75}
                />
              </AppButton>
            </div>
          </div>

          {/* Image card + dots */}
          <div className="col-span-5 self-start">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative rounded-[28px] overflow-hidden"
              style={{
                aspectRatio: "4/5",
                boxShadow: isDark
                  ? `0 30px 80px -24px rgba(${rgb},0.5), 0 10px 40px -20px rgba(0,0,0,0.7)`
                  : `0 30px 70px -26px rgba(${rgb},0.45), 0 14px 40px -24px rgba(20,18,40,0.35)`,
              }}
            >
              <GlassReflection isDark={isDark} />
              <ImageCarousel
                images={carouselImages}
                alt={event.name}
                idx={carouselIdx}
                onIdxChange={onCarouselIdxChange}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, rgba(${rgb},0.12), transparent 60%)`,
                  mixBlendMode: "overlay",
                }}
              />
              <div className="absolute top-5 left-5">
                <div
                  className="px-3 py-1.5 rounded-full text-[10px] tracking-[2px] uppercase"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    background: `linear-gradient(${categoryTokens.scrim}, ${categoryTokens.scrim}), rgba(${categoryTokens.rgb},${categoryTokens.tint})`,
                    backdropFilter: "blur(20px)",
                    color: `rgb(${categoryTokens.rgb})`,
                    boxShadow: `0 0 0 1px rgba(${categoryTokens.rgb},${categoryTokens.border})`,
                    fontWeight: 600,
                  }}
                >
                  {event.category}
                </div>
              </div>
            </motion.div>
            <CarouselDots
              count={carouselImages.length}
              idx={carouselIdx}
              onChange={onCarouselIdxChange}
              isDark={isDark}
            />
          </div>

          <EventInfoRail
            event={event}
            isDark={isDark}
            posterRgb={posterRgb}
          />
        </div>
      </div>

      {/* Mobile / tablet hero with scroll zoom — full-bleed poster (any aspect
          via object-cover). The immersive blurred artwork lives behind the page. */}
      <div className="lg:hidden relative h-[56vh] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            maskImage: "linear-gradient(180deg,#000 0%,#000 66%,rgba(0,0,0,0.75) 80%,rgba(0,0,0,0.35) 92%,transparent 100%)",
            WebkitMaskImage: "linear-gradient(180deg,#000 0%,#000 66%,rgba(0,0,0,0.75) 80%,rgba(0,0,0,0.35) 92%,transparent 100%)",
          }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              scale: heroScale,
              transformOrigin: "center center",
            }}
          >
            <ImageCarousel
              images={carouselImages}
              alt={event.name}
              idx={carouselIdx}
              onIdxChange={onCarouselIdxChange}
            />
          </motion.div>

          {/* Poster-aware progressive shade — keeps title readable and gives the
              metadata cards a surface to overlap into */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? `
                linear-gradient(
                  to bottom,
                  rgba(0,0,0,0.10) 0%,
                  transparent 34%,
                  rgba(0,0,0,0.34) 76%,
                  rgba(0,0,0,0.68) 100%
                ),
                radial-gradient(
                  ellipse 110% 48% at 50% 100%,
                  rgba(${rgb},0.34),
                  transparent 72%
                )
              `
                            : `
                linear-gradient(
                  to bottom,
                  rgba(0,0,0,0.04) 0%,
                  transparent 32%,
                  transparent 100%
                ),
                radial-gradient(
                  ellipse 110% 48% at 50% 100%,
                  rgba(${rgb},0.22),
                  transparent 74%
                )
              `,
            }}
          />
        </div>
        {/* Top nav */}
        <div className="absolute top-0 left-0 right-0 p-5 flex items-center justify-between">
          <AppButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="relative w-11 h-11 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: "rgba(8,8,8,0.5)",
              backdropFilter: "blur(30px)",
            }}
          >
            <GlassReflection isDark={isDark} />
            <ArrowLeft
              className="relative z-10 w-5 h-5 text-white/80"
              strokeWidth={1.5}
            />
          </AppButton>

          <div className="flex gap-2.5">
            <AppButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onLikedChange(!liked)}
              className="relative w-11 h-11 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: "rgba(8,8,8,0.5)",
                backdropFilter: "blur(30px)",
              }}
            >
              <GlassReflection isDark={isDark} />
              <Heart
                className={`relative z-10 w-5 h-5 ${liked ? "fill-red-400 text-red-400" : "text-white/80"}`}
                strokeWidth={1.5}
              />
            </AppButton>
            <AppButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onShare()}
              className="relative w-11 h-11 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: "rgba(8,8,8,0.5)",
                backdropFilter: "blur(30px)",
              }}
            >
              <GlassReflection isDark={isDark} />
              <Share2
                className="relative z-10 w-5 h-5 text-white/80"
                strokeWidth={1.5}
              />
            </AppButton>
          </div>
        </div>

        {/* Carousel indicator — thin strip at top of image */}
        {carouselImages.length > 1 && (
          <div className="absolute top-2 left-4 right-4 flex gap-1 z-20 pointer-events-none">
            {Array.from({ length: carouselImages.length }).map(
              (_, i) => (
                <div
                  key={i}
                  className="flex-1 h-[3px] rounded-full overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.25)",
                  }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    animate={{
                      width:
                        i === carouselIdx
                          ? "100%"
                          : i < carouselIdx
                            ? "100%"
                            : "0%",
                    }}
                    transition={{ duration: 0.35 }}
                    style={{ background: "#fff" }}
                  />
                </div>
              ),
            )}
          </div>
        )}

        {/* Soft local shade behind the title — dissolves on every side, so it never forms an edge */}
        {!isDark && (
          <div
            className="absolute inset-x-0 bottom-0 h-[48%] pointer-events-none"
            style={{ background: "radial-gradient(ellipse 95% 46% at 40% 58%, rgba(12,10,24,0.55), transparent 100%)" }}
          />
        )}
        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div
              className="inline-block px-3 py-1.5 rounded-full text-[10px] tracking-[1.5px] uppercase mb-4"
              style={{
                background: `linear-gradient(${categoryTokens.scrim}, ${categoryTokens.scrim}), rgba(${categoryTokens.rgb},${categoryTokens.tint})`,
                backdropFilter: "blur(20px)",
                fontFamily: "'Inter', sans-serif",
                color: `rgb(${categoryTokens.rgb})`,
                boxShadow: `0 0 0 1px rgba(${categoryTokens.rgb},${categoryTokens.border})`,
              }}
            >
              {event.category}
            </div>
            <h1
              className="text-[30px] font-light leading-tight tracking-[-0.3px]"
              style={{
                fontFamily:
                  "'Zalando Sans Expanded', sans-serif",
                color: "#fff",
                textShadow: "0 2px 16px rgba(0,0,0,0.45)",
              }}
            >
              {event.name}
            </h1>
          </motion.div>
        </div>
      </div>
    </>
  );
}
