import { EndedBar } from '@/features/event-detail/components/EndedBar';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, Users, Gift } from 'lucide-react';
import { useState, useLayoutEffect, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { AudienceProof } from '@/lib/audience';
import { productsModule } from '@/lib/products';
import { eventsModule } from '@/lib/events';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { useTheme } from '@/app/components/ThemeContext';
import { useImageColor } from '@/lib/hooks/useImageColor';
import { GiftTicket } from '@/features/tickets/components/GiftTicketDialog';
import { ShareCard } from '@/features/tickets/components/ShareCard';
import { Checkout } from '@/features/checkout/pages/CheckoutPage';
import { GatedTierGate } from '@/features/event-detail/components/GatedTierGate';
import { WaitlistSheet } from '@/features/event-detail/components/WaitlistSheet';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { AppButton } from '@/components/primitives/AppButton';
import type { Event, TicketTier } from '@/types';
import { ArtistProfileSheet, LineupSection } from '@/features/event-detail/components/LineupSection';
import { resolveFestivalSchedule, guestsForDay, type ScheduleArtist } from '@/lib/festival';
import { resolveSeries } from '@/lib/recurring';
import {
  FestivalDayBar,
  TicketsUnavailableNotice,
  SectionHeading,
  DayLineup,
  FestivalTicketSelector,
  SessionGuests,
  SessionCarousel,
  SessionWaitlist,
} from '@/features/event-detail/components/ScheduleSections';
import { OrganizerCard, OrganizerInline, resolveOrganizers } from '@/features/event-detail/components/OrganizerSection';
import { VenueSection } from '@/features/event-detail/components/VenueMap';
import { YourTicketAccess } from '@/features/event-detail/components/YourTicketAccess';
import { TicketSelector } from '@/features/event-detail/components/TicketSelector';
import { InfoCardsGrid } from '@/features/event-detail/components/InfoCards';
import { PurchaseBar, purchaseBarGlass } from '@/features/event-detail/components/PurchaseBar';
import { SoldOutBar } from '@/features/event-detail/components/SoldOutBar';
import { EventHero } from '@/features/event-detail/components/EventHero';
import { ImmersiveBackdrop } from '@/features/event-detail/components/ImmersiveBackdrop';
import { useDominantColor } from '@/features/event-detail/hooks/useDominantColor';
import { useTicketPricing } from '@/features/event-detail/hooks/useTicketPricing';
import { eventEnded } from '@/lib/eventDates';

interface EventDetailProps {
  event: Event;
  onBack: () => void;
  onPurchase: () => void;
  onNavigate?: (view: string) => void;
}

export function EventDetail({ event, onBack, onPurchase, onNavigate }: EventDetailProps) {
  const [selectedTicketType, setSelectedTicketType] = useState<string | null>(null);
  const ticketsSectionRef = useRef<HTMLDivElement>(null);
  const venueSectionRef = useRef<HTMLDivElement>(null);

  // Always land at the top of the detail page (the hero), regardless of how
  // far the user had scrolled on the discovery feed before tapping the event.
  useLayoutEffect(() => { window.scrollTo(0, 0); }, []);
  const [liked, setLiked] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [stickyGateTarget, setStickyGateTarget] = useState<HTMLDivElement | null>(null);
  const [gatedUnlocked, setGatedUnlocked] = useState(false);
  // Audience proof (access code or invitation token) captured when a gated
  // ticket offer is unlocked — carried into checkout as audience_proof.
  const [audienceProof, setAudienceProof] = useState<AudienceProof>();
  // Invitation links carry the token in the event URL (the backend emails them);
  // a token unlocks the gated offers without the buyer typing anything.
  const [searchParams] = useSearchParams();
  const invitationToken = useMemo(
    () => searchParams.get('invitation') ?? searchParams.get('invitation_token') ?? undefined,
    [searchParams],
  );
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [waitlistOffer, setWaitlistOffer] = useState<TicketTier | null>(null);
  const carouselImages = event.images && event.images.length > 0 ? event.images : [event.image];
  const posterRgb = useDominantColor(carouselImages[0]);
  const { isDark } = useTheme();
  const { rgb } = useImageColor(event.image);

  // Use the canonical event id so downstream services (checkout, ticket issuance,
  // promos) can resolve the event. Falls back to a name slug for legacy data.
  const eventId = event.id || (event.name ? event.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '');

  // Live products (tickets + extras) from GET /public/events/:slug/products.
  // No mock fallback: when the backend serves no tiers/extras, the UI renders
  // nothing purchasable instead of inventing tiers (backend owns all money).
  const productsQuery = useQuery({
    queryKey: productsModule.keys.forEvent(event.slug ?? ''),
    queryFn: () => productsModule.fetchForEvent(event.slug!),
    enabled: !!event.slug,
  });
  const live = productsQuery.data;
  const displayTicketTypes = live?.tiers ?? [];
  const displayProducts = live?.extras ?? [];

  // Full schedule (#70) + ended probe (#72).
  //
  // The detail payload carries only a bounded preview (≤7 upcoming sessions), so
  // a multi-session / recurring event fetches the complete list from the
  // dedicated schedule endpoint for the session rail + festival view. The same
  // endpoint also answers "is this event ended?": the detail payload omits
  // `event_lifecycle` (only the list serves it — BACKEND_GAPS #72) and its
  // preview is upcoming-only, so a fully past event shows an empty preview. In
  // that case we probe with `from` = epoch — any date at all means nothing is
  // purchasable (the empty preview already proved there is no upcoming session)
  // → ended; zero dates means the event is simply unscheduled.
  const previewEmpty = (event.eventDates?.length ?? 0) === 0;
  const wantsSchedule =
    !!event.slug &&
    ((event.eventDates?.length ?? 0) > 1 || event.isRecurring === true || previewEmpty);
  const scheduleQuery = useQuery({
    queryKey: [...eventsModule.keys.dates(event.slug ?? ''), previewEmpty ? 'probe' : 'full'] as const,
    queryFn: () =>
      eventsModule.fetchDates(
        event.slug!,
        previewEmpty ? { from: '1970-01-01T00:00:00Z', perPage: 1 } : {},
      ),
    enabled: wantsSchedule,
  });
  const scheduleEvent: Event = useMemo(
    () =>
      scheduleQuery.data && scheduleQuery.data.length > 0
        ? { ...event, eventDates: scheduleQuery.data }
        : event,
    [event, scheduleQuery.data],
  );
  // G-44: prefer the server-evaluated lifecycle; the local past-date gate (#34
  // mitigation, backed by the schedule probe above) covers the detail payload,
  // which does not carry `event_lifecycle` (#72).
  const ended = useMemo(
    () => event.eventLifecycle === 'ended' || eventEnded(scheduleEvent),
    [event.eventLifecycle, scheduleEvent],
  );
  // Tier-level audience gate (BACKEND_GAPS #20): a live ticketed event whose
  // tiers are NOT public still lets buyers reach the ticket selector + checkout
  // without proving access. When any tier is gated, the selector is hidden
  // behind a code/invitation gate; the code is validated server-side against
  // every gated tier, then the normal ticketed flow is revealed.
  const gatedTicketTypeIds = displayTicketTypes
    .filter((t) => t.audience && t.audience !== 'public')
    .map((t) => t.ticketTypeId)
    .filter((id): id is string => !!id);
  const hasGatedTiers = gatedTicketTypeIds.length > 0;
  // Whether any gated offer accepts a code. Invitation-only events have no code
  // that could work, so the gate shows the invitation-link path instead of a
  // code box that can never succeed.
  const acceptsCode = displayTicketTypes.some(
    (t) => t.audience === 'access_code' || t.audience === 'code_or_invitation',
  );
  // The backend gates per ticket type, so on a mixed event the public tiers stay
  // selectable while the gated ones wait behind the unlock panel.
  const publicTicketTypes = displayTicketTypes.filter((t) => !t.audience || t.audience === 'public');
  const hasPublicTiers = publicTicketTypes.length > 0;
  const acceptedTierIds = new Set(audienceProof?.authorizedTicketTypeIds ?? []);
  const visibleTicketTypes = displayTicketTypes.filter(tier => !tier.audience || tier.audience === 'public' ||
    (gatedUnlocked && !!tier.ticketTypeId && acceptedTierIds.has(tier.ticketTypeId)));
  // Recurring series (#68): one event, many dated sessions. `resolveSeries`
  // returns null until the backend serves a public series signal, so a plain
  // multi-date event still falls through to the festival path below.
  const [pickedSessionId, setPickedSessionId] = useState<string>('');
  const series = useMemo(
    () => resolveSeries(scheduleEvent, visibleTicketTypes, pickedSessionId || undefined),
    [scheduleEvent, visibleTicketTypes, pickedSessionId],
  );
  const sessionId = series?.selected?.id ?? '';
  const festivalSchedule = useMemo(() => {
    // A recurring series owns its dates — never also render it as a festival.
    if (series) return null;
    return resolveFestivalSchedule(scheduleEvent, visibleTicketTypes);
  }, [series, scheduleEvent, visibleTicketTypes]);
  const [scheduleArtist, setScheduleArtist] = useState<ScheduleArtist | null>(null);
  const [festivalDayId, setFestivalDayId] = useState<string>('all');
  useEffect(() => {
    if (festivalSchedule && !festivalSchedule.showPass && festivalDayId === 'all') {
      const first = festivalSchedule.days[0]?.id;
      if (first) setFestivalDayId(first);
    }
  }, [festivalSchedule, festivalDayId]);
  // Guests for the picked day (everyone across the festival on "All days").
  const dayGuests = useMemo(
    () => (festivalSchedule ? guestsForDay(festivalSchedule, festivalDayId) : []),
    [festivalSchedule, festivalDayId],
  );
  const waitlistTiers = event.slug
    ? visibleTicketTypes.filter(tier => tier.id && tier.available === 0 && tier.waitlistEnabled)
    : [];
  const ticketsUnavailable = event.ticketAvailability === 'unavailable' || event.ticketAvailability === 'no_eligible_dates';
  const showTicketsUnavailable = ticketsUnavailable && visibleTicketTypes.every(tier => tier.available === 0);
  const { selectedTicket, basePrice, totalPrice, minPrice, isSoldOut, selectedTicketAccentReadable } = useTicketPricing({ ticketTypes: visibleTicketTypes, selectedTicketType, event, isDark });
 const scrollToTicketSelection = () => {
    ticketsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const [checkoutGiftMode, setCheckoutGiftMode] = useState(false);

  const handlePurchase = () => {
    if (ended) return;
    if (!selectedTicketType) {
      const availableTiers = visibleTicketTypes.filter(tier => tier.available > 0);
      const soleTier = availableTiers.length === 1 ? availableTiers[0] : undefined;
      if (!soleTier || soleTier.priceMinor !== 0 || soleTier.approvalMode !== 'automatic' || soleTier.audience !== 'public') {
        scrollToTicketSelection();
        return;
      }
      setSelectedTicketType(soleTier.name);
    }
    setCheckoutGiftMode(false);
    setShowCheckout(true);
  };

  const handleGift = () => {
    if (ended) return;
    if (!selectedTicketType) {
      scrollToTicketSelection();
      return;
    }
    setCheckoutGiftMode(true);
    setShowCheckout(true);
  };

  return (
    <div className="relative min-h-screen pb-28 lg:pb-10">
      {/* Immersive artwork-driven backdrop — the event's color world */}
      <ImmersiveBackdrop image={carouselImages[0]} posterRgb={posterRgb} isDark={isDark} />

      <div className="relative" style={{ zIndex: 1 }}>
      <EventHero
        event={event}
        isDark={isDark}
        liked={liked}
        onLikedChange={setLiked}
        onBack={onBack}
        onShare={() => setShowShare(true)}
        carouselImages={carouselImages}
        carouselIdx={carouselIdx}
        onCarouselIdxChange={setCarouselIdx}
        rgb={rgb}
        posterRgb={posterRgb}
      />

      {/* Content */}
      <div className="px-5 lg:px-8 max-w-7xl mx-auto mt-6 lg:mt-12">
        {/* Info cards — mobile/tablet only (desktop renders inside hero rail) */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="mb-5 lg:hidden">
          <InfoCardsGrid
            rgb={posterRgb}
            items={[
              { icon: <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Date', value: event.date },
              { icon: <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Time', value: event.time },
              { icon: <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Venue', value: event.venue, onClick: () => venueSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
              ...(event.ageRestriction?.trim() ? [{ icon: <Users className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Age', value: event.ageRestriction }] : []),
            ]}
          />
        </motion.div>

        {/* Tickets the user already holds for this event — renders nothing if none */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }} className="mb-10 empty:mb-0">
          <YourTicketAccess eventId={eventId} eventName={event.name} onNavigate={onNavigate} />
        </motion.div>

        {/* Recurring: pick a session, then see its tickets and guests. */}
        {series && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="mb-8">
            <SessionCarousel
              days={series.days}
              selected={series.selected}
              value={sessionId}
              onChange={setPickedSessionId}
              reminderLabel={series.reminderLabel}
              calendar={series.calendar}
            />
          </motion.div>
        )}

        {festivalSchedule && !ended && (
          <>
            <SectionHeading>Choose a date</SectionHeading>
            <div className="sticky top-3 md:top-[84px] z-20 mb-6">
              <FestivalDayBar
                days={festivalSchedule.days}
                showPass={festivalSchedule.showPass}
                passSpanLabel={festivalSchedule.passSpanLabel}
                value={festivalDayId}
                onPick={setFestivalDayId}
                stuck
              />
            </div>
          </>
        )}

        {/* Ticket Selection */}
        <motion.div ref={ticketsSectionRef} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-8 scroll-mt-32">
          {ended ? null : (
          showTicketsUnavailable && !hasGatedTiers ? (
            null
          ) : (
          <GatedTierGate
            gatedTicketTypeIds={gatedTicketTypeIds}
            unlocked={!hasGatedTiers || gatedTicketTypeIds.every(id => acceptedTierIds.has(id))}
            invitationToken={invitationToken}
            hasPublicTiers={visibleTicketTypes.length > 0}
            acceptsCode={acceptsCode}
            stickyTarget={!hasPublicTiers ? stickyGateTarget : null}
            onUnlocked={(proof) => { setSelectedTicketType(null); setGatedUnlocked(true); setAudienceProof(proof); }}
          >
          {festivalSchedule ? (
            <FestivalTicketSelector
              dayId={festivalDayId}
              onDayChange={setFestivalDayId}
              selectedTicketType={selectedTicketType}
              onSelectTicketType={setSelectedTicketType}
              onJoinWaitlist={event.slug ? setWaitlistOffer : undefined}
              underway={festivalSchedule.underway}
              cancelledCount={festivalSchedule.cancelledCount}
              showPasses={festivalDayId === 'all' && festivalSchedule.showPass}
              title={
                festivalDayId === 'all'
                  ? (festivalSchedule.days.length === 1 ? '1 day pass' : `All ${festivalSchedule.days.length} days`)
                  : (festivalSchedule.lineupDays.find((d) => d.id === festivalDayId)?.monDay
                      ? `Day ${festivalSchedule.days.findIndex((d) => d.id === festivalDayId) + 1} · ${festivalSchedule.lineupDays.find((d) => d.id === festivalDayId)?.monDay}`
                      : 'Day pass')
              }
              passFromLabel={festivalSchedule.passFromLabel}
              tiers={festivalSchedule.tiersByDay[festivalDayId] ?? []}
              passUpsell={
                festivalDayId !== 'all' && festivalSchedule.showPass
                  ? {
                      label: `all ${festivalSchedule.days.length} days for ${festivalSchedule.passFromLabel?.replace('From ', '') || ''}`,
                    }
                  : undefined
              }
            />
          ) : series?.selectedSoldOut ? (
            <SessionWaitlist
              dateLabel={series.selected?.dateLabel ?? ''}
              onPickNext={() => {
                const next = series.days.find((d) => !d.soldOut && d.primarySessionId !== sessionId);
                if (next) setPickedSessionId(next.primarySessionId);
              }}
            />
          ) : (
            <TicketSelector
              event={event}
              ticketTypes={visibleTicketTypes}
              selectedTicketType={selectedTicketType}
              onSelectTicketType={setSelectedTicketType}
              isSoldOut={isSoldOut}
              isDark={isDark}
              loading={productsQuery.isPending}
              loadError={productsQuery.isError}
              onRetry={() => void productsQuery.refetch()}
              onJoinWaitlist={event.slug ? setWaitlistOffer : undefined}
            />
          )}
          </GatedTierGate>
          )
          )}
        </motion.div>

        {series && series.selectedGuests.length > 0 && (
          <div className="mb-10">
            <SessionGuests sessionId={sessionId} guests={series.selectedGuests} embedded onOpenArtist={setScheduleArtist} />
          </div>
        )}

        {festivalSchedule && dayGuests.length > 0 && (
          <div className="mb-10">
            <SessionGuests sessionId={festivalDayId} guests={dayGuests} embedded onOpenArtist={setScheduleArtist} />
          </div>
        )}

        {/* About — mobile/tablet only (desktop renders inside hero rail) */}
        {event.description && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-10 lg:hidden">
          <h2 className="text-[13px] tracking-[2px] uppercase mb-4"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: isDark ? 'rgba(214,249,5,0.8)' : 'rgba(0,0,0,0.7)',
            }}>
            About
          </h2>
          <p className="text-[14px] leading-relaxed font-light"
            style={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)' }}>
            {event.description}
          </p>
        </motion.div>
        )}

        {/* Lineup / Schedule */}
        {festivalSchedule ? (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.305 }} className="mb-10">
            <SectionHeading>Lineup</SectionHeading>
            <DayLineup
              days={festivalDayId === 'all' ? festivalSchedule.lineupDays : festivalSchedule.lineupDays.filter((d) => d.id === festivalDayId)}
              dayId={festivalDayId}
              onPickDay={setFestivalDayId}
              agenda={festivalSchedule.agendaDays}
              onOpenArtist={setScheduleArtist}
            />
          </motion.div>
        ) : !series && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.305 }} className="mb-10 lg:hidden">
            <LineupSection lineup={event.lineup} isDark={isDark} />
          </motion.div>
        )}

        {/* Organizer(s) — mobile/tablet only (desktop renders inside hero rail) */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.31 }} className="mb-10 lg:hidden">
          {(() => {
            const organizers = resolveOrganizers(event);
            return organizers.length === 1
              ? <OrganizerInline organizer={organizers[0]} isDark={isDark} />
              : <OrganizerCard organizers={organizers} isDark={isDark} compact />;
          })()}
        </motion.div>

        {/* Venue */}
        <motion.div ref={venueSectionRef} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="mb-10 scroll-mt-6">
          <VenueSection key={event.venueId || event.venue} venue={event.venue} venueId={event.venueId} isDark={isDark} />
        </motion.div>


      </div>
      </div>

      {scheduleArtist && (
        <ArtistProfileSheet artist={scheduleArtist} onClose={() => setScheduleArtist(null)} isDark={isDark} />
      )}

      {/* Purchase Bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 z-[25]">
        <div className="relative px-5 lg:px-8 pb-8 lg:pb-6 pt-3 max-w-5xl lg:max-w-2xl mx-auto">
          {ended ? <EndedBar isDark={isDark} onBrowse={onNavigate ? () => onNavigate('discover') : undefined} /> : hasGatedTiers && !hasPublicTiers && !gatedTicketTypeIds.every(id => acceptedTierIds.has(id)) ? (
            <div ref={setStickyGateTarget} />
          ) : hasGatedTiers && !gatedUnlocked && !hasPublicTiers ? null : showTicketsUnavailable && !hasGatedTiers ? (
            <div className="relative overflow-hidden rounded-2xl px-4 py-1" style={purchaseBarGlass(isDark)}>
              <GlassReflection isDark={isDark} />
              <div className="relative">
                <TicketsUnavailableNotice />
              </div>
            </div>
          ) : isSoldOut ? (
            <SoldOutBar isDark={isDark} onNavigate={onNavigate}
              waitlistActionLabel={waitlistTiers.length === 1 ? 'Join waitlist' : 'View tiers'}
              onJoinWaitlist={waitlistTiers.length === 1
                ? () => setWaitlistOffer(waitlistTiers[0])
                : waitlistTiers.length > 1 ? scrollToTicketSelection : undefined} />
          ) : (
            <PurchaseBar
              isDark={isDark}
              selectedTicket={selectedTicket}
              selectedTicketType={selectedTicketType}
              selectedTicketAccentReadable={selectedTicketAccentReadable}
              totalPrice={totalPrice}
              minPrice={minPrice}
              rsvpOnly={visibleTicketTypes.some(tier => tier.available > 0) && visibleTicketTypes.every(tier => tier.available === 0 || (tier.priceMinor === 0 && tier.approvalMode === 'automatic'))}
              onGift={handleGift}
              onPurchase={handlePurchase}
            />
          )}
        </div>
      </motion.div>

      {/* Gift Ticket */}
      <AnimatePresence>
        {showGift && (
          <GiftTicket
            ticket={{
              eventName: event.name,
              eventDate: event.date,
              venue: event.venue,
              ticketType: selectedTicketType,
              image: event.image,
            }}
            extras={displayProducts.filter((product) => product.type !== 'ticket').map(({ id, name, description, priceMinor }) => ({ id, name, description, priceMinor }))}
            onClose={() => setShowGift(false)}
            onSend={() => setShowGift(false)}
          />
        )}
      </AnimatePresence>

      {/* Offer waitlist (sold-out, waitlist-enabled) */}
      <AnimatePresence>
        {waitlistOffer && event.slug && (
          <WaitlistSheet slug={event.slug} offer={waitlistOffer} dates={scheduleEvent.eventDates ?? []} accessCode={audienceProof?.accessCode} invitationToken={audienceProof?.invitationToken} onClose={() => setWaitlistOffer(null)} />
        )}
      </AnimatePresence>

      {/* Checkout */}
      <AnimatePresence>
        {showCheckout && (
          <Checkout
            event={{
              name: event.name,
              date: event.date,
              time: event.time,
              venue: event.venue,
              image: event.image,
              category: event.category,
            }}
            eventSlug={event.slug}
            ticketType={selectedTicketType}
            ticketLevel={selectedTicket?.level || ''}
            ticketProductId={selectedTicket?.id}
            ticketTypeId={selectedTicket?.ticketTypeId}
            accessCode={audienceProof?.accessCode}
            invitationToken={audienceProof?.invitationToken}
            basePrice={basePrice}
            eventId={eventId}
            products={displayProducts}
            includedProductIds={selectedTicket?.includedProductIds}
            answerEditWindowHours={event.answerEditWindowHours}
            seatMap={event.seatMap}
            requiredSeatCount={
              selectedTicket && (selectedTicket.admissionsPerUnit ?? 1) > 1
                ? selectedTicket.admissionsPerUnit
                : undefined
            }
            dateSelection={selectedTicket?.dateSelection}
            eventDates={event.eventDates?.filter((d) => Date.parse(d.startsAt) > Date.now())}
            initialGiftMode={checkoutGiftMode}
            onClose={() => setShowCheckout(false)}
            onComplete={() => { setShowCheckout(false); onPurchase(); }}
          />
        )}
      </AnimatePresence>

      {/* Share Card */}
      <AnimatePresence>
        {showShare && (
          <ShareCard
            event={{
              name: event.name,
              slug: event.slug,
              date: event.date,
              time: event.time,
              venue: event.venue,
              image: event.image,
              category: event.category,
              price: selectedTicket?.priceMinor,
            }}
            ticketType={selectedTicketType}
            ticketLevel={selectedTicket?.level || ''}
            onClose={() => setShowShare(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Route through a CORS-enabled proxy so pixels can be read from hosts that
// don't send Access-Control-Allow-Origin (i.ibb.co, i.postimg.cc, —).




