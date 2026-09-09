/**
 * The primary call-to-action label for an event card/button. Ticketed events
 * buy tickets; RSVP events confirm attendance; invite-only events request
 * access/join. Sold-out state is handled at the call site (it overrides the
 * label before this helper runs).
 */
export function eventActionLabel(eventType: string | undefined): string {
  if (eventType === 'rsvp') return 'RSVP';
  if (eventType === 'inviteOnly') return 'Join';
  return 'Tickets';
}