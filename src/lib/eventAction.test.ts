import { describe, it, expect } from 'vitest';
import { eventActionLabel } from '@/lib/eventAction';

describe('eventActionLabel', () => {
  it('labels ticketed events as Tickets', () => {
    expect(eventActionLabel('ticketed')).toBe('Tickets');
    expect(eventActionLabel(undefined)).toBe('Tickets');
  });

  it('labels rsvp events as RSVP', () => {
    expect(eventActionLabel('rsvp')).toBe('RSVP');
  });

  it('labels invite-only events as Join (no Tickets button)', () => {
    expect(eventActionLabel('inviteOnly')).toBe('Join');
  });
});