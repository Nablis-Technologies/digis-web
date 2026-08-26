import { EventCard } from '@/components/EventCard';
import type { Event } from '@/types';

export function ResaleEventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  return <EventCard event={event} onClick={onClick} />;
}
