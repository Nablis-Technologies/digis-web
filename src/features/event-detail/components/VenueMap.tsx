import { SheetEnvironment } from './SheetEnvironment';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Navigation, Share2, UserPlus, X } from 'lucide-react';
import { placeholderSurface, placeholderInk, avatarRing } from '@/lib/utils/avatarAppearance';
import { AppButton } from '@/components/primitives/AppButton';
import { glassEdge, type GlassReflectionSettings } from '@/lib/ui/glass';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { fetchVenue, fetchVenueFollowing, setVenueFollowing, type VenueDetail } from '@/lib/venues';
import { useAuth } from '@/features/auth/context/AuthContext';
import { toastError, toastSuccess, toastWarning } from '@/lib/feedback';

const ACCENT = '#d6f905';

function venueProfile(venue: string, detail?: VenueDetail) {
  const venueName = detail?.name || venue;
  const initials = venueName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  const address = [detail?.address, detail?.city].filter(Boolean).join(', ');
  const lat = detail?.latitude == null || detail.latitude === '' ? NaN : Number(detail.latitude);
  const lng = detail?.longitude == null || detail.longitude === '' ? NaN : Number(detail.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return {
    venueName, initials, address,
    mapUrl: hasCoords ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008},${lat - 0.008},${lng + 0.008},${lat + 0.008}&layer=mapnik&marker=${lat},${lng}` : undefined,
    directionsUrl: hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : undefined,
  };
}

function VenueAvatar({ name, initials, image, isDark, large = false }: { name: string; initials: string; image?: string | null; isDark: boolean; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={`${large ? 'w-20 h-20 rounded-2xl text-[26px]' : 'w-9 h-9 rounded-xl text-[12px]'} overflow-hidden shrink-0 flex items-center justify-center`}
    style={{ background: placeholderSurface(isDark), color: placeholderInk(isDark), boxShadow: large ? avatarRing(isDark) : undefined }}>
    {image && !failed ? <img src={image} alt={name} onError={() => setFailed(true)} className="w-full h-full object-cover" /> : <span>{initials}</span>}
  </div>;
}

function Directions({ href, isDark }: { href?: string; isDark: boolean }) {
  if (!href) return null;
  return <motion.a href={href} target="_blank" rel="noopener noreferrer" whileTap={{ scale: 0.95 }}
    className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold"
    style={{ background: isDark ? 'rgba(214,249,5,0.12)' : ACCENT, color: isDark ? ACCENT : '#0a0a0a', ...glassEdge(isDark) }}>
    <Navigation className="w-3 h-3" /> Directions
  </motion.a>;
}

interface VenueMapProps {
  venue: string;
  detail?: VenueDetail;
  isDark: boolean;
  onOpenProfile?: () => void;
  reflectionSettings?: GlassReflectionSettings;
}

export function VenueMap({ venue, detail, isDark, onOpenProfile, reflectionSettings }: VenueMapProps) {
  const { venueName, address, initials, mapUrl, directionsUrl } = venueProfile(venue, detail);
  return <div className="relative rounded-3xl overflow-hidden" style={{ background: 'var(--card)' }}>
    <GlassReflection isDark={isDark} settings={reflectionSettings} />
    {mapUrl && <div className="relative z-10 h-[200px] overflow-hidden">
      {/* Cross-origin map stays presentational; the overlay owns pointer access. */}
      <iframe src={mapUrl} width="100%" height="100%" loading="lazy" title={`Map of ${venueName}`}
        tabIndex={-1} aria-hidden="true" referrerPolicy="no-referrer-when-downgrade"
        className="pointer-events-none select-none" style={{ border: 0, filter: isDark ? 'invert(0.92) hue-rotate(180deg) brightness(0.95) contrast(0.9)' : 'saturate(0.85)' }} />
      <a href={directionsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open directions to ${venueName}`} className="absolute inset-0" />
    </div>}
    <div className="relative z-10 flex items-center justify-between px-4 py-3 gap-3">
      <AppButton ariaLabel={`View ${venueName} venue profile`} onClick={onOpenProfile} disabled={!onOpenProfile} className="min-w-0 flex-1 flex items-center gap-2.5 text-left" style={{ background: 'transparent' }}>
        <VenueAvatar key={detail?.profile_url} name={venueName} initials={initials} image={detail?.profile_url} isDark={isDark} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] truncate">{venueName}</p>
          {address && <p className="text-[11px] truncate" style={{ color: isDark ? '#aaa9ae' : '#6d6976' }}>{address}</p>}
        </div>
      </AppButton>
      <Directions href={directionsUrl} isDark={isDark} />
    </div>
  </div>;
}

