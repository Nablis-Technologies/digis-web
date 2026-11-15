import { describe, it, expect } from 'vitest';
import { eventActionLabel } from '@/lib/eventAction';

describe('eventActionLabel', () => {
  it('labels every event as Tickets (offer-driven, no event-level modes)', () => {
    expect(eventActionLabel()).toBe('Tickets');
  });
});
