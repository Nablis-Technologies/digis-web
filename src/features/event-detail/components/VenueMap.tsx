import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Accessibility, BadgeCheck, Building2, Calendar, Car, Check, Clock, Globe, MapPin, Navigation as NavigationIcon, Share2, Snowflake, Sparkle, Sparkles, UserPlus, Users, Utensils, Wifi, Wine, X } from 'lucide-react';
import { getVenueCoords } from '@/lib/utils/venueCoords';
import { flatAvatarColor } from '@/lib/utils/avatarColor';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { BrandInstagram, BrandTikTok, BrandYouTube, BrandWebsite } from './BrandIcons';
import { SegmentedToggle } from '@/components/primitives/SegmentedToggle';
import { AppButton } from '@/components/primitives/AppButton';
import { glassEdgeReflection, glassReflection, type GlassReflectionSettings } from '@/lib/ui/glass';

export function VenueMap({ venue, isDark, onOpenProfile, following, onToggleFollow, reflectionSettings }: {
  venue: string; isDark: boolean;
  onOpenProfile?: () => void;
  following?: boolean;
  onToggleFollow?: () => void;
  reflectionSettings?: GlassReflectionSettings;
}) {
  const { lat, lng, address } = getVenueCoords(venue);
  const venueName = venue.split(',')[0].trim();
  const delta = 0.008;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const accent = isDark ? '#d6f905' : '#d6f905';

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
        style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(81,72,101,0.075)'}` }}>
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
              {venueName
                ? venueName.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                : '?'}
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
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
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
              background: isDark ? 'rgba(214,249,5,0.12)' : accent,
              border: `1px solid ${isDark ? 'rgba(214,249,5,0.3)' : 'transparent'}`,
            }}>
            <NavigationIcon className="w-3 h-3" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2.25} />
            <span className="text-[11px] tracking-[0.3px]"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? accent : '#0a0a0a', fontWeight: 600 }}>
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
  const { lat, lng, address } = getVenueCoords(venue);
  const venueName = venue.split(',')[0].trim();
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const accent = isDark ? '#d6f905' : '#d6f905';
  const accentRgb = isDark ? '214,249,5' : '214,249,5';
  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
  const [eventsTab, setEventsTab] = useState<'upcoming' | 'past'>('upcoming');
  const [aboutExpanded, setAboutExpanded] = useState(false);

  const baseFollowers = 4200;
  const followers = following ? baseFollowers + 1 : baseFollowers;
  const capacity = 1200;
  const eventsCount = 47;

  const upcoming = [
    { name: 'Addis Vibes Festival', date: 'Mar 15, 2026', venue: venueName, city: 'Addis Ababa', gradient: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)' },
    { name: 'Skyline Sessions Vol. 4', date: 'Apr 02, 2026', venue: venueName, city: 'Addis Ababa', gradient: 'linear-gradient(135deg, #d6f905 0%, #1a1a1a 100%)' },
    { name: 'Late Night Jazz', date: 'May 22, 2026', venue: venueName, city: 'Addis Ababa', gradient: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)' },
  ];
  const past = [
    { name: 'Digis Nights: NYE 2025', date: 'Dec 31, 2025', venue: venueName, city: 'Addis Ababa', gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', attendees: 2400 },
    { name: 'Meskel Square Live', date: 'Sep 27, 2025', venue: venueName, city: 'Addis Ababa', gradient: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)', attendees: 5800 },
    { name: 'Habesha Beats', date: 'Jun 14, 2025', venue: venueName, city: 'Addis Ababa', gradient: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)', attendees: 1600 },
  ];
  const active = eventsTab === 'upcoming' ? upcoming : past;
  const isPast = eventsTab === 'past';
  const initials = venueName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col"
        style={{
          background: isDark ? '#101010' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          maxHeight: '90vh',
        }}>
        <AppButton onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
          style={{
            background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(14px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
          }}>
          <X className="w-4 h-4" style={{ color: isDark ? '#fff' : 'rgba(0,0,0,0.8)' }} strokeWidth={2.25} />
        </AppButton>

        <div className="overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Banner */}
          <div className="relative h-28"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(214,249,5,0.12) 0%, rgba(26,26,26,0.18) 100%)'
                : 'linear-gradient(135deg, rgba(214,249,5,0.1) 0%, rgba(26,26,26,0.12) 100%)',
            }} />

          <div className="px-6 pb-6 -mt-10">
            <div className="flex items-end gap-4 mb-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: venueName ? flatAvatarColor(venueName) : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                  border: `3px solid ${isDark ? '#101010' : '#fff'}`,
                }}>
                <span className="text-[26px] uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: '#fff' }}>
                  {venueName
                    ? venueName.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                    : '?'}
                </span>
              </div>
            </div>

            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className="text-[20px] leading-tight truncate"
                    style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                    {venueName}
                  </h3>
                  <BadgeCheck className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2.5} />
                </div>
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
                  border: `1px solid ${isDark ? 'rgba(214,249,5,0.25)' : 'rgba(214,249,5,0.2)'}`,
                }}>
                <NavigationIcon className="w-3 h-3" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2} />
                <span className="text-[11px] tracking-[0.3px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? accent : '#0a0a0a' }}>
                  Directions
                </span>
              </motion.a>
            </div>

            {/* Stats */}
            <div className="flex items-stretch py-3.5 mb-5 rounded-2xl"
              style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
              }}>
              {[
                { icon: <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Events', value: `${eventsCount}` },
                { icon: <Users className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Followers', value: formatCount(followers) },
                { icon: <Sparkle className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Capacity', value: formatCount(capacity) },
              ].map((s, i) => (
                <div key={s.label} className="flex-1 flex items-stretch">
                  {i > 0 && (
                    <div className="w-px self-stretch my-1"
                      style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
                  )}
                  <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
                    <div className="flex items-center gap-1.5" style={{ color: isDark ? accent : '#0a0a0a' }}>
                      {s.icon}
                      <span className="leading-none"
                        style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontSize: 15, color: isDark ? '#fff' : '#1a1a1a' }}>
                        {s.value}
                      </span>
                    </div>
                    <span className="text-[9px] tracking-[1.5px] uppercase"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                      {s.label}
                    </span>
                  </div>
                </div>
              ))}
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
                    : accent,
                  border: `1px solid ${following
                    ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
                    : 'transparent'}`,
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
                className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl cursor-pointer"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  color: isDark ? '#fff' : '#1a1a1a',
                }}>
                <Share2 className="w-4 h-4" strokeWidth={2} />
                <span className="text-[12.5px] tracking-[0.3px]"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                  Share
                </span>
              </AppButton>
            </div>

            {/* About */}
            <div className="mb-5">
              <span className="text-[10px] tracking-[1.8px] uppercase block mb-2"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                About
              </span>
              <p className={`text-[13px] leading-relaxed font-light ${aboutExpanded ? '' : 'line-clamp-2'}`}
                style={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)' }}>
                {venueName} is one of Addis Ababa's most beloved gathering spots — a versatile space
                that hosts concerts, cultural showcases, and community celebrations. With a
                {' '}{formatCount(capacity)}-person capacity, state-of-the-art sound, and a warm,
                unmistakable atmosphere, it's where Ethiopia's brightest nights come to life.
                Built for both intimate sets and stadium-scale productions, the venue has welcomed
                everyone from emerging local talent to international headliners over its storied
                run, and remains a cornerstone of the city's cultural calendar.
              </p>
              <AppButton
                onClick={() => setAboutExpanded((v) => !v)}
                className="mt-1.5 text-[11px] tracking-[0.3px] cursor-pointer"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: isDark ? accent : '#0a0a0a',
                  fontWeight: 600,
                }}>
                {aboutExpanded ? 'Read less' : 'Read more'}
              </AppButton>
            </div>

            {/* Amenities */}
            <div className="mb-5">
              <span className="text-[10px] tracking-[1.8px] uppercase block mb-2.5"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                Amenities
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Parking', icon: <Car className="w-3.5 h-3.5" strokeWidth={1.75} /> },
                  { label: 'Accessible', icon: <Accessibility className="w-3.5 h-3.5" strokeWidth={1.75} /> },
                  { label: 'Bar', icon: <Wine className="w-3.5 h-3.5" strokeWidth={1.75} /> },
                  { label: 'Wi-Fi', icon: <Wifi className="w-3.5 h-3.5" strokeWidth={1.75} /> },
                  { label: 'Food', icon: <Utensils className="w-3.5 h-3.5" strokeWidth={1.75} /> },
                  { label: 'A/C', icon: <Snowflake className="w-3.5 h-3.5" strokeWidth={1.75} /> },
                ].map((a) => (
                  <div key={a.label}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                      color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
                    }}>
                    <span style={{ color: isDark ? accent : '#0a0a0a' }}>{a.icon}</span>
                    <span className="text-[11px] tracking-[0.2px] truncate"
                      style={{ fontFamily: "'Inter', sans-serif" }}>
                      {a.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Socials */}
            <div className="mb-5">
              <span className="text-[10px] tracking-[1.8px] uppercase block mb-2.5"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                Socials
              </span>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1"
                style={{ WebkitOverflowScrolling: 'touch' }}>
                {[
                  { label: 'Instagram', icon: <BrandInstagram /> },
                  { label: 'TikTok', icon: <BrandTikTok isDark={isDark} /> },
                  { label: 'YouTube', icon: <BrandYouTube /> },
                  { label: 'Website', icon: <BrandWebsite isDark={isDark} /> },
                ].map((s) => (
                  <AppButton key={s.label} whileTap={{ scale: 0.95 }}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5 cursor-pointer">
                    <div className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                        color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(20,18,40,0.85)',
                      }}>
                      {s.icon}
                    </div>
                    <span className="text-[10px] tracking-[0.2px]"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)' }}>
                      {s.label}
                    </span>
                  </AppButton>
                ))}
              </div>
            </div>

            {/* Photos */}
            {(() => {
              const photos = [
                'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
                'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=600&q=80',
              ];
              return (
                <div className="mb-5 -mx-6">
                  <div className="flex items-center justify-between px-6 mb-2.5">
                    <span className="text-[10px] tracking-[1.8px] uppercase"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                      Photos
                    </span>
                    <span className="text-[10px] tracking-[0.3px]"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
                      {photos.length}
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto px-6 pb-1 scrollbar-hide"
                    style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                    {photos.map((src, i) => {
                      const isFeatured = i === 0;
                      return (
                        <AppButton
                          key={src}
                          whileTap={{ scale: 0.98 }}
                          className="relative flex-shrink-0 overflow-hidden rounded-2xl cursor-pointer group"
                          style={{
                            width: isFeatured ? 200 : 120,
                            height: 150,
                            scrollSnapAlign: 'start',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                          }}>
                          <ImageWithFallback
                            src={src}
                            alt={`${venueName} photo ${i + 1}`}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                          <div className="absolute inset-0"
                            style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)' }} />
                          {isFeatured && (
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full"
                              style={{
                                background: 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.18)',
                              }}>
                              <Sparkles className="w-2.5 h-2.5" style={{ color: accent }} strokeWidth={2.25} />
                              <span className="text-[9px] tracking-[1.4px] uppercase leading-none"
                                style={{ fontFamily: "'Inter', sans-serif", color: '#fff', fontWeight: 600 }}>
                                Featured
                              </span>
                            </div>
                          )}
                        </AppButton>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Shared segmented control */}
            <div className="mb-2">
            <SegmentedToggle
              className="mb-3"
              value={eventsTab}
              onValueChange={setEventsTab}
              isDark={isDark}
              ariaLabel="Venue event history"
              options={(['upcoming', 'past'] as const).map((tab) => {
                const count = tab === 'upcoming' ? upcoming.length : past.length;
                return {
                  value: tab,
                  icon: tab === 'upcoming' ? <Calendar className="w-3.5 h-3.5" strokeWidth={2} /> : <Clock className="w-3.5 h-3.5" strokeWidth={2} />,
                  label: <span className="flex items-center gap-1.5 capitalize"><span>{tab}</span><span className="text-[10px] opacity-65">{count}</span></span>,
                };
              })}
            />
              <div className="space-y-2">
                {active.map((ev, i) => (
                  <AppButton key={ev.name + i} whileTap={{ scale: 0.99 }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl text-left cursor-pointer"
                    style={{
                      background: isDark
                        ? (isPast ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)')
                        : (isPast ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.02)'),
                      border: `1px solid ${isDark
                        ? (isPast ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.06)')
                        : (isPast ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.05)')}`,
                    }}>
                    <div className="relative w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden flex flex-col items-center justify-center"
                      style={{ background: ev.gradient, filter: isPast ? 'saturate(0.7)' : undefined }}>
                      <div className="absolute inset-0"
                        style={{ background: isPast ? 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)' : 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.45) 100%)' }} />
                      <span className="relative text-[9px] tracking-[1px] uppercase leading-none"
                        style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.85)' }}>
                        {ev.date.split(' ')[0]}
                      </span>
                      <span className="relative text-[13px] leading-none mt-0.5"
                        style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: '#fff' }}>
                        {ev.date.split(' ')[1]?.replace(',', '')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] truncate leading-tight"
                        style={{ fontFamily: "'Inter', sans-serif", color: isDark ? (isPast ? 'rgba(255,255,255,0.7)' : '#fff') : (isPast ? 'rgba(0,0,0,0.65)' : '#1a1a1a') }}>
                        {ev.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0"
                            style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }} strokeWidth={2} />
                          <span className="text-[10.5px] truncate"
                            style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
                            {ev.venue}{ev.city ? ` · ${ev.city}` : ''}
                          </span>
                        </div>
                        {isPast && typeof (ev as any).attendees === 'number' && (
                          <span className="flex items-center gap-0.5 flex-shrink-0 text-[10px]"
                            style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                            <Users className="w-2.5 h-2.5" strokeWidth={2} />
                            {formatCount((ev as any).attendees)}
                          </span>
                        )}
                      </div>
                    </div>
                  </AppButton>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
