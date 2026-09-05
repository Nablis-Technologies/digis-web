import { motion } from 'motion/react';
import { useEffect, useState, type CSSProperties } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { AppButton } from '@/components/primitives/AppButton';

/**
 * Shared loading primitives. Every skeleton mirrors its data layout
 * (same wrappers, aspects, spacing) so content swaps in without layout
 * shift: EventCard (343/429 image + footer), GlassTicketCard (132px thumb
 * + right column), TicketTypeCard (22px card + rows), profile Coming-Up
 * rows, resale My-Listing rows, and the featured section (mobile coverflow
 * stub card, tablet 2-col stubs, desktop magazine card).
 */

function usePulse() {
  const { isDark } = useTheme();
  const bg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.07)';
  return { isDark, bg };
}

/**
 * Show a skeleton only when loading persists past `ms`. Instant (mock/cached)
 * resolves never flash a skeleton for a single frame; real fetches do.
 */
export function useShowSkeleton(pending: boolean, ms = 200): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!pending) {
      setShow(false);
      return;
    }
    const id = window.setTimeout(() => setShow(true), ms);
    return () => window.clearTimeout(id);
  }, [pending, ms]);
  return show;
}

export function Pulse({ className = '', style }: { className?: string; style?: CSSProperties }) {
  const { bg } = usePulse();
  return (
    <div
      aria-hidden
      className={`animate-pulse ${className}`}
      style={{ background: bg, ...style }}
    />
  );
}

/** Mirrors EventCard: full-bleed image (343/429) + footer title/meta rows. */
export function EventCardSkeleton() {
  const { isDark } = usePulse();
  return (
    <div
      className="relative rounded-[24px] overflow-hidden flex flex-col"
      style={{
        background: isDark ? '#101010' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '343/429' }}>
        <Pulse className="absolute inset-0" />
      </div>
      <div className="px-3.5 pt-3 pb-3 flex flex-col gap-2">
        <Pulse className="h-[17px] w-3/4 rounded-md" />
        <Pulse className="h-[11px] w-1/2 rounded-md" />
        <Pulse className="h-[11px] w-2/3 rounded-md" />
      </div>
    </div>
  );
}

/** Grid skeleton using EventGrid's own responsive wrappers (no layout shift). */
export function EventGridSkeleton({ mobileCount = 2, desktopCount = 4 }: { mobileCount?: number; desktopCount?: number }) {
  return (
    <>
      <div className="md:hidden px-4 space-y-4">
        {Array.from({ length: mobileCount }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 px-4 sm:px-6 lg:px-10 xl:px-12 max-w-[1600px] mx-auto">
        {Array.from({ length: desktopCount }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}

/** Mirrors the featured section's data layout per breakpoint:
 *  mobile coverflow stub card (5/4 poster + stub), tablet 2-col stubs,
 *  desktop magazine card (ticker, text column + poster, thumbnails). */
function FeaturedStubCard() {
  const { isDark } = usePulse();
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: isDark ? "#101010" : "#fff",
        borderRadius: 28,
        border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      }}
    >
      {/* Poster — 5/4 like FeaturedEventCard */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "5/4" }}>
        <Pulse className="absolute inset-0" />
      </div>
      {/* Stub: date badge · price · CTA */}
      <div
        className="relative flex items-center gap-3 px-4 py-3"
        style={{
          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        }}
      >
        <Pulse className="w-9 h-9 rounded-[13px] flex-shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <Pulse className="h-[8px] w-8 rounded" />
          <Pulse className="h-[15px] w-16 rounded-md" />
        </div>
        <Pulse className="h-9 w-24 rounded-full flex-shrink-0" />
      </div>
    </div>
  );
}

/** Desktop magazine silhouette: ticker · text col + poster · thumbnails. */
function FeaturedMagazineSkeleton() {
  const { isDark } = usePulse();
  const hairline = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: 36,
        background: isDark ? "#0a0a0a" : "#fff",
        border: `1px solid ${hairline}`,
      }}
    >
      {/* Ticker strip */}
      <div
        className="flex items-center gap-10 px-6 py-3 overflow-hidden border-b"
        style={{
          borderColor: hairline,
          background: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.02)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <Pulse key={i} className="h-[9px] w-[150px] rounded flex-shrink-0" />
        ))}
      </div>

      {/* Body */}
      <div className="grid grid-cols-12 gap-0 h-[560px] xl:h-[600px]">
        {/* Left — typography column */}
        <div className="col-span-12 xl:col-span-7 relative px-8 xl:px-12 py-8 flex flex-col justify-center gap-6">
          <Pulse className="w-[100px] h-[100px] rounded-2xl" />
          <div className="space-y-3">
            <Pulse className="h-[38px] w-[85%] max-w-[540px] rounded-md" />
            <Pulse className="h-[38px] w-[55%] max-w-[360px] rounded-md" />
          </div>
          <Pulse className="h-[54px] w-full max-w-[440px] rounded-2xl" />
          <Pulse className="h-[48px] w-[190px] rounded-full" />
        </div>
        {/* Right — portrait poster */}
        <div className="col-span-12 xl:col-span-5 relative h-full py-8 xl:py-12 px-4 flex items-center justify-center">
          <Pulse
            className="w-full max-w-[240px] rounded-[20px]"
            style={{ aspectRatio: "4/5" }}
          />
        </div>
      </div>

      {/* Bottom thumbnails strip */}
      <div
        className="relative border-t px-4 py-3 flex items-center gap-3"
        style={{
          borderColor: hairline,
          background: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.015)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 min-w-0 flex items-center gap-2.5 px-2 py-2">
            <Pulse className="w-9 h-9 rounded-lg flex-shrink-0" />
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <Pulse className="h-[7px] w-8 rounded" />
              <Pulse className="h-[10px] w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeaturedSkeleton() {
  const { isDark } = usePulse();
  return (
    <>
      {/* Mobile/tablet "Headliners · n events" header row */}
      <div className="lg:hidden flex items-center gap-3 mb-4 px-4 sm:px-6">
        <Pulse className="h-[11px] w-[64px] rounded" />
        <div className="flex-1" />
        <Pulse className="h-[11px] w-[44px] rounded" />
      </div>

      {/* Mobile — single active coverflow stub (~84% width) + dots */}
      <div className="md:hidden">
        <div className="mx-auto" style={{ width: "84%" }}>
          <FeaturedStubCard />
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(0,0,0,0.14)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Tablet — 2-col stub grid */}
      <div className="hidden md:grid lg:hidden md:grid-cols-2 gap-4 px-4 sm:px-6">
        <FeaturedStubCard />
        <FeaturedStubCard />
      </div>

      {/* Desktop — magazine card */}
      <div className="hidden lg:block px-4 sm:px-6 lg:px-8">
        <FeaturedMagazineSkeleton />
      </div>
    </>
  );
}

