import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, BadgeCheck, Calendar, Check, Clock, Crown, MapPin, Music2, Share2, UserPlus, Users, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { flatAvatarColor } from '@/lib/utils/avatarColor';
import { BrandAppleMusic, BrandInstagram, BrandSoundCloud, BrandSpotify, BrandTikTok, BrandYouTube, BrandWebsite } from './BrandIcons';
import { SegmentedToggle } from '@/components/primitives/SegmentedToggle';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge } from '@/lib/ui/glass';
import { useDominantColor } from '@/features/event-detail/hooks/useDominantColor';
import { artworkPalette } from '@/lib/ui/artworkPalette';
import { SheetEnvironment } from './SheetEnvironment';

export function resolveLineup(lineup: any): any[] {
  // Backend-sourced only — never fabricate a lineup or fill missing artist
  // fields with invented values (no public endpoint exposes event participants
  // yet; BACKEND_GAPS #36). Absent lineup → empty → the section hides.
  const source = Array.isArray(lineup) ? lineup : [];
  return source.map((a: any) => ({
    name: a.name,
    handle: a.handle,
    role: a.role,
    time: a.time,
    genre: a.genre,
    verified: a.verified === true,
    followers: a.followers,
    eventsPlayed: a.eventsPlayed,
    rating: a.rating,
    bio: a.bio,
    image: a.image,
    gradient: a.gradient,
  }));
}

/**
 * `compact` is the desktop-rail variant: slightly narrower portraits and tighter
 * spacing, with no full-bleed scroll rail (it sits inside the rail column there,
 * so bleeding past it would break the grid).
 */
