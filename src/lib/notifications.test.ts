import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
import {
  mapNotification, channelPreferences, fetchNotificationPreferences, updateChannelPreference, notificationsStore,
  type NotificationWire, type NotificationPreferenceWire,
} from '@/lib/notifications';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  randomUuid: () => '00000000-0000-4000-8000-000000000000',
}));

const mockedApiFetch = vi.mocked(apiFetch);

beforeEach(() => {
  mockedApiFetch.mockReset();
});

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

  it('never renders a blank body for a known type whose data lacks event context', () => {
    expect(mapNotification(wire({ notification_type: 'credential_replaced', data: {} })).body).toBe('Your ticket was updated.');
    expect(mapNotification(wire({ notification_type: 'refund_succeeded', data: {} })).body).toBe('Your refund has been issued.');
    expect(mapNotification(wire({ notification_type: 'waitlist_offer_created', data: {} })).body).toContain('spot opened');
    expect(mapNotification(wire({ notification_type: 'payment_succeeded', data: {} })).body).toBe('Your payment was successful.');
  });
});

describe('mapNotification — incoming transfer accept action (#61)', () => {
  const incoming = (data: Record<string, unknown>) =>
    wire({ notification_type: 'transfer_incoming', data });

  it('exposes the accept transfer id from the wire', () => {
    const n = mapNotification(incoming({ transfer_id: 'tr-9', event_title: 'On & On', ticket_label: 'Early Bird' }));
    expect(n.type).toBe('transfer');
    expect(n.title).toBe('You received a ticket');
    expect(n.acceptTransferId).toBe('tr-9');
  });

  it('omits the action and falls back to the wallet when the wire carries no usable transfer_id', () => {
    const noAction = mapNotification(incoming({ event_title: 'On & On' }));
    expect(noAction.acceptTransferId).toBeUndefined();
    expect(noAction.link).toBe('/tickets');
    expect(mapNotification(incoming({ transfer_id: 42 })).acceptTransferId).toBeUndefined();
  });

  it('only transfer_incoming carries an accept action', () => {
    expect(mapNotification(wire({ data: { transfer_id: 'tr-9' } })).acceptTransferId).toBeUndefined();
  });

  it('names the action instead of deep-linking when it can be run in place', () => {
    const n = mapNotification(incoming({ transfer_id: 'tr-9', event_title: 'On & On' }));
    expect(n.link).toBeUndefined();
    expect(n.body).toBe('On & On · Accept it to add it to your wallet.');
  });

  it('keeps the legacy fallback copy when no action is offered', () => {
    expect(mapNotification(incoming({ event_title: 'On & On' })).body).toBe('On & On · Accept it in Tickets.');
    expect(mapNotification(incoming({})).body).toBe('A ticket is waiting — accept it in Tickets.');
  });
});

describe('notificationsStore.clear (no cross-session leak)', () => {
  it('empties the inbox so a signed-out session reads nothing', () => {
    notificationsStore.push({ type: 'ticket', title: 'x', body: 'y' });
    expect(notificationsStore.getSnapshot().length).toBeGreaterThan(0);
    notificationsStore.clear();
    expect(notificationsStore.getSnapshot()).toEqual([]);
  });
});

/* ─── Notification preferences (#7 wiring) ─── */

const CATEGORIES = ['transactional', 'security', 'credential', 'legal'];
const CHANNELS = ['in_app', 'email', 'sms'];

function pref(category: string, channel: string, enabled = true): NotificationPreferenceWire {
  return { id: null, category, channel, enabled, created_at: null, updated_at: null };
}
const MATRIX: NotificationPreferenceWire[] = CATEGORIES.flatMap((category) =>
  CHANNELS.map((channel) => pref(category, channel)),
);

describe('notification preferences (#7)', () => {
  it('treats a missing row as enabled (the backend default)', () => {
    expect(channelPreferences([])).toEqual({ in_app: true, email: true, sms: true });
  });

  it('a channel is on only when every category on it is enabled', () => {
    const matrix = MATRIX.map((p) =>
      p.channel === 'email' && p.category === 'legal' ? { ...p, enabled: false } : p,
    );
    expect(channelPreferences(matrix)).toEqual({ in_app: true, email: false, sms: true });
  });

  it('fetchNotificationPreferences unwraps the matrix, tolerating a missing body', async () => {
    mockedApiFetch.mockResolvedValueOnce({ data: MATRIX } as never);
    await expect(fetchNotificationPreferences()).resolves.toHaveLength(12);
    expect(mockedApiFetch).toHaveBeenCalledWith('notification_preferences');

    mockedApiFetch.mockResolvedValueOnce({ data: undefined } as never);
    await expect(fetchNotificationPreferences()).resolves.toEqual([]);
  });

  it('updateChannelPreference PATCHes every category on the channel', async () => {
    mockedApiFetch.mockResolvedValueOnce({ data: MATRIX } as never);
    await updateChannelPreference('email', false);
    expect(mockedApiFetch).toHaveBeenCalledWith('notification_preferences', {
      method: 'PATCH',
      body: {
        preferences: CATEGORIES.map((category) => ({ category, channel: 'email', enabled: false })),
      },
    });
  });
});