import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
import {
  mapNotification, channelPreferences, fetchNotificationPreferences, updateChannelPreference,
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