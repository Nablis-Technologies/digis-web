/**
 * The primary call-to-action label for an event card/button.
 *
 * Events are offer-driven now (the backend removed the event-level
 * `rsvp`/`inviteOnly` mode), so every card buys/selects admission. Sold-out and
 * ended states override the label at the call site.
 */
export function eventActionLabel(): string {
  return 'Tickets';
}