export function LineupSection({ lineup, isDark, compact = false }: { lineup: any; isDark: boolean; compact?: boolean }) {
  const artists = resolveLineup(lineup);
  // No backend lineup → render nothing (never a fabricated one).
  if (artists.length === 0) return null;
  const accent = isDark ? '#d6f905' : '#d6f905';
  const accentRgb = isDark ? '214,249,5' : '214,249,5';
  const initialsOf = (name: string) => name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const [profileTarget, setProfileTarget] = useState<any | null>(null);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const toggleFollow = (handle: string) => setFollowingMap(prev => ({ ...prev, [handle]: !prev[handle] }));

  return (
    <div>
      <div className={`flex items-center justify-between ${compact ? 'mb-2.5' : 'mb-4'}`}>
        <div className="flex items-center gap-2">
          <Music2 className="w-3.5 h-3.5" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2} />
          <h2 className="text-[13px] tracking-[2px] uppercase"
            style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(214,249,5,0.8)' : 'rgba(0,0,0,0.7)' }}>
            Lineup
          </h2>
        </div>
        <span className="text-[10px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-full"
          style={{
            fontFamily: "'Inter', sans-serif",
            background: isDark ? 'rgba(214,249,5,0.08)' : 'transparent',
            ...glassEdge(isDark),
            color: isDark ? accent : '#0a0a0a',
          }}>
          {artists.length} artists
        </span>
      </div>

      <div className={`flex overflow-x-auto scrollbar-hide ${compact ? 'gap-3 pb-1' : 'gap-4 pb-3 -mx-5 px-5 lg:-mx-8 lg:px-8'}`}
        style={{ scrollSnapType: 'x mandatory', scrollPaddingLeft: '20px', WebkitOverflowScrolling: 'touch' }}>
        {artists.map((a, i) => {
          const isHeadliner = (a.role || '').toLowerCase().includes('headliner');
          const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`;
          return (
            <motion.div key={a.name + i}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setProfileTarget(a)}
              className={`group relative flex-shrink-0 cursor-pointer ${compact ? 'w-[124px]' : 'w-[136px] sm:w-[164px]'}`}
              style={{ scrollSnapAlign: 'start' }}>

              {/* Portrait */}
              <div className={`relative w-full overflow-hidden ${compact ? 'rounded-[20px]' : 'rounded-[22px]'}`}
                style={{
                  aspectRatio: '3/4',
                  background: a.image ? undefined : flatAvatarColor(a.name),
                  ...(isHeadliner ? {} : glassEdge(isDark)),
                }}>
                {a.image && (
                  <img src={a.image} alt={a.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.08]" />
                )}

                {/* Initials watermark when no image */}
                {!a.image && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span style={{
                      fontFamily: "'Zalando Sans Expanded', sans-serif",
                      fontSize: 72,
                      letterSpacing: '-3px',
                      color: 'rgba(255,255,255,0.95)',
                      textShadow: '0 4px 24px rgba(0,0,0,0.4)',
                    }}>
                      {initialsOf(a.name)}
                    </span>
                  </div>
                )}

                {/* Top row: headliner crown only */}
                {isHeadliner && (
                  <div className="absolute top-3 left-3">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, rgba(${accentRgb},0.95), rgba(${accentRgb},0.75))`,
                      }}>
                      <Crown className="w-2.5 h-2.5" style={{ color: '#0a0a0a' }} strokeWidth={2.5} />
                      <span className="text-[8.5px] tracking-[1.4px] uppercase"
                        style={{ fontFamily: "'Inter', sans-serif", color: '#0a0a0a', fontWeight: 700 }}>
                        Headliner
                      </span>
                    </div>
                  </div>
                )}

                {/* Bottom gradient + name/time overlay */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.85) 100%)' }} />
                <div className={`absolute bottom-0 left-0 right-0 ${compact ? 'px-3 pb-3' : 'px-3.5 pb-3.5'}`}>
                  <div className="flex items-center gap-1">
                    <h3 className={`${compact ? 'text-[12.5px]' : 'text-[13.5px]'} leading-[1.1] tracking-[-0.2px] truncate`}
                      style={{
                        fontFamily: "'Zalando Sans Expanded', sans-serif",
                        color: '#fff',
                        fontWeight: 400,
                        textShadow: '0 2px 12px rgba(0,0,0,0.5)',
                      }}>
                      {a.name}
                    </h3>
                    {a.verified && (
                      <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5}
                        style={{ color: accent }} />
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-white/85">
                    <Clock className="w-2.5 h-2.5" style={{ color: 'rgba(255,255,255,0.85)' }} strokeWidth={2} />
                    <span className="text-[10px] tracking-[0.6px]"
                      style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                      {a.time ?? a.role ?? 'Performer'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {profileTarget && (
          <ArtistProfileSheet artist={profileTarget}
            following={followingMap[profileTarget.handle] || false}
            onToggleFollow={() => toggleFollow(profileTarget.handle)}
            onClose={() => setProfileTarget(null)} isDark={isDark} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ArtistProfileSheet({ artist, following, onToggleFollow, onClose, isDark }: {
  artist: any; following: boolean; onToggleFollow: () => void; onClose: () => void; isDark: boolean;
}) {
  const initials = artist.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const accent = isDark ? '#d6f905' : '#d6f905';
  const accentRgb = isDark ? '214,249,5' : '214,249,5';
  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
  const isHeadliner = (artist.role || '').toLowerCase().includes('headliner');
  const [eventsTab, setEventsTab] = useState<'upcoming' | 'past'>('upcoming');
  // The portrait drives the sheet's colour world — a tinted base, the blurred
  // artwork, and a glow (the export's "artwork-driven environment"). No image →
  // the brand-hue fallback; never a fabricated palette.
  const palette = artworkPalette(useDominantColor(artist.image), isDark);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const sheet = (
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
          background: palette.bg1,
          maxHeight: '90vh',
          transition: 'background 600ms ease',
        }}>
        <GlassReflection isDark={isDark} />

        <SheetEnvironment palette={palette} artwork={artist.image} isDark={isDark} />

        {/* Close — sticky top-right, always reachable */}
        <AppButton onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
          style={{
            background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}>
          <GlassReflection isDark={isDark} />
          <X className="relative z-10 w-4 h-4" style={{ color: isDark ? '#fff' : 'rgba(0,0,0,0.8)' }} strokeWidth={2.25} />
        </AppButton>

        {/* Scrollable content */}
        <div className="relative z-10 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>

        {/* Profile */}
        <div className="px-6 pb-6 pt-7">
          {/* Portrait and identity share one compact header, so the space beside the image carries useful context. */}
          <div className="flex items-center gap-4 pr-10 mb-5">
            <div className="relative w-[88px] h-[88px] rounded-full overflow-hidden flex-shrink-0"
              style={{
                background: artist.image ? undefined : artist.gradient,
                boxShadow: isDark ? '0 8px 28px rgba(0,0,0,0.45)' : '0 8px 28px rgba(20,18,40,0.14)',
              }}>
              <GlassReflection isDark={isDark} />
              {artist.image ? (
                <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{
                    fontFamily: "'Zalando Sans Expanded', sans-serif",
                    fontSize: 34,
                    letterSpacing: '-2px',
                    color: 'rgba(255,255,255,0.95)',
                    textShadow: '0 4px 18px rgba(0,0,0,0.35)',
                  }}>
                    {initials}
                  </span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {isHeadliner && (
                <div className="inline-flex items-center gap-1 mb-1.5">
                  <Crown className="w-3 h-3" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2.5} />
                  <span className="text-[9px] tracking-[1.25px] uppercase"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? accent : '#0a0a0a', fontWeight: 700 }}>
                    Headliner
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <h3 className="text-[22px] leading-[1.05] truncate"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                  {artist.name}
                </h3>
                {artist.verified && (
                  <BadgeCheck className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2.5} />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 min-w-0">
                {artist.handle && (
                  <span className="text-[12px] truncate"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.48)' }}>
                    {artist.handle}
                  </span>
                )}
                {artist.genre && (
                  <>
                    <span className="w-0.5 h-0.5 rounded-full flex-shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.25)' }} />
                    <span className="text-[9px] tracking-[1.05px] uppercase truncate"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? accent : '#0a0a0a', fontWeight: 600 }}>
                      {artist.genre}
                    </span>
                  </>
                )}
              </div>
              {[artist.role, artist.time].filter(Boolean).length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Clock className="w-3 h-3" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2} />
                  <span className="text-[10.5px] tracking-[0.25px] truncate"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.67)' : 'rgba(0,0,0,0.62)', fontWeight: 500 }}>
                    {[artist.role, artist.time].filter(Boolean).join(' · ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {artist.bio && (
            <p className="text-[13px] leading-relaxed font-light mb-4"
              style={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)' }}>
              {artist.bio}
            </p>
          )}

          {/* Stats */}
          <div className="relative flex items-stretch overflow-hidden py-3.5 mb-5 rounded-2xl"
            style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            }}>
            <GlassReflection isDark={isDark} />
            {[
              artist.followers != null && { icon: <Users className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Followers', value: formatCount(artist.followers) },
              artist.eventsPlayed != null && { icon: <Music2 className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Shows', value: `${artist.eventsPlayed}` },
            ].filter(Boolean).map((s: any, i: number) => (
              <div key={s.label} className="relative z-10 flex-1 flex items-stretch">
                {i > 0 && (
                  <div className="w-px self-stretch my-1"
                    style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
                )}
                <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
                  <div className="flex items-center gap-1.5"
                    style={{ color: isDark ? accent : '#0a0a0a' }}>
                    {s.icon}
                    <span className="leading-none"
                      style={{
                        fontFamily: "'Zalando Sans Expanded', sans-serif",
                        fontSize: 15,
                        color: isDark ? '#fff' : '#1a1a1a',
                      }}>
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
                ...(following ? glassEdge(isDark) : {}),
                color: following ? (isDark ? '#fff' : '#1a1a1a') : '#0a0a0a',
              }}>
              {following
                ? <Check className="w-4 h-4" strokeWidth={2.5} />
                : <UserPlus className="w-4 h-4" strokeWidth={2} />}
              <span className="text-[12.5px] tracking-[0.3px]"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                {following ? 'Following' : 'Follow Artist'}
              </span>
            </AppButton>
            <AppButton
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (typeof navigator !== 'undefined' && (navigator as any).share) {
                  (navigator as any).share({ title: artist.name, text: artist.bio || artist.name }).catch(() => {});
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

          {/* Socials & Music */}
          <div className="mb-5">
            <span className="text-[10px] tracking-[1.8px] uppercase block mb-2.5"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
              Socials & Music
            </span>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1"
              style={{ WebkitOverflowScrolling: 'touch' }}>
              {[
                { label: 'Instagram', icon: <BrandInstagram /> },
                { label: 'Spotify', icon: <BrandSpotify /> },
                { label: 'Apple Music', icon: <BrandAppleMusic /> },
                { label: 'YouTube', icon: <BrandYouTube /> },
                { label: 'TikTok', icon: <BrandTikTok isDark={isDark} /> },
                { label: 'SoundCloud', icon: <BrandSoundCloud /> },
              ].map((s) => (
                <AppButton key={s.label} whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 cursor-pointer">
                  <div className="relative w-[60px] h-[60px] rounded-2xl overflow-hidden flex items-center justify-center"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(20,18,40,0.85)',
                    }}>
                    <GlassReflection isDark={isDark} />
                    <span className="relative z-10 flex items-center justify-center">{s.icon}</span>
                  </div>
                  <span className="text-[10px] tracking-[0.2px]"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)' }}>
                    {s.label}
                  </span>
                </AppButton>
              ))}
            </div>
          </div>

          {/* Events with segmented control */}
          {(() => {
            const upcoming = (Array.isArray(artist.upcomingEvents) && artist.upcomingEvents.length > 0)
              ? artist.upcomingEvents
              : [
                  { name: 'Addis Vibes Festival', date: 'Mar 15, 2026', venue: 'Millennium Hall', city: 'Addis Ababa', gradient: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)' },
                  { name: 'Skyline Sessions Vol. 4', date: 'Apr 02, 2026', venue: 'Sheraton Addis', city: 'Addis Ababa', gradient: 'linear-gradient(135deg, #d6f905 0%, #1a1a1a 100%)' },
                  { name: 'Bahir Dar Lakeside', date: 'May 10, 2026', venue: 'Blue Nile Resort', city: 'Bahir Dar', gradient: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)' },
                ];
            const past = (Array.isArray(artist.pastEvents) && artist.pastEvents.length > 0)
              ? artist.pastEvents
              : [
                  { name: 'Meskel Square Live', date: 'Sep 27, 2025', venue: 'Meskel Square', city: 'Addis Ababa', gradient: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)', attendees: 5800 },
                  { name: 'Hager Fikir Acoustic', date: 'Jul 18, 2025', venue: 'Hager Fikir Theatre', city: 'Addis Ababa', gradient: 'linear-gradient(135deg, #be185d 0%, #831843 100%)', attendees: 900 },
                  { name: 'Gondar Roots Festival', date: 'Mar 02, 2025', venue: 'Fasil Ghebbi', city: 'Gondar', gradient: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)', attendees: 1600 },
                ];
            const active = eventsTab === 'upcoming' ? upcoming : past;
            const isPast = eventsTab === 'past';
            return (
              <div className="mb-5">
                {/* Shared segmented control — dark mode uses the deeper selected surface. */}
                <SegmentedToggle
                  className="mb-3"
                  value={eventsTab}
                  onValueChange={(v) => setEventsTab(v as 'upcoming' | 'past')}
                  isDark={isDark}
                  ariaLabel="Artist event history"
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
                  {active.map((ev: any, i: number) => (
                    <AppButton key={ev.name + i} whileTap={{ scale: 0.99 }}
                      className="relative w-full flex items-center gap-3 overflow-hidden p-2.5 rounded-2xl text-left cursor-pointer"
                      style={{
                        background: isDark ? (isPast ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)') : (isPast ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.02)'),
                      }}>
                      <GlassReflection isDark={isDark} />
                      <div className="relative z-10 w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden flex flex-col items-center justify-center"
                        style={{ background: ev.image ? undefined : ev.gradient, filter: isPast ? 'saturate(0.7)' : undefined }}>
                        {ev.image && <img src={ev.image} alt={ev.name} className="w-full h-full object-cover" />}
                        <div className="absolute inset-0"
                          style={{ background: isPast
                            ? 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)'
                            : 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.45) 100%)' }} />
                        <span className="relative text-[9px] tracking-[1px] uppercase leading-none"
                          style={{ fontFamily: "'Inter', sans-serif", color: isPast ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                          {ev.date.split(' ')[0]}
                        </span>
                        <span className="relative text-[13px] leading-none mt-0.5"
                          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isPast ? 'rgba(255,255,255,0.9)' : '#fff' }}>
                          {ev.date.split(' ')[1]?.replace(',', '')}
                        </span>
                      </div>
                      <div className="relative z-10 flex-1 min-w-0">
                        <p className="text-[13px] truncate leading-tight"
                          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? (isPast ? 'rgba(255,255,255,0.85)' : '#fff') : (isPast ? 'rgba(0,0,0,0.8)' : '#1a1a1a'), fontWeight: 500 }}>
                          {ev.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }} strokeWidth={2} />
                            <span className="text-[10.5px] truncate"
                              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
                              {ev.venue}{ev.city ? ` · ${ev.city}` : ''}
                            </span>
                          </div>
                          {isPast && typeof ev.attendees === 'number' && (
                            <span className="flex items-center gap-0.5 flex-shrink-0 text-[10px]"
                              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                              <Users className="w-2.5 h-2.5" strokeWidth={2} />
                              {formatCount(ev.attendees)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="relative z-10 w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }} strokeWidth={2} />
                    </AppButton>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <AppButton whileTap={{ scale: 0.98 }} onClick={onToggleFollow}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer"
              style={{
                background: following
                  ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                  : (isDark ? 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)' : '#0a0a0a'),
                color: following ? (isDark ? '#fff' : '#1a1a1a') : (isDark ? '#0a0a0a' : '#fff'),
                ...(following ? glassEdge(isDark) : {}),
              }}>
              {following ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <UserPlus className="w-4 h-4" strokeWidth={2} />}
              <span className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                {following ? 'Following' : 'Follow'}
              </span>
            </AppButton>
          </div>
        </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : sheet;
}

