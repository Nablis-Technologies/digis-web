import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, BadgeCheck, Calendar, Check, ChevronRight, Clock, Loader2, MapPin, Share2, UserPlus, Users, X } from 'lucide-react';
import { flatAvatarColor } from '@/lib/utils/avatarColor';
import { BrandInstagram, BrandTikTok, BrandYouTube, BrandWebsite } from './BrandIcons';
import { SegmentedToggle } from '@/components/primitives/SegmentedToggle';
import { AppButton } from '@/components/primitives/AppButton';
import { glassEdgeReflection, glassReflection, glassEdge, type GlassReflectionSettings } from '@/lib/ui/glass';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { useAuth } from '@/features/auth/context/AuthContext';
import { followEntity, unfollowEntity } from '@/lib/follows';
import { fetchOrganizationProfile, type OrganizationProfile } from '@/lib/organizations';
import { toastError, toastWarning } from '@/lib/feedback';

export function resolveOrganizers(event: any): any[] {
  // The backend nests a single organization summary `{ id, name, slug }`.
  // Render only what it provides — never invent co-hosts, handles, or stats.
  if (Array.isArray(event.organizers) && event.organizers.length > 0) {
    return event.organizers;
  }
  if (event.organizer || event.organizerId) {
    return [{ id: event.organizerId, name: event.organizer || '', slug: event.organizerSlug }];
  }
  return [];
}

