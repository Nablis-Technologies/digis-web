import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, MapPin, Navigation as NavigationIcon, Share2, UserPlus, X } from 'lucide-react';
import { getVenueCoords } from '@/lib/utils/venueCoords';
import { flatAvatarColor, avatarRing } from '@/lib/utils/avatarColor';
import { AppButton } from '@/components/primitives/AppButton';
import { glassEdgeReflection, glassReflection, glassEdge, type GlassReflectionSettings } from '@/lib/ui/glass';
import { GlassReflection } from '@/components/primitives/GlassReflection';

const ACCENT = '#d6f905';

/**
 * What the venue card and its profile sheet can honestly derive today — both
 * receive a venue **name** only. The name, address and the map/directions links
 * come from the stopgap `getVenueCoords` name→coords map; hydrating the real
 * description, photos, amenities, capacity, socials, stats and coordinates from
 * public `GET /venues/:id` is tracked in
 * `.scratch/web2-ui-import/issues/01-venue-detail-wireup.md`.
 */
function venueProfile(venue: string) {
  const { lat, lng, address } = getVenueCoords(venue);
  const venueName = venue.split(',')[0].trim();
  const initials = venueName
    ? venueName.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : '?';
  const delta = 0.008;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  return {
    venueName,
    address,
    initials,
    mapUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  };
}

export function VenueMap({ venue, isDark, onOpenProfile, following, onToggleFollow, reflectionSettings }: {
  venue: string; isDark: boolean;
  onOpenProfile?: () => void;
  following?: boolean;
  onToggleFollow?: () => void;
  reflectionSettings?: GlassReflectionSettings;
}) {
  const { venueName, address, initials, mapUrl, directionsUrl } = venueProfile(venue);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))'
          : 'linear-gradient(145deg, rgba(255,255,255,0.72), rgba(234,231,242,0.58))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
      <span aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none rounded-[inherit]" style={glassReflection(isDark, undefined, reflectionSettings)} />
      <span aria-hidden="true" className="absolute inset-0 z-[1] pointer-events-none rounded-[inherit]" style={glassEdgeReflection(isDark, reflectionSettings)} />
      {/* Map iframe */}
      <div className="relative z-10 h-[200px] overflow-hidden">
        {/*
          The map is a cross-origin frame, so it stays presentational: any event
          raised inside it would surface in our document with a target React
          can't read (`__reactFiber$…` is blocked across origins, which throws).
          Pointer/focus access is disabled and the overlay link below carries the
          tap through to a real map instead.
        */}
        <iframe
          src={mapUrl}
          width="100%" height="100%"
          style={{ border: 0, filter: isDark ? 'invert(0.92) hue-rotate(180deg) brightness(0.95) contrast(0.9)' : 'saturate(0.85)' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map of ${venueName}`}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none select-none"
        />
        <a
          href={directionsUrl} target="_blank" rel="noopener noreferrer"
          aria-label={`Open directions to ${venueName}`}
          className="absolute inset-0 cursor-pointer"
        />
        {/* Subtle top fade for legibility */}
        <div className="absolute inset-x-0 top-0 h-12 pointer-events-none"
          style={{ background: isDark ? 'linear-gradient(to bottom, rgba(10,10,10,0.4), transparent)' : 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)' }}
        />
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 gap-3"
        style={{ boxShadow: `inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(81,72,101,0.075)'}` }}>
        <AppButton
          onClick={onOpenProfile}
          disabled={!onOpenProfile}
          className="min-w-0 flex-1 flex items-center gap-2.5 text-left cursor-pointer disabled:cursor-default"
          style={{ background: 'transparent' }}>
          <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
            style={{
              background: venueName ? flatAvatarColor(venueName) : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
              borderRadius: '32%',
            }}>
            <span className="text-[12.5px] uppercase"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: '#fff' }}>
              {initials}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] truncate"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
              {venueName}
            </p>
            <p className="text-[11px] truncate"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }}>
              {address}
            </p>
          </div>
        </AppButton>
        <div className="flex-shrink-0 flex items-center gap-2">
          {onToggleFollow && (
            <AppButton
              whileTap={{ scale: 0.95 }}
              onClick={onToggleFollow}
              aria-label={following ? 'Unfollow venue' : 'Follow venue'}
              className="flex items-center justify-center w-9 h-9 rounded-full cursor-pointer"
              style={{
                background: 'transparent',
                ...glassEdge(isDark),
              }}>
              {following
                ? <Check className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)' }} strokeWidth={2.5} />
                : <UserPlus className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)' }} strokeWidth={2} />}
            </AppButton>
          )}
          <motion.a
            href={directionsUrl} target="_blank" rel="noopener noreferrer"
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full cursor-pointer"
            style={{
              background: isDark ? 'rgba(214,249,5,0.12)' : ACCENT,
              ...glassEdge(isDark),
            }}>
            <NavigationIcon className="w-3 h-3" style={{ color: isDark ? ACCENT : '#0a0a0a' }} strokeWidth={2.25} />
            <span className="text-[11px] tracking-[0.3px]"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? ACCENT : '#0a0a0a', fontWeight: 600 }}>
              Directions
            </span>
          </motion.a>
        </div>
      </div>
    </motion.div>
  );
}