export function VenueSection({ venue, venueId, isDark, reflectionSettings }: { venue: string; venueId?: string; isDark: boolean; reflectionSettings?: GlassReflectionSettings }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['venues', venueId], queryFn: ({ signal }) => fetchVenue(venueId!, signal), enabled: !!venueId, retry: false,
  });
  const status = <>
    {venueId && isPending && !isError && <p role="status" className="text-sm py-3">Loading venue…</p>}
    {isError && <div role="alert" className="text-sm py-3 flex items-center gap-3">
      <span>Couldn’t load venue details.</span>
      <AppButton disabled={isFetching} onClick={() => void refetch()} className="rounded-2xl px-4 py-2" style={glassEdge(isDark)}>{isFetching ? 'Retrying…' : 'Retry'}</AppButton>
    </div>}
  </>;
  return <>
    <h2 className="text-[13px] tracking-[2px] uppercase mb-4" style={{ color: isDark ? 'rgba(214,249,5,0.8)' : '#17161c' }}>Location</h2>
    <VenueMap venue={venue} detail={data} isDark={isDark} onOpenProfile={() => setSheetOpen(true)} reflectionSettings={reflectionSettings} />
    {status}
    {createPortal(<AnimatePresence>{sheetOpen && <VenueProfileSheet key={venueId || venue} venue={venue} detail={data} venueId={venueId} isDark={isDark} onClose={() => setSheetOpen(false)} status={status} />}</AnimatePresence>, document.body)}
  </>;
}

