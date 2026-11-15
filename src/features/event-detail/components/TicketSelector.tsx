import type { Event, TicketTier } from '@/types';
import { TicketTypeCard } from './TicketTypeCard';
import { Spinner, LoadErrorCard } from '@/components/loading';
import type { GlassReflectionSettings } from '@/lib/ui/glass';

export function TicketSelector({
  event,
  ticketTypes,
  selectedTicketType,
  onSelectTicketType,
  isSoldOut,
  isDark,
  loading = false,
  loadError = false,
  onRetry,
  onJoinWaitlist,
  reflectionSettings,
}: {
  event: Event;
  ticketTypes: TicketTier[];
  selectedTicketType: string | null;
  onSelectTicketType: (ticketType: string) => void;
  isSoldOut: boolean;
  isDark: boolean;
  /** Products not yet resolved — tier-shaped skeletons, not an empty list. */
  loading?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  /** Join the offer-scoped waitlist for a sold-out, waitlist-enabled offer. */
  onJoinWaitlist?: (tier: TicketTier) => void;
  reflectionSettings?: GlassReflectionSettings;
}) {
  // An offer that accepts a waitlist keeps the section actionable even when
  // every offer is sold out — do not dim/freeze the grid in that case.
  const anyWaitlist = !!onJoinWaitlist && ticketTypes.some((t) => t.id && t.available === 0 && t.waitlistEnabled === true);
  const blocked = isSoldOut && !anyWaitlist;
  if (loadError) {
    return <LoadErrorCard message="Tickets for this event could not be loaded." onRetry={onRetry ?? (() => {})} />;
  }

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent" />
          <h2 className="text-[12px] tracking-[3px] uppercase" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? 'rgba(244,255,128,0.6)' : 'rgba(0,0,0,0.55)' }}>
            Select Your Ticket
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent" />
        </div>
        <Spinner label="Loading tickets…" />
      </>
    );
  }
  return (
    <>
      {/* Section header */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent" />
        <h2 className="text-[12px] tracking-[3px] uppercase" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? 'rgba(244,255,128,0.6)' : 'rgba(0,0,0,0.55)' }}>
          {blocked ? 'Sold Out' : isSoldOut && anyWaitlist ? 'Ticket Waitlist' : 'Select Your Ticket'}
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent" />
      </div>

      {/* Availability indicator */}
      {!isSoldOut && event.ticketsLeft != null && (
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
              style={{ background: '#d6f905' }} />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full"
              style={{ background: '#d6f905' }} />
          </span>
          <span className="text-[10px] tracking-[1.5px] uppercase"
            style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
            {event.ticketsLeft} tickets left
          </span>
        </div>
      )}

      {/* Ticket cards — dimmed + non-interactive when sold out */}
      <div className={`space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:gap-5 transition-opacity duration-300 ${blocked ? 'opacity-40 pointer-events-none select-none' : ''}`}>
        {ticketTypes.map((type, index) => (
          <TicketTypeCard key={type.name} type={type} selected={selectedTicketType === type.name}
            onSelect={() => !isSoldOut && onSelectTicketType(type.name)}
            onJoinWaitlist={type.id && onJoinWaitlist ? () => onJoinWaitlist(type) : undefined}
            index={index} reflectionSettings={reflectionSettings} />
        ))}
      </div>

      {!blocked && (
        <p className="text-center text-[11px] mt-6 tracking-[0.5px]"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)' }}>
          By purchasing you agree to the Terms of Service.
        </p>
      )}
    </>
  );
}
