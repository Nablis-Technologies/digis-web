import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, Users, Gift, Lock, CalendarX, ArrowRight } from 'lucide-react';
import { useState, useLayoutEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { AudienceProof } from '@/lib/audience';
import { productsModule } from '@/lib/products';
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
import { LineupSection } from '@/features/event-detail/components/LineupSection';
import { resolveFestivalSchedule } from '@/lib/festival';
import {
  FestivalDayBar,
  DayLineup,
  FestivalTicketSelector,
} from '@/features/event-detail/components/ScheduleSections';
import { OrganizerCard, OrganizerInline, resolveOrganizers } from '@/features/event-detail/components/OrganizerSection';
import { VenueSection } from '@/features/event-detail/components/VenueMap';
import { YourTicketAccess } from '@/features/event-detail/components/YourTicketAccess';
import { TicketSelector } from '@/features/event-detail/components/TicketSelector';
import { InfoCardsGrid } from '@/features/event-detail/components/InfoCards';
import { PurchaseBar } from '@/features/event-detail/components/PurchaseBar';
import { SoldOutBar } from '@/features/event-detail/components/SoldOutBar';
import { EventHero } from '@/features/event-detail/components/EventHero';
import { ImmersiveBackdrop } from '@/features/event-detail/components/ImmersiveBackdrop';
import { useDominantColor } from '@/features/event-detail/hooks/useDominantColor';
import { useTicketPricing } from '@/features/event-detail/hooks/useTicketPricing';
import { EndedBar } from '@/features/event-detail/components/EndedBar';
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
  // G-44: the server now evaluates lifecycle — prefer `ended` from it. Fall
  // back to the local past-date gate (#34 mitigation) when the backend omits it.
  const ended = useMemo(() => event.eventLifecycle === 'ended' || eventEnded(event), [event]);
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
  const visibleTicketTypes = hasGatedTiers && !gatedUnlocked ? publicTicketTypes : displayTicketTypes;
  const festivalSchedule = useMemo(() => {
    return resolveFestivalSchedule(event, displayTicketTypes);
  }, [event, displayTicketTypes]);
  const [festivalDayId, setFestivalDayId] = useState<string>('all');
  const { selectedTicket, basePrice, totalPrice, minPrice, isSoldOut, selectedTicketAccentReadable } = useTicketPricing({ ticketTypes: displayTicketTypes, selectedTicketType, event, isDark });
 const scrollToTicketSelection = () => {
    ticketsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePurchase = () => {
    if (ended) return;
    if (!selectedTicketType) {
      scrollToTicketSelection();
      return;
    }
    setShowCheckout(true);
  };

  const handleGift = () => {
    if (ended) return;
    if (!selectedTicketType) {
      scrollToTicketSelection();
      return;
    }
    setShowGift(true);
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
          className="mb-8 lg:hidden">
          <InfoCardsGrid
            rgb={posterRgb}
            items={[
              { icon: <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Date', value: event.date },
              { icon: <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Time', value: event.time },
              { icon: <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Venue', value: event.venue, onClick: () => venueSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
              { icon: <Users className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Age', value: event.ageRestriction || 'Any Age' },
            ]}
          />
        </motion.div>

        {/* Tickets the user already holds for this event — renders nothing if none */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }} className="mb-10 empty:mb-0">
          <YourTicketAccess eventId={eventId} eventName={event.name} onNavigate={onNavigate} />
        </motion.div>

        {/* Festival Day Bar — pinned day track for multi-day events */}
        {festivalSchedule && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="mb-8">
            <FestivalDayBar
              days={festivalSchedule.days}
              showPass={festivalSchedule.showPass}
              passSpanLabel={festivalSchedule.passSpanLabel}
              value={festivalDayId}
              onPick={setFestivalDayId}
            />
          </motion.div>
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
            <DayLineup
              days={festivalDayId === 'all' ? festivalSchedule.lineupDays : festivalSchedule.lineupDays.filter((d) => d.id === festivalDayId)}
              dayId={festivalDayId}
              onPickDay={setFestivalDayId}
              agenda={festivalSchedule.agendaDays}
            />
          </motion.div>
        ) : (
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
          <VenueSection venue={event.venue} isDark={isDark} />
        </motion.div>

        {/* Ticket Selection */}
        <motion.div ref={ticketsSectionRef} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-6 lg:mb-32 scroll-mt-6">
          {ended ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="relative rounded-3xl overflow-hidden p-6 text-center"
              style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              }}
            >
              <GlassReflection isDark={isDark} />
              <CalendarX className="relative z-10 w-5 h-5 mx-auto mb-3" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }} strokeWidth={1.8} />
              <p className="relative z-10 text-[16px] font-light mb-1" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                Event ended
              </p>
              <p className="relative z-10 text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }}>
                Tickets are no longer available — this event has finished.
              </p>
            </motion.div>
          ) : (
          <GatedTierGate
            gatedTicketTypeIds={gatedTicketTypeIds}
            unlocked={!hasGatedTiers || gatedUnlocked}
            invitationToken={invitationToken}
            hasPublicTiers={hasPublicTiers}
            acceptsCode={acceptsCode}
            onUnlocked={(proof) => { setGatedUnlocked(true); setAudienceProof(proof); }}
          >
          {festivalSchedule ? (
            <FestivalTicketSelector
              dayId={festivalDayId}
              onDayChange={setFestivalDayId}
              selectedTicketType={selectedTicketType}
              onSelectTicketType={setSelectedTicketType}
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
              doorsLabel={festivalDayId !== 'all' ? 'Doors 6 PM' : undefined}
              tiers={festivalSchedule.tiersByDay[festivalDayId] ?? []}
              passUpsell={
                festivalDayId !== 'all' && festivalSchedule.showPass
                  ? {
                      label: `all ${festivalSchedule.days.length} days for ${festivalSchedule.passFromLabel?.replace('From ', '') || ''}`,
                    }
                  : undefined
              }
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
              onJoinWaitlist={(tier) => setWaitlistOffer(tier)}
            />
          )}
          </GatedTierGate>
          )}
        </motion.div>
      </div>
      </div>

      {/* Purchase Bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 z-[25]">
        <div className="relative px-5 lg:px-8 pb-8 lg:pb-6 pt-3 max-w-5xl lg:max-w-2xl mx-auto">
          {ended ? (
            <EndedBar isDark={isDark} />
          ) : isSoldOut ? (
            <SoldOutBar isDark={isDark} onNavigate={onNavigate} />
          ) : hasGatedTiers && !gatedUnlocked && !hasPublicTiers ? (
            <AppButton
              whileTap={{ scale: 0.98 }}
              onClick={scrollToTicketSelection}
              className="relative w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 overflow-hidden cursor-pointer"
              style={{ background: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)' }}>
              <GlassReflection isDark={isDark} />
              <Lock className="relative z-10 w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }} strokeWidth={2} />
              <span className="relative z-10 text-[12px] tracking-[0.3px]"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)' }}>
                  {acceptsCode ? 'Unlock tickets with your access code' : 'Invite-only — open your invitation'}
              </span>
              <ArrowRight className="relative z-10 w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }} strokeWidth={2} />
            </AppButton>
          ) : (
            <PurchaseBar
              isDark={isDark}
              selectedTicket={selectedTicket}
              selectedTicketType={selectedTicketType}
              selectedTicketAccentReadable={selectedTicketAccentReadable}
              totalPrice={totalPrice}
              minPrice={minPrice}
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
          <WaitlistSheet slug={event.slug} offer={waitlistOffer} accessCode={audienceProof?.accessCode} invitationToken={audienceProof?.invitationToken} onClose={() => setWaitlistOffer(null)} />
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




