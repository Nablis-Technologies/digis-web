import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, Users, Ticket as TicketIcon, Heart, Sparkles, Gift, Crown, Zap, Lock, CalendarX } from 'lucide-react';
import { useState, useLayoutEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsModule } from '@/lib/products';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { useTheme } from '@/app/components/ThemeContext';
import { useImageColor } from '@/lib/hooks/useImageColor';
import { GiftTicket } from '@/features/tickets/components/GiftTicketDialog';
import { ShareCard } from '@/features/tickets/components/ShareCard';
import { Checkout } from '@/features/checkout/pages/CheckoutPage';
import { RsvpRegistrationSheet, RsvpSection } from '@/features/event-detail/components/RsvpSection';
import { InviteOnlySection } from '@/features/event-detail/components/InviteOnlySection';
import { GatedTierGate } from '@/features/event-detail/components/GatedTierGate';
import type { Event, RsvpStatus, InviteUnlockState } from '@/types';
import { LineupSection } from '@/features/event-detail/components/LineupSection';
import { OrganizerCard, resolveOrganizers } from '@/features/event-detail/components/OrganizerSection';
import { VenueSection } from '@/features/event-detail/components/VenueMap';
import { YourTicketAccess } from '@/features/event-detail/components/YourTicketAccess';
import { TicketSelector } from '@/features/event-detail/components/TicketSelector';
import { InfoCardsGrid } from '@/features/event-detail/components/InfoCards';
import { PurchaseBar } from '@/features/event-detail/components/PurchaseBar';
import { SoldOutBar } from '@/features/event-detail/components/SoldOutBar';
import { EventHero } from '@/features/event-detail/components/EventHero';
import { ImmersiveBackdrop } from '@/features/event-detail/components/ImmersiveBackdrop';
import { InviteOnlyBar } from '@/features/event-detail/components/InviteOnlyBar';
import { RsvpBar } from '@/features/event-detail/components/RsvpBar';
import { useDominantColor } from '@/features/event-detail/hooks/useDominantColor';
import { useTicketPricing } from '@/features/event-detail/hooks/useTicketPricing';
import { EndedBar } from '@/features/event-detail/components/EndedBar';
import { eventEnded } from '@/lib/eventDates';
import { Money } from '@/lib/money';
import { useResalePurchase } from '@/features/resale/hooks/useResalePurchase';
import type { ResaleListing } from '@/types';
import { Shield } from 'lucide-react';

interface EventDetailProps {
  event: Event;
  onBack: () => void;
  onPurchase: () => void;
  onNavigate?: (view: string) => void;
  onRequestAuth?: () => void;
  /**
   * Resale mode: the same detail page, buying ONE listing instead of a primary
   * ticket. The listing supplies the price; the page keeps every other section.
   */
  resaleListing?: ResaleListing | null;
  /** The viewer owns this listing — show "Your listing", never a Buy CTA. */
  resaleIsOwn?: boolean;
}