export function VenueSection({ venue, isDark, reflectionSettings }: { venue: string; isDark: boolean; reflectionSettings?: GlassReflectionSettings }) {
  const [following, setFollowing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <>
      <h2 className="text-[13px] tracking-[2px] uppercase mb-4"
        style={{
          fontFamily: "'Inter', sans-serif",
          color: isDark ? 'rgba(214,249,5,0.8)' : 'rgba(0,0,0,0.7)',
        }}>
        Location
      </h2>
      <VenueMap
        venue={venue}
        isDark={isDark}
        following={following}
        onToggleFollow={() => setFollowing((f) => !f)}
        onOpenProfile={() => setSheetOpen(true)}
        reflectionSettings={reflectionSettings}
      />
      <AnimatePresence>
        {sheetOpen && (
          <VenueProfileSheet
            venue={venue}
            isDark={isDark}
            following={following}
            onToggleFollow={() => setFollowing((f) => !f)}
            onClose={() => setSheetOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export function VenueProfileSheet({ venue, isDark, following, onToggleFollow, onClose }: {
  venue: string; isDark: boolean; following: boolean; onToggleFollow: () => void; onClose: () => void;
}) {
  const { venueName, address, initials, directionsUrl } = venueProfile(venue);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <motion.div
        role="dialog"
        aria-label={`${venueName} venue profile`}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--card)',
          maxHeight: '90vh',
        }}>
        <GlassReflection isDark={isDark} />

        <AppButton onClick={onClose}
          ariaLabel="Close"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
          style={{
            background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(14px)',
          }}>
          <GlassReflection isDark={isDark} />
          <X className="relative z-10 w-4 h-4" style={{ color: isDark ? '#fff' : 'rgba(0,0,0,0.8)' }} strokeWidth={2.25} />
        </AppButton>

        <div className="relative z-10 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Profile — the app surface is the banner; the sheet carries no
              venue photo yet (ADR-0002: nothing invented to tint from). */}
          <div className="px-6 pb-6 pt-7">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 mb-4"
              style={{
                background: venueName ? flatAvatarColor(venueName) : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                boxShadow: avatarRing(isDark),
              }}>
              <span className="text-[26px] uppercase"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: '#fff' }}>
                {initials}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-[20px] leading-tight truncate mb-1"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                  {venueName}
                </h3>
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3 h-3 flex-shrink-0"
                    style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }} strokeWidth={2} />
                  <span className="text-[12px] truncate"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>
                    {address}
                  </span>
                </div>
              </div>
              <motion.a
                href={directionsUrl} target="_blank" rel="noopener noreferrer"
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full cursor-pointer self-center"
                style={{
                  background: isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.08)',
                  ...glassEdge(isDark),
                }}>
                <NavigationIcon className="w-3 h-3" style={{ color: isDark ? ACCENT : '#0a0a0a' }} strokeWidth={2} />
                <span className="text-[11px] tracking-[0.3px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? ACCENT : '#0a0a0a' }}>
                  Directions
                </span>
              </motion.a>
            </div>

            {/* Follow + Share */}
            <div className="flex items-stretch gap-2 mb-5">
              <AppButton
                whileTap={{ scale: 0.97 }}
                onClick={onToggleFollow}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer"
                style={{
                  background: following
                    ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
                    : ACCENT,
                  ...(following ? glassEdge(isDark) : {}),
                  color: following ? (isDark ? '#fff' : '#1a1a1a') : '#0a0a0a',
                }}>
                {following
                  ? <Check className="w-4 h-4" strokeWidth={2.5} />
                  : <UserPlus className="w-4 h-4" strokeWidth={2} />}
                <span className="text-[12.5px] tracking-[0.3px]"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                  {following ? 'Following' : 'Follow Venue'}
                </span>
              </AppButton>
              <AppButton
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (typeof navigator !== 'undefined' && (navigator as any).share) {
                    (navigator as any).share({ title: venueName, text: `${venueName} — ${address}` }).catch(() => {});
                  }
                }}
                className="relative flex-shrink-0 flex items-center justify-center gap-2 overflow-hidden px-4 py-3 rounded-2xl cursor-pointer"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  color: isDark ? '#fff' : '#1a1a1a',
                }}>
                <GlassReflection isDark={isDark} />
                <Share2 className="relative z-10 w-4 h-4" strokeWidth={2} />
                <span className="relative z-10 text-[12.5px] tracking-[0.3px]"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                  Share
                </span>
              </AppButton>
            </div>

            {/* Everything a venue profile would carry — events count, followers,
                capacity, About, amenities, socials, photos, the event history — is
                *absent* rather than invented (ADR-0002): this sheet receives a
                venue name only. The public `GET /venues/:id` payload serves all of
                it; hydrating the sheet is tracked in
                `.scratch/web2-ui-import/issues/01-venue-detail-wireup.md`. */}

          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
