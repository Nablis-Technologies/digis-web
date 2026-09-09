import { describe, it, expect } from 'vitest';
import { mapNotification, type NotificationWire } from '@/lib/notifications';

function wire(overrides: Partial<NotificationWire> = {}): NotificationWire {
  return {
    id: 'n-1',
    notification_type: 'ticket_issued',
    category: 'credential',
    data: { event_title: 'On & On', ticket_label: 'Early Bird' },
    read_at: null,
    available_at: '2026-09-08T10:00:00.000Z',
    created_at: '2026-09-08T10:00:00.000Z',
    deliveries: [],
    ...overrides,
  };
}

describe('mapNotification (#7 live inbox)', () => {
  it('maps a ticket_issued wire onto the UI shape', () => {
    const n = mapNotification(wire());
    expect(n.id).toBe('n-1');
    expect(n.type).toBe('ticket');
    expect(n.title).toBe('Ticket ready');
    expect(n.body).toBe('On & On · Early Bird');
    expect(n.unread).toBe(true);
    expect(n.time).not.toBe('');
  });

  it('read_at present renders unread false', () => {
    expect(mapNotification(wire({ read_at: '2026-09-08T11:00:00.000Z' })).unread).toBe(false);
  });

  it('maps unknown notification types to the generic event bucket, never crashes', () => {
    const n = mapNotification(wire({ notification_type: 'brand_new_thing', data: {} }));
    expect(n.type).toBe('event');
    expect(n.title).toBe('Update');
    expect(n.body).toBe('');
  });

  it('formats amount_minor as ETB in payment_succeeded', () => {
    const n = mapNotification(wire({ notification_type: 'payment_succeeded', data: { amount_minor: 102500 } }));
    expect(n.body).toContain('1,025');
    expect(n.body).toContain('ETB');
  });
});