export function OrganizerCard({ organizers, isDark, compact = false, reflectionSettings }: { organizers: any[]; isDark: boolean; compact?: boolean; reflectionSettings?: GlassReflectionSettings }) {
  const { isAuthenticated } = useAuth();
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [pendingFollow, setPendingFollow] = useState<string | null>(null);
  const [profileTarget, setProfileTarget] = useState<any | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const accent = isDark ? '#d6f905' : '#d6f905';
  const initialsOf = (name: string) => name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  // Follow is a real backend command (`POST|DELETE /organizations/:id/follow`),
  // keyed by the organization id — never a local-only toggle.
  const toggleFollow = async (id?: string) => {
    if (!id) return;
    if (!isAuthenticated) { toastWarning('Sign in to follow organizers.'); return; }
    if (pendingFollow) return;
    const next = !(followingMap[id] || false);
    setPendingFollow(id);
    try {
      if (next) await followEntity('organizations', id);
      else await unfollowEntity('organizations', id);
      setFollowingMap((prev) => ({ ...prev, [id]: next }));
    } catch (e) {
      toastError(e, 'Couldn’t update your follow. Please try again.');
    } finally {
      setPendingFollow(null);
    }
  };

  if (organizers.length === 0) return null;
  const lead = organizers[0];
  const coHosts = organizers.slice(1);
  const initials = initialsOf(lead.name);

  // Compact: every host collapses into a single row — an overlapping avatar
  // stack plus the names inline (truncated when they run past the card). The
  // whole row opens the full host list; there's no single follow button here
  // because with multiple co-hosts it's ambiguous who it would follow.
  if (compact) {
    const stack = organizers.slice(0, 3);
    const overflow = organizers.length - stack.length;
    const ring = isDark ? 'rgba(255,255,255,0.16)' : '#fff';
    return (
      <>
        <AppButton
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setListOpen(true)}
          aria-label="View all organizers"
          className="relative w-full overflow-hidden flex items-center gap-3 pl-4 pr-4 py-3.5 rounded-2xl text-left cursor-pointer"
          style={{
            background: isDark
              ? 'linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))'
              : 'linear-gradient(145deg, rgba(255,255,255,0.72), rgba(234,231,242,0.58))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}>
          <span aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none rounded-[inherit]" style={glassReflection(isDark, undefined, reflectionSettings)} />
          <span aria-hidden="true" className="absolute inset-0 z-[1] pointer-events-none rounded-[inherit]" style={glassEdgeReflection(isDark, reflectionSettings)} />
          <div className="relative z-10 flex items-center flex-shrink-0">
            {stack.map((o, idx) => (
              <div key={o.id ?? o.name} className="relative"
                style={{ marginLeft: idx === 0 ? 0 : -9, zIndex: stack.length - idx }}>
                {o.avatar ? (
                  <img src={o.avatar} alt={o.name} className="w-8 h-8 rounded-full object-cover"
                    style={{ boxShadow: `0 0 0 2px ${ring}` }} />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: flatAvatarColor(o.name), boxShadow: `0 0 0 2px ${ring}` }}>
                    <span className="text-[10px]"
                      style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: '#fff' }}>
                      {initialsOf(o.name)}
                    </span>
                  </div>
                )}
                {o.verified && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                    style={{ background: isDark ? '#141414' : '#fff' }}>
                    <BadgeCheck className="w-[11px] h-[11px]" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2.5} />
                  </div>
                )}
              </div>
            ))}
            {overflow > 0 && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  marginLeft: -9,
                  background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(20,18,40,0.08)',
                  boxShadow: `0 0 0 2px ${ring}`,
                }}>
                <span className="text-[10px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(20,18,40,0.6)', fontWeight: 600 }}>
                  +{overflow}
                </span>
              </div>
            )}
          </div>

          <div className="relative z-10 min-w-0 flex-1">
            <span className="block text-[9px] tracking-[1.6px] uppercase leading-none"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)', fontWeight: 600 }}>
              {coHosts.length > 0 ? 'Hosted by' : 'Organizer'}
            </span>
            <span className="block text-[12.5px] truncate mt-0.5 leading-none"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.95)' : '#1a1a1a', fontWeight: 500 }}>
              {organizers.map((o) => o.name).join(', ')}
            </span>
          </div>

          <ChevronRight className="relative z-10 w-4 h-4 flex-shrink-0" strokeWidth={2}
            style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} />
        </AppButton>

        <AnimatePresence>
          {listOpen && (
            <OrganizerListSheet
              organizers={organizers}
              followingMap={followingMap}
              pendingFollow={pendingFollow}
              onToggleFollow={toggleFollow}
              onOpenProfile={(o) => { setListOpen(false); setProfileTarget(o); }}
              onClose={() => setListOpen(false)}
              isDark={isDark}
            />
          )}
          {profileTarget && (
            <OrganizerProfileSheet organizer={profileTarget} following={followingMap[profileTarget.id] || false}
              pending={pendingFollow === profileTarget.id}
              onToggleFollow={() => toggleFollow(profileTarget.id)}
              onClose={() => setProfileTarget(null)} isDark={isDark} />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))'
            : 'linear-gradient(145deg, rgba(255,255,255,0.72), rgba(234,231,242,0.58))',
          boxShadow: isDark
            ? 'inset 0 1px 0 rgba(255,255,255,0.025)'
            : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 14px 32px rgba(54,47,70,0.055)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
        <GlassReflection isDark={isDark} />
        {organizers.map((o, idx) => (
          <div key={o.id ?? o.name}
            className="relative z-10 flex items-center gap-3 px-4 py-2.5"
            style={{
              boxShadow: idx === 0 ? 'none' : `inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(81,72,101,0.075)'}`,
            }}>
            <AppButton onClick={() => setProfileTarget(o)} className="relative flex-shrink-0 cursor-pointer">
              {o.avatar ? (
                <img src={o.avatar} alt={o.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: flatAvatarColor(o.name) }}>
                  <span className="text-[11px]"
                    style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: '#fff' }}>
                    {initialsOf(o.name)}
                  </span>
                </div>
              )}
              {o.verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{ background: isDark ? '#0a0a0a' : '#fff' }}>
                  <BadgeCheck className="w-[13px] h-[13px]" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2.5} />
                </div>
              )}
            </AppButton>
            <AppButton onClick={() => setProfileTarget(o)} className="flex-1 min-w-0 text-left cursor-pointer">
              <p className="text-[13px] truncate"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.95)' : '#1a1a1a' }}>
                {o.name}
              </p>
              <p className="text-[10.5px] truncate"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                {o.handle}
              </p>
            </AppButton>
            <AppButton whileTap={{ scale: 0.95 }}
              onClick={() => toggleFollow(o.id)}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{
                background: (followingMap[o.id] || false)
                  ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
                  : (isDark ? 'rgba(214,249,5,0.1)' : accent),
                ...((followingMap[o.id] || false) ? glassEdge(isDark) : {}),
              }}>
              {(followingMap[o.id] || false) ? (
                <Check className="w-3 h-3" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }} strokeWidth={2.5} />
              ) : (
                <UserPlus className="w-3 h-3" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2} />
              )}
            </AppButton>
          </div>
        ))}
      </motion.div>

      <AnimatePresence>
        {profileTarget && (
          <OrganizerProfileSheet organizer={profileTarget} following={followingMap[profileTarget.id] || false}
            pending={pendingFollow === profileTarget.id}
            onToggleFollow={() => toggleFollow(profileTarget.id)}
            onClose={() => setProfileTarget(null)} isDark={isDark} />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Inline organizer profile — the profile the sheet shows, rendered directly on
 * the event detail page. Used when there is a single organizer, so there is no
 * popup to open. Reuses the public profile fetch + the follow command.
 */
export function OrganizerInline({ organizer, isDark }: { organizer: any; isDark: boolean }) {
  const { isAuthenticated } = useAuth();
  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    if (!organizer?.id) return;
    let alive = true;
    setProfileError(false);
    fetchOrganizationProfile(organizer.id)
      .then((p) => { if (alive) { setProfile(p); setFollowing(!!p.is_following); } })
      .catch(() => { if (alive) setProfileError(true); });
    return () => { alive = false; };
  }, [organizer?.id]);

  const toggleFollow = async () => {
    if (!organizer?.id) return;
    if (!isAuthenticated) { toastWarning('Sign in to follow organizers.'); return; }
    if (pending) return;
    const next = !following;
    setPending(true);
    try {
      if (next) await followEntity('organizations', organizer.id);
      else await unfollowEntity('organizations', organizer.id);
      setFollowing(next);
    } catch (e) {
      toastError(e, 'Couldn’t update your follow. Please try again.');
    } finally {
      setPending(false);
    }
  };

  const accent = isDark ? '#d6f905' : '#0a0a0a';
  const initials = (organizer.name || '?').split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const description: string | undefined = profile?.description ?? organizer.bio ?? undefined;
  const followerCount: number | undefined = profile?.follower_count;
  const followerLabel = followerCount != null
    ? (followerCount >= 1000 ? `${(followerCount / 1000).toFixed(1)}k` : `${followerCount}`)
    : undefined;
  const socialLinks = profile?.social_links ?? null;
  const socials: [string, string][] = socialLinks
    ? (Object.entries(socialLinks).filter(([, u]) => typeof u === 'string' && u) as [string, string][])
    : [];

  return (
    <div
      className="relative rounded-2xl overflow-hidden px-4 py-4"
      style={{
        background: isDark
          ? 'linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))'
          : 'linear-gradient(145deg, rgba(255,255,255,0.72), rgba(234,231,242,0.58))',
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.025)'
          : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 14px 32px rgba(54,47,70,0.055)',
      }}
    >
      <GlassReflection isDark={isDark} />
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: flatAvatarColor(organizer.name || 'Digis') }}>
          <span className="text-[13px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: '#fff' }}>{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[14px] truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: isDark ? '#fff' : '#1a1a1a' }}>{organizer.name}</p>
            {organizer.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent }} strokeWidth={2.5} />}
          </div>
          {followerLabel && (
            <p className="text-[11px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
              {followerLabel} followers
            </p>
          )}
        </div>
        {/* Subtle outlined follow button — the quiet treatment used on the
            venue / organizer rows, not a solid accent CTA. */}
        <AppButton
          whileTap={{ scale: 0.97 }}
          onClick={() => void toggleFollow()}
          disabled={pending}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full cursor-pointer disabled:cursor-not-allowed"
          style={{
            background: 'transparent',
            ...glassEdge(isDark),
            color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
          }}
        >
          {following ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />}
          <span className="text-[11.5px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>{following ? 'Following' : 'Follow'}</span>
        </AppButton>
      </div>

      {description && (
        <p className="relative z-10 mt-3 text-[12.5px] leading-relaxed"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
          {description}
        </p>
      )}

      {socials.length > 0 && (
        <div className="relative z-10 mt-3 flex flex-wrap gap-3">
          {socials.map(([key, url]) => (
            <a key={key} href={url} target="_blank" rel="noreferrer noopener"
              className="text-[11px] underline capitalize"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#d6f905' : '#0a0a0a' }}>
              {key}
            </a>
          ))}
        </div>
      )}

      {profileError && (
        <p className="relative z-10 mt-3 text-[11px]" style={{ color: '#e5484d', fontFamily: "'Inter', sans-serif" }}>
          Couldn’t load this organizer’s profile.
        </p>
      )}
    </div>
  );
}

