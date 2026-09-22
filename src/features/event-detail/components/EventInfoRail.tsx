import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import type { Event } from '@/types';
import { InfoStrip } from './InfoCards';
import { LineupSection } from './LineupSection';
import { OrganizerCard, OrganizerInline, resolveOrganizers } from './OrganizerSection';

export function EventInfoRail({
  event,
  isDark,
  isInvite,
  inviteUnlocked,
  posterRgb,
}: {
  event: Event;
  isDark: boolean;
  isInvite: boolean;
  inviteUnlocked: boolean;
  posterRgb?: [number, number, number] | null;
}) {
  const organizers = resolveOrganizers(event);
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="col-span-7 flex flex-col py-2"
    >
      <h1 className="tracking-[-1px] leading-[0.95]"
        style={{
          fontFamily: "'Zalando Sans Expanded', sans-serif",
          color: isDark ? '#fff' : '#1a1a1a',
          fontWeight: 300,
          fontSize: 'clamp(40px, 3.8vw, 60px)',
        }}>
        {event.name}
      </h1>

      {(!isInvite || inviteUnlocked) && (
        <div className="mt-7">
          <InfoStrip
            rgb={posterRgb}
            items={[
              { icon: <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Date', value: event.date },
              { icon: <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Time', value: event.time },
              { icon: <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Venue', value: event.venue },
              { icon: <Users className="w-3.5 h-3.5" strokeWidth={1.75} />, label: 'Age', value: event.ageRestriction || 'Any Age' },
            ]}
          />
        </div>
      )}

      {(!isInvite || inviteUnlocked) && event.description && (
        <div className="mt-5">
          <h2 className="text-[11px] tracking-[2px] uppercase mb-2.5"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: isDark ? 'rgba(214,249,5,0.8)' : 'rgba(0,0,0,0.7)',
              fontWeight: 600,
            }}>
            About
          </h2>
          <p className="text-[13px] leading-relaxed font-light"
            style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
            {event.description}
          </p>
        </div>
      )}

      {/*
        Lineup and hosts ride alongside the poster on desktop instead of stacking
        below the fold — compact here so location and the ticket tiers stay near
        the top of the page. The price and "Get tickets" CTA aren't repeated: the
        docked purchase bar already carries both.
      */}
      {(!isInvite || inviteUnlocked) && (
        <div className="mt-6 flex flex-col gap-5">
          <LineupSection lineup={event.lineup} isDark={isDark} compact />

          {/* A single organizer shows its full profile inline (the same card the
              popup would show); several keep the compact list + sheet. */}
          {organizers.length === 1 ? (
            <OrganizerInline organizer={organizers[0]} isDark={isDark} />
          ) : (
            <OrganizerCard organizers={organizers} isDark={isDark} compact />
          )}
        </div>
      )}
    </motion.div>
  );
}