export function VenueProfileSheet({ venue, detail, venueId, isDark, onClose, status }: {
  venue: string; detail?: VenueDetail; venueId?: string; isDark: boolean; onClose: () => void; status?: React.ReactNode;
}) {
  const { venueName, address, initials, directionsUrl } = venueProfile(venue, detail);
  const returnFocus = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const followKey = ['venue-follow', user?.id, venueId];
  const follow = useQuery({
    queryKey: followKey,
    queryFn: ({ signal }) => fetchVenueFollowing(user!.id, venueId!, signal),
    enabled: !!user && !!venueId,
    staleTime: Infinity,
    retry: false,
  });
  const following = follow.data === true;
  const [pending, setPending] = useState(false);
  async function toggleFollow() {
    if (!venueId || pending) return;
    if (!isAuthenticated) { toastWarning('Sign in to follow venues.'); return; }
    setPending(true);
    try {
      const result = await setVenueFollowing(venueId, !following);
      queryClient.setQueryData(followKey, result.following);
      queryClient.setQueryData<VenueDetail>(['venues', venueId], previous => previous && ({ ...previous, follower_count: result.follower_count }));
    } catch (e) { toastError(e, 'Couldn’t update your follow. Please try again.'); }
    finally { setPending(false); }
  }
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: venueName, text: [venueName, address].filter(Boolean).join(' — ') });
      else { await navigator.clipboard.writeText([venueName, address].filter(Boolean).join(' — ')); toastSuccess('Venue details copied.'); }
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) toastError(e, 'Couldn’t share venue details.'); }
  }
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}><Dialog.Overlay asChild><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
    <Dialog.Content asChild aria-describedby={undefined} aria-labelledby={undefined} aria-label={`${venueName} venue profile`}
      onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}><motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 280 }} onClick={e => e.stopPropagation()}
      className="relative w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col" style={{ background: 'var(--card)', maxHeight: '90vh' }}>
      <SheetEnvironment artwork={detail?.profile_url ?? detail?.gallery_urls?.[0]?.medium ?? detail?.gallery_urls?.[0]?.original} isDark={isDark} />
        <GlassReflection isDark={isDark} />
      <AppButton onClick={onClose} ariaLabel="Close" className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--card)' }}><X className="w-4 h-4" /></AppButton>
      <div className="relative z-10 overflow-y-auto overscroll-contain px-6 pb-6 pt-7" style={{ color: isDark ? '#f4f4f0' : '#17161c' }}>
        <VenueAvatar key={detail?.profile_url} name={venueName} initials={initials} image={detail?.profile_url} isDark={isDark} large />
        <div className="flex items-start justify-between gap-3 my-4">
          <div className="min-w-0"><Dialog.Title asChild><h3 className="text-[20px] break-words" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>{venueName}</h3></Dialog.Title>
            {address && <p className="text-xs mt-1 break-words" style={{ color: isDark ? '#aaa9ae' : '#6d6976' }}>{address}</p>}
          </div>
          <Directions href={directionsUrl} isDark={isDark} />
        </div>
        <div className="flex gap-2 mb-5">
          {venueId && <AppButton disabled={pending || (isAuthenticated && !follow.isSuccess)} onClick={() => void toggleFollow()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm"
            style={{ background: pending || following ? placeholderSurface(isDark) : ACCENT, color: pending || following ? placeholderInk(isDark) : '#0a0a0a' }}>
            {following ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}{pending ? 'Updating…' : isAuthenticated && follow.isPending ? 'Loading follow…' : following ? 'Following' : 'Follow Venue'}
          </AppButton>}
          <AppButton onClick={() => void share()} className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm" style={glassEdge(isDark)}><Share2 className="w-4 h-4" />Share</AppButton>
        </div>
        {follow.isError && <div role="alert" className="text-sm mb-4">Couldn’t load your venue follow. <AppButton disabled={follow.isFetching} onClick={() => void follow.refetch()} className="min-h-9 rounded-2xl px-3" style={glassEdge(isDark)}>Retry follow</AppButton></div>}
        {status}
        {detail && <div className="space-y-6 text-sm">
          {(detail.follower_count != null || detail.capacity != null) && <dl className="flex gap-8">
            {detail.follower_count != null && <div><dt style={{ color: isDark ? '#aaa9ae' : '#6d6976' }}>Followers</dt><dd>{detail.follower_count.toLocaleString()}</dd></div>}
            {detail.capacity != null && <div><dt style={{ color: isDark ? '#aaa9ae' : '#6d6976' }}>Capacity</dt><dd>{detail.capacity.toLocaleString()}</dd></div>}
          </dl>}
          {detail.description && <section><h4 className="font-medium mb-2">About</h4><p className="whitespace-pre-line break-words leading-relaxed">{detail.description}</p></section>}
          {!!detail.amenities?.length && <section><h4 className="font-medium mb-2">Amenities</h4><ul className="flex flex-wrap gap-2">{detail.amenities.map(item => <li key={item} className="px-3 py-2 rounded-xl" style={{ background: placeholderSurface(isDark) }}>{item}</li>)}</ul></section>}
          {!!detail.gallery_urls?.length && <section><h4 className="font-medium mb-2">Photos</h4><div className="flex gap-3 overflow-x-auto">{detail.gallery_urls.map((photo, i) => <img key={photo.original} src={photo.medium || photo.original} alt={`${venueName} photo ${i + 1}`} loading="lazy" className="w-48 h-32 shrink-0 rounded-2xl object-cover" />)}</div></section>}
          {!!Object.keys(detail.social_links || {}).length && <section><h4 className="font-medium mb-2">Socials</h4><div className="flex flex-wrap gap-3">{Object.entries(detail.social_links || {}).filter(([, url]) => /^https?:\/\//i.test(url)).map(([platform, url]) => <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 break-all">{platform.replaceAll('_', ' ')}</a>)}</div></section>}
        </div>}
      </div>
    </motion.div></Dialog.Content>
  </motion.div></Dialog.Overlay></Dialog.Root>;
}