function OrganizerStat({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[15px] leading-none mb-1"
        style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
        {value}
      </span>
      <span className="text-[9px] tracking-[1.5px] uppercase"
        style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
        {label}
      </span>
    </div>
  );
}

function OrganizerListSheet({ organizers, followingMap, pendingFollow, onToggleFollow, onOpenProfile, onClose, isDark }: {
  organizers: any[]; followingMap: Record<string, boolean>; pendingFollow: string | null; onToggleFollow: (handle: string) => void;
  onOpenProfile: (o: any) => void; onClose: () => void; isDark: boolean;
}) {
  const accent = isDark ? '#d6f905' : '#d6f905';
  const initialsOf = (name: string) => name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

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
          background: isDark ? '#101010' : '#fff',
          maxHeight: '85vh',
        }}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-4"
          style={{ boxShadow: `inset 0 -1px 0 ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <div>
            <p className="text-[9px] tracking-[3px] uppercase"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
              {organizers.length > 1 ? 'Hosted by' : 'Organizer'}
            </p>
            <p className="text-[15px] mt-0.5"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
              {organizers.length} {organizers.length > 1 ? 'organizers' : 'organizer'}
            </p>
          </div>
          <AppButton onClick={onClose}
            className="relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            }}>
            <GlassReflection isDark={isDark} />
            <X className="relative z-10 w-4 h-4" style={{ color: isDark ? '#fff' : 'rgba(0,0,0,0.8)' }} strokeWidth={2.25} />
          </AppButton>
        </div>

        <div className="relative z-10 overflow-y-auto overscroll-contain p-3" style={{ WebkitOverflowScrolling: 'touch' }}>
          {organizers.map((o) => {
            const following = followingMap[o.id] || false;
            return (
              <div key={o.id ?? o.name}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
                <AppButton onClick={() => onOpenProfile(o)} className="relative flex-shrink-0 cursor-pointer">
                  {o.avatar ? (
                    <img src={o.avatar} alt={o.name} className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ background: flatAvatarColor(o.name) }}>
                      <span className="text-[13px]"
                        style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: '#fff' }}>
                        {initialsOf(o.name)}
                      </span>
                    </div>
                  )}
                  {o.verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: isDark ? '#101010' : '#fff' }}>
                      <BadgeCheck className="w-[14px] h-[14px]" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2.5} />
                    </div>
                  )}
                </AppButton>
                <AppButton onClick={() => onOpenProfile(o)} className="flex-1 min-w-0 text-left cursor-pointer">
                  <p className="text-[13.5px] truncate"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.95)' : '#1a1a1a', fontWeight: 500 }}>
                    {o.name}
                  </p>
                  <p className="text-[11px] truncate mt-0.5"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                    {o.role} · {o.handle}
                  </p>
                </AppButton>
                <AppButton whileTap={{ scale: 0.95 }}
                  onClick={() => onToggleFollow(o.id)}
                  disabled={pendingFollow === o.id}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: following
                      ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
                      : (isDark ? 'rgba(214,249,5,0.1)' : accent),
                    ...(following ? glassEdge(isDark) : {}),
                  }}>
                  {pendingFollow === o.id
                    ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2} />
                    : following
                      ? <Check className="w-3 h-3" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }} strokeWidth={2.5} />
                      : <UserPlus className="w-3 h-3" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2} />}
                  <span className="text-[11px]"
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: following ? (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)') : (isDark ? accent : '#0a0a0a') }}>
                    {following ? 'Following' : 'Follow'}
                  </span>
                </AppButton>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );

  // Portal to the body so the sheet escapes the event page's zIndex:1 stacking
  // context and lands above the fixed CTA bar.
  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : sheet;
}

function OrganizerProfileSheet({ organizer, following, pending, onToggleFollow, onClose, isDark }: {
  organizer: any; following: boolean; pending: boolean; onToggleFollow: () => void; onClose: () => void; isDark: boolean;
}) {
  const initials = organizer.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const accent = isDark ? '#d6f905' : '#d6f905';
  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
  const [eventsTab, setEventsTab] = useState<'upcoming' | 'past'>('upcoming');
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [profileError, setProfileError] = useState(false);

  // The event payload carries only `{ id, name, slug }`; fetch the public
  // organization profile for the description / counts / socials, and surface a
  // failed load rather than inventing them.
  useEffect(() => {
    if (!organizer.id) return;
    let alive = true;
    setProfileError(false);
    fetchOrganizationProfile(organizer.id)
      .then((p) => { if (alive) setProfile(p); })
      .catch(() => { if (alive) setProfileError(true); });
    return () => { alive = false; };
  }, [organizer.id]);

  const description: string | undefined = profile?.description ?? organizer.bio ?? undefined;
  const followerCount: number | undefined = profile?.follower_count;
  const eventsCount: number | undefined = profile?.events_count;
  const socialLinks = profile?.social_links ?? null;
  const stats = [
    ...(eventsCount != null ? [{ icon: <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Events', value: `${eventsCount}` }] : []),
    ...(followerCount != null ? [{ icon: <Users className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Followers', value: formatCount(followerCount) }] : []),
  ];
  // Real social links only — the profile's `social_links` map, never fabricated.
  const socialEntries: [string, string][] = socialLinks
    ? Object.entries(socialLinks).filter(([, url]) => typeof url === 'string' && url.length > 0) as [string, string][]
    : [];
  const socialIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('instagram')) return <BrandInstagram />;
    if (k.includes('tiktok')) return <BrandTikTok isDark={isDark} />;
    if (k.includes('youtube')) return <BrandYouTube />;
    return <BrandWebsite isDark={isDark} />;
  };

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
          background: isDark ? '#101010' : '#fff',
          maxHeight: '90vh',
        }}>
        <GlassReflection isDark={isDark} />
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

        {/* Banner */}
        <div className="relative h-24"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(214,249,5,0.15) 0%, rgba(214,249,5,0.15) 100%)'
              : 'linear-gradient(135deg, rgba(214,249,5,0.12) 0%, rgba(214,249,5,0.12) 100%)',
          }} />

        {/* Profile */}
        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end gap-4 mb-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: flatAvatarColor(organizer.name),
                boxShadow: `0 0 0 3px ${isDark ? '#101010' : '#fff'}`,
              }}>
              <span className="text-[22px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: '#fff' }}>
                {initials}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-[20px] leading-tight"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
              {organizer.name}
            </h3>
            {organizer.verified && (
              <BadgeCheck className="w-4 h-4" style={{ color: isDark ? accent : '#0a0a0a' }} strokeWidth={2.5} />
            )}
          </div>
          {organizer.slug && (
            <p className="text-[12px] mb-3"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
              @{organizer.slug}
            </p>
          )}
          {description && (
            <p className="text-[13px] leading-relaxed font-light mb-5"
              style={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)' }}>
              {description}
            </p>
          )}
          {profileError && (
            <p className="text-[11px] mb-4" style={{ color: '#e5484d', fontFamily: "'Inter', sans-serif" }}>
              Couldn’t load this organizer’s profile.
            </p>
          )}

          {/* Stats — rendered only when the backend provides them. */}
          {stats.length > 0 && (
          <div className="relative flex items-stretch overflow-hidden py-3.5 mb-5 rounded-2xl"
            style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            }}>
            <GlassReflection isDark={isDark} />
            {stats.map((s, i) => (
              <div key={s.label} className="relative z-10 flex-1 flex items-stretch">
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
          )}

          {/* Follow + Share */}
          <div className="flex items-stretch gap-2 mb-5">
            <AppButton
              whileTap={{ scale: 0.97 }}
              onClick={onToggleFollow}
              disabled={pending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: following
                  ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
                  : accent,
                ...(following ? glassEdge(isDark) : {}),
                color: following ? (isDark ? '#fff' : '#1a1a1a') : '#0a0a0a',
              }}>
              {pending
                ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                : following
                  ? <Check className="w-4 h-4" strokeWidth={2.5} />
                  : <UserPlus className="w-4 h-4" strokeWidth={2} />}
              <span className="text-[12.5px] tracking-[0.3px]"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                {following ? 'Following' : 'Follow Organizer'}
              </span>
            </AppButton>
            <AppButton
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (typeof navigator !== 'undefined' && (navigator as any).share) {
                  (navigator as any).share({ title: organizer.name, text: organizer.bio || organizer.name }).catch(() => {});
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

          {/* Socials — real links only (the backend profile's social_links). */}
          {socialEntries.length > 0 && (
            <div className="mb-5">
              <span className="text-[10px] tracking-[1.8px] uppercase block mb-2.5"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                Socials
              </span>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1"
                style={{ WebkitOverflowScrolling: 'touch' }}>
                {socialEntries.map(([key, url]) => (
                  <a key={key} href={url} target="_blank" rel="noreferrer noopener"
                    className="flex-shrink-0 flex flex-col items-center gap-1.5">
                    <div className="relative w-[60px] h-[60px] rounded-2xl overflow-hidden flex items-center justify-center"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(20,18,40,0.85)',
                      }}>
                      <GlassReflection isDark={isDark} />
                      <span className="relative z-10 flex items-center justify-center">{socialIcon(key)}</span>
                    </div>
                    <span className="text-[10px] tracking-[0.2px] capitalize"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)' }}>
                      {key}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Events with segmented control */}
          {(() => {
            // No fabricated history: there is no events-by-organizer endpoint
            // (BACKEND_GAPS #49), so render only what the payload carries.
            const upcoming = Array.isArray((organizer as any).upcomingEvents) ? (organizer as any).upcomingEvents : [];
            const past = Array.isArray((organizer as any).pastEvents) ? (organizer as any).pastEvents : [];
            const active = eventsTab === 'upcoming' ? upcoming : past;
            const isPast = eventsTab === 'past';
            return (
              <div className="mb-5">
                {/* Shared segmented control */}
                <SegmentedToggle
                  className="mb-3"
                  value={eventsTab}
                  onValueChange={(v) => setEventsTab(v as 'upcoming' | 'past')}
                  isDark={isDark}
                  ariaLabel="Organizer event history"
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
                  {active.length === 0 && (
                    <p className="text-[12px] px-1 py-3"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                      No {eventsTab} events to show.
                    </p>
                  )}
                  {active.map((ev: any, i: number) => (
                    <AppButton key={ev.name + i} whileTap={{ scale: 0.99 }}
                      className="relative w-full flex items-center gap-3 overflow-hidden p-2.5 rounded-2xl text-left cursor-pointer"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
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
            <AppButton whileTap={{ scale: 0.98 }} onClick={onToggleFollow} disabled={pending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: following
                  ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                  : (isDark ? 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)' : '#0a0a0a'),
                color: following ? (isDark ? '#fff' : '#1a1a1a') : (isDark ? '#0a0a0a' : '#fff'),
                ...(following ? glassEdge(isDark) : {}),
              }}>
              {pending
                ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                : following ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <UserPlus className="w-4 h-4" strokeWidth={2} />}
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
