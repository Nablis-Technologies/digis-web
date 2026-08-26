import { useMemo } from 'react';
import type { UserTicket } from '@/types';

export function useTicketGroups(tickets: UserTicket[]) {
  return useMemo(() => {
    const now = Date.now();
    const upcoming: UserTicket[] = [];
    const past: UserTicket[] = [];
    tickets.forEach((ticket) => {
      const parsed = Date.parse(ticket.eventDate);
      if (!isNaN(parsed) && parsed < now - 24 * 60 * 60 * 1000) past.push(ticket);
      else upcoming.push(ticket);
    });
    return { upcoming, past };
  }, [tickets]);
}
