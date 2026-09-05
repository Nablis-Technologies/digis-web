import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, Users, Ticket as TicketIcon, Heart, Sparkles, Gift, Crown, Zap } from 'lucide-react';
import { useState, useLayoutEffect, useRef } from 'react';
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

interface EventDetailProps {
  event: Event;
  onBack: () => void;
  onPurchase: () => void;
  onNavigate?: (view: string) => void;
  onRequestAuth?: () => void;
}

export function EventDetail({ event, onBack, onPurchase, onNavigate, onRequestAuth = () => {} }: EventDetailProps) {
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
  const [inviteRsvpConfirmed, setInviteRsvpConfirmed] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const carouselImages = event.images && event.images.length > 0 ? event.images : [event.image];
  const posterRgb = useDominantColor(carouselImages[0]);
  const isRsvp = event.eventType === 'rsvp';
  const isInvite = event.eventType === 'inviteOnly';
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
  const { selectedTicket, basePrice, totalPrice, minPrice, isSoldOut, selectedTicketAccentReadable } = useTicketPricing({ ticketTypes: displayTicketTypes, selectedTicketType, event, isDark });
 const scrollToTicketSelection = () => {
    ticketsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePurchase = () => {
    if (!selectedTicketType) {
      scrollToTicketSelection();
      return;
    }
    setShowCheckout(true);
  };

  const handleGift = () => {
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
          ) : (
          <>
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
          </>
          )}
        </motion.div>
      </div>
      </div>

      {/* Purchase / RSVP Bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 z-[25]">
        <div className="relative px-5 lg:px-8 pb-8 lg:pb-6 pt-3 max-w-5xl lg:max-w-2xl mx-auto">
          {isInvite ? (
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
          ) : isSoldOut ? (
            <SoldOutBar isDark={isDark} onNavigate={onNavigate} />
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