export function EventDetail({ event, onBack, onPurchase, onNavigate, onRequestAuth = () => {}, resaleListing = null, resaleIsOwn = false }: EventDetailProps) {
  const [selectedTicketType, setSelectedTicketType] = useState<string | null>(null);
  const ticketsSectionRef = useRef<HTMLDivElement>(null);

  // Always land at the top of the detail page (the hero), regardless of how
  // far the user had scrolled on the discovery feed before tapping the event.
  useLayoutEffect(() => { window.scrollTo(0, 0); }, []);
  const [liked, setLiked] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(null);
  const [rsvpGuests, setRsvpGuests] = useState(0);
  const [showRsvpRegistration, setShowRsvpRegistration] = useState(false);
  const [inviteUnlock, setInviteUnlock] = useState<InviteUnlockState>({ unlocked: false, method: null });
  const [gatedUnlocked, setGatedUnlocked] = useState(false);
  const [inviteRsvpConfirmed, setInviteRsvpConfirmed] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const carouselImages = event.images && event.images.length > 0 ? event.images : [event.image];
  const posterRgb = useDominantColor(carouselImages[0]);
  const isRsvp = event.eventType === 'rsvp';
  const isInvite = event.eventType === 'inviteOnly';
  // BACKEND_GAPS #34 mitigation: the backend still quotes/orders for past
  // events, so the frontend disables the buy entry once every date has ended.
  const ended = useMemo(() => eventEnded(event), [event]);
  // Resale mode reuses this whole page; only the purchase command differs.
  const resalePurchase = useResalePurchase();
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
        isInvite={isInvite}
        inviteUnlocked={inviteUnlock.unlocked}
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
      <div className={`px-5 lg:px-8 max-w-7xl mx-auto ${isInvite && !inviteUnlock.unlocked ? 'pt-8' : 'mt-6 lg:mt-12'}`}>
        {/* Info cards — mobile/tablet only (desktop renders inside hero rail) */}
        {(!isInvite || inviteUnlock.unlocked) && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="mb-8 lg:hidden">
          <InfoCardsGrid
            rgb={posterRgb}
            items={[
              { icon: <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Date', value: event.date },
              { icon: <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Time', value: event.time },
              { icon: <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Venue', value: event.venue },
              { icon: <Users className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Age', value: event.ageRestriction || 'Any Age' },
            ]}
          />
        </motion.div>
        )}

        {/* Tickets the user already holds for this event — renders nothing if none */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }} className="mb-10 empty:mb-0">
          <YourTicketAccess eventId={eventId} eventName={event.name} onNavigate={onNavigate} />
        </motion.div>

        {/* About — mobile/tablet only (desktop renders inside hero rail) */}
        {(!isInvite || inviteUnlock.unlocked) && (
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
            Experience an unforgettable evening of music, culture, and community. 
            Join us for a celebration that brings together the best of Ethiopian 
            entertainment with world-class production.
          </p>
        </motion.div>
        )}

        {/* Lineup — mobile/tablet only (desktop renders inside hero rail) */}
        {(!isInvite || inviteUnlock.unlocked) && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.305 }} className="mb-10 lg:hidden">
          <LineupSection lineup={event.lineup} isDark={isDark} />
        </motion.div>
        )}

        {/* Organizer(s) — mobile/tablet only (desktop renders inside hero rail) */}
        {(!isInvite || inviteUnlock.unlocked) && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.31 }} className="mb-10 lg:hidden">
          <OrganizerCard organizers={resolveOrganizers(event)} isDark={isDark} compact />
        </motion.div>
        )}

        {/* Venue */}
        {(!isInvite || inviteUnlock.unlocked) && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="mb-10">
          <VenueSection venue={event.venue} isDark={isDark} />
        </motion.div>
        )}

        {/* Ticket Selection / RSVP */}
        <motion.div ref={ticketsSectionRef} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-6 lg:mb-32 scroll-mt-6">
          {isInvite ? (
            <InviteOnlySection
              event={event}
              unlock={inviteUnlock}
              onUnlockChange={setInviteUnlock}
              gatedTicketTypeIds={gatedTicketTypeIds}
              rsvpConfirmed={inviteRsvpConfirmed}
              onConfirmRsvp={() => setInviteRsvpConfirmed(true)}
            />
          ) : isRsvp ? (
            <RsvpSection
              event={event}
              status={rsvpStatus}
              onStatusChange={setRsvpStatus}
              guests={rsvpGuests}
              onGuestsChange={setRsvpGuests}
              onRegister={() => setShowRsvpRegistration(true)}
              onRequestAuth={onRequestAuth}
            />
          ) : ended ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-3xl p-6 text-center"
              style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              }}
            >
              <CalendarX className="w-5 h-5 mx-auto mb-3" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }} strokeWidth={1.8} />
              <p className="text-[16px] font-light mb-1" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                Event ended
              </p>
              <p className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }}>
                Tickets are no longer available — this event has finished.
              </p>
            </motion.div>
          ) : resaleListing ? (
          /* Resale: one specific listing instead of the primary ticket tiers. */
          <div className="rounded-2xl p-4"
            style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }}>
            <p className="text-[10px] tracking-[1.8px] uppercase mb-2.5"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontWeight: 700 }}>
              Resale listing
            </p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] truncate"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                {resaleListing.ticketType || 'Ticket'}
              </span>
              <span className="text-[16px] flex-shrink-0"
                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                {Money.fromMinor(resaleListing.askingPriceMinor, resaleListing.currency).format()}
              </span>
            </div>
            {typeof resaleListing.originalPriceMinor === 'number' && (
              <p className="mt-1 text-[11px]"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                Face value {Money.fromMinor(resaleListing.originalPriceMinor, resaleListing.currency).format()}
              </p>
            )}
            <div className="mt-3 pt-3 flex items-start gap-2"
              style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}>
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: isDark ? '#d6f905' : '#6d28d9' }} strokeWidth={1.6} />
              <p className="text-[11px] leading-[1.5]"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                Your ticket is transferred to you the moment the payment is confirmed.
              </p>
            </div>
          </div>
          ) : (
          <GatedTierGate
            gatedTicketTypeIds={gatedTicketTypeIds}
            unlocked={!hasGatedTiers || gatedUnlocked}
            onUnlocked={() => setGatedUnlocked(true)}
          >
          <TicketSelector
            event={event}
            ticketTypes={displayTicketTypes}
            selectedTicketType={selectedTicketType}
            onSelectTicketType={setSelectedTicketType}
            isSoldOut={isSoldOut}
            isDark={isDark}
            loading={productsQuery.isPending}
            loadError={productsQuery.isError}
            onRetry={() => void productsQuery.refetch()}
          />
          </GatedTierGate>
          )}
        </motion.div>
      </div>
      </div>

      {/* Purchase / RSVP Bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 z-[25]">
        <div className="relative px-5 lg:px-8 pb-8 lg:pb-6 pt-3 max-w-5xl lg:max-w-2xl mx-auto">
          {resaleListing ? (
            resalePurchase.pendingOrder ? (
              <div className="w-full rounded-2xl flex items-center justify-center gap-2.5 py-4"
                style={{
                  background: isDark ? 'rgba(214,249,5,0.08)' : 'rgba(214,249,5,0.1)',
                  border: `1px solid ${isDark ? 'rgba(214,249,5,0.2)' : 'rgba(180,210,0,0.3)'}`,
                }}>
                <motion.div className="w-4 h-4 rounded-full"
                  style={{ border: '2px solid rgba(214,249,5,0.3)', borderTopColor: '#d6f905' }}
                  animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
                <span className="text-[13px]"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: isDark ? '#d6f905' : '#5a6b00' }}>
                  Confirming your payment…
                </span>
              </div>
            ) : resaleIsOwn ? (
              <div className="w-full rounded-2xl flex items-center justify-center py-4"
                style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <span className="text-[13px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
                  Your listing
                </span>
              </div>
            ) : (
              <>
                {resalePurchase.error && (
                  <p className="text-[11px] mb-3 leading-[1.5]"
                    style={{ fontFamily: "'Inter', sans-serif", color: '#e5484d' }}>
                    {resalePurchase.error}
                  </p>
                )}
                <div style={resalePurchase.purchasing ? { opacity: 0.7, pointerEvents: 'none' } : undefined}>
                  <PurchaseBar
                    isDark={isDark}
                    selectedTicket={null}
                    selectedTicketType={resaleListing.ticketType || null}
                    selectedTicketAccentReadable="255,255,255"
                    totalPrice={resaleListing.askingPriceMinor}
                    minPrice={resaleListing.askingPriceMinor}
                    onGift={() => {}}
                    hideGift
                    label={resalePurchase.purchasing ? 'Starting payment…' : 'Buy resale ticket'}
                    onPurchase={() => void resalePurchase.buy(resaleListing)}
                  />
                </div>
              </>
            )
          ) : isInvite ? (
            <InviteOnlyBar
              event={event}
              inviteUnlock={inviteUnlock}
              inviteRsvpConfirmed={inviteRsvpConfirmed}
              isDark={isDark}
              onCheckout={() => setShowCheckout(true)}
              onConfirmRsvp={() => setInviteRsvpConfirmed(true)}
              onPurchase={onPurchase}
            />
          ) : isRsvp ? (
            <RsvpBar
              rsvpStatus={rsvpStatus}
              isDark={isDark}
              onShare={() => setShowShare(true)}
              onRegister={() => setShowRsvpRegistration(true)}
              onPurchase={onPurchase}
            />
          ) : ended ? (
            <EndedBar isDark={isDark} />
          ) : isSoldOut ? (
            <SoldOutBar isDark={isDark} onNavigate={onNavigate} />
          ) : hasGatedTiers && !gatedUnlocked ? (
            <div className="flex items-center justify-center gap-1.5 py-4">
              <Lock className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }} strokeWidth={2} />
              <span className="text-[11px] tracking-[1px] uppercase"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
                Unlock with access code above
              </span>
            </div>
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

      {/* RSVP registration — keeps the event page fast while collecting only what this organizer requires. */}
      <AnimatePresence>
        {showRsvpRegistration && (
          <RsvpRegistrationSheet
            event={event}
            guests={rsvpGuests}
            ticketTypeId={displayTicketTypes[0]?.ticketTypeId ?? ''}
            onClose={() => setShowRsvpRegistration(false)}
            onRequestAuth={onRequestAuth}
            onComplete={() => {
              setRsvpStatus('going');
              setShowRsvpRegistration(false);
            }}
          />
        )}
      </AnimatePresence>

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
            accessCode={isInvite && inviteUnlock.method === 'code' ? inviteUnlock.code : undefined}
            basePrice={basePrice}
            eventId={eventId}
            products={displayProducts}
            includedProductIds={selectedTicket?.includedProductIds}
            answerEditWindowHours={event.answerEditWindowHours}
            seatMap={event.seatMap}
            requiredSeatCount={selectedTicket?.seats ?? (selectedTicket?.isCouples ? 2 : undefined)}
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
// don't send Access-Control-Allow-Origin (i.ibb.co, i.postimg.cc, …).