/** Neutral spinner with polite status text — for single modules or layouts
 *  whose final shape is unknown. Mirrors the app's lime accent. */
export function Spinner({
  size = 40,
  label = 'Loading…',
  className = '',
}: { size?: number; label?: string; className?: string }) {
  const { isDark } = useTheme();
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-3 py-10 ${className}`}>
      <motion.div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          border: `3px solid ${isDark ? 'rgba(214,249,5,0.2)' : 'rgba(214,249,5,0.35)'}`,
          borderTopColor: isDark ? '#d6f905' : '#7c9a00',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      />
      {label && (
        <p className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
          {label}
        </p>
      )}
    </div>
  );
}

/** Mirrors the event-detail layout for the deep-link fetch: mobile full-bleed
 *  hero + content, desktop split hero (4/5 image card + info rail) + tiers. */
export function EventDetailSkeleton() {
  const { isDark } = usePulse();
  const hairline = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  return (
    <>
      {/* Mobile / tablet — full-bleed hero */}
      <div className="lg:hidden relative h-[56vh]">
        <Pulse className="absolute inset-0" />
        <div className="absolute top-0 left-0 right-0 p-5 flex items-center justify-between">
          <Pulse className="w-11 h-11 rounded-full" />
          <div className="flex gap-2.5">
            <Pulse className="w-11 h-11 rounded-full" />
            <Pulse className="w-11 h-11 rounded-full" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 space-y-3">
          <Pulse className="h-[24px] w-24 rounded-full" />
          <Pulse className="h-[30px] w-3/4 max-w-[320px] rounded-md" />
        </div>
      </div>

      {/* Desktop — split hero */}
      <div className="hidden lg:block px-8 pt-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-10 items-start">
          <div className="col-span-12 flex items-center justify-between mb-2">
            <Pulse className="h-10 w-24 rounded-full" />
            <div className="flex gap-2.5">
              <Pulse className="w-11 h-11 rounded-full" />
              <Pulse className="w-11 h-11 rounded-full" />
            </div>
          </div>
          <div className="col-span-5 self-start">
            <div
              className="relative overflow-hidden rounded-[28px]"
              style={{ aspectRatio: '4/5', border: `1px solid ${hairline}` }}
            >
              <Pulse className="absolute inset-0" />
            </div>
          </div>
          <div className="col-span-7 space-y-5">
            <Pulse className="h-[26px] w-28 rounded-full" />
            <Pulse className="h-[40px] w-full max-w-[520px] rounded-md" />
            <Pulse className="h-[16px] w-48 rounded-md" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Pulse className="h-[56px] rounded-2xl" />
              <Pulse className="h-[56px] rounded-2xl" />
              <Pulse className="h-[56px] rounded-2xl" />
              <Pulse className="h-[56px] rounded-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Content below hero */}
      <div className="px-5 lg:px-8 max-w-7xl mx-auto mt-6 lg:mt-12">
        <Pulse className="h-[26px] w-32 rounded-md mb-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <TierCardSkeleton />
          <TierCardSkeleton />
          <TierCardSkeleton />
        </div>
      </div>
    </>
  );
}

/** Mirrors GlassTicketCard: 132px thumb + right column + dashed bottom row. */
export function TicketRowSkeleton() {
  const { isDark } = usePulse();
  return (
    <div
      className="relative rounded-[22px] overflow-hidden"
      style={{
        background: isDark ? '#101010' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <div className="flex gap-0">
        <div className="relative flex-shrink-0 overflow-hidden" style={{ width: 132, aspectRatio: '1/1' }}>
          <Pulse className="absolute inset-0" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between px-4 py-3.5">
          <div className="min-w-0">
            <Pulse className="h-[19px] w-4/5 rounded-md mb-1.5" />
            <Pulse className="h-[13px] w-3/5 rounded-md mb-1" />
            <Pulse className="h-[13px] w-1/2 rounded-md" />
          </div>
          <div
            className="flex items-center justify-between gap-2 mt-3 pt-3"
            style={{ borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
          >
            <Pulse className="h-[20px] w-[92px] rounded-md" />
            <Pulse className="h-[32px] w-[32px] rounded-full flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mirrors TicketTypeCard: 22px card, chip row, name/price row, subline. */
export function TierCardSkeleton() {
  const { isDark } = usePulse();
  return (
    <div
      className="relative rounded-[22px]"
      style={{
        background: isDark ? '#0d1117' : '#f4f6fb',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <div className="relative px-4 py-3.5">
        <div className="flex items-center justify-between mb-2">
          <Pulse className="h-[22px] w-20 rounded-md" />
          <Pulse className="h-5 w-5 rounded-full flex-shrink-0" />
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <Pulse className="h-[18px] flex-1 rounded-md" />
          <Pulse className="h-[22px] w-16 rounded-md flex-shrink-0" />
        </div>
        <div className="mt-1.5">
          <Pulse className="h-[13px] w-2/3 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Mirrors profile Coming-Up rows: 56px thumb + title/meta lines. */
export function ProfileRowSkeleton() {
  const { isDark } = usePulse();
  return (
    <div
      className="rounded-2xl overflow-hidden flex items-center gap-3 p-2.5"
      style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <Pulse className="w-14 h-14 rounded-xl flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <Pulse className="h-[17px] w-3/4 rounded-md mb-1" />
        <Pulse className="h-[13px] w-1/2 rounded-md" />
      </div>
    </div>
  );
}

/** Mirrors resale My-Listing rows: 48px thumb + text + delist pill. */
export function ListingRowSkeleton() {
  const { isDark } = usePulse();
  return (
    <div
      className="relative flex items-center justify-between p-4 rounded-2xl overflow-hidden"
      style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Pulse className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="min-w-0">
          <Pulse className="h-[16px] w-32 rounded-md mb-1" />
          <Pulse className="h-[14px] w-24 rounded-md" />
        </div>
      </div>
      <Pulse className="h-[30px] w-[76px] rounded-full flex-shrink-0 ml-3" />
    </div>
  );
}

/** Error card with retry — used instead of the empty-state on fetch failure. */
export function LoadErrorCard({ message, onRetry }: { message?: string; onRetry: () => void }) {
  const { isDark } = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-center text-center"
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: isDark ? 'rgba(229,72,77,0.1)' : 'rgba(229,72,77,0.08)',
          border: '1px solid rgba(229,72,77,0.25)',
        }}
      >
        <AlertTriangle className="w-5 h-5" style={{ color: '#e5484d' }} strokeWidth={2} />
      </div>
      <p
        className="text-[13px] mb-5 max-w-[280px]"
        style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}
      >
        {message ?? 'Could not load this right now. Check your connection and try again.'}
      </p>
      <AppButton
        whileTap={{ scale: 0.97 }}
        onClick={onRetry}
        className="px-7 py-3 rounded-full cursor-pointer text-[13px]"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          background: isDark ? 'linear-gradient(135deg, #d9ff00, #d6f905)' : '#0a0a0a',
          color: isDark ? '#000' : '#fff',
        }}
      >
        Retry
      </AppButton>
    </motion.div>
  );
}
