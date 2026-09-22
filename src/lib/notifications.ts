import { useSyncExternalStore } from 'react';
import { apiFetch } from '@/lib/api';
import { formatRelativeTime } from '@/lib/mappers';
import { Money } from '@/lib/money';
import type { AppNotification, NotificationType } from '@/types/notification';

/**
 * Notification deep module. The local store backs the signed-out/offline UX —
 * which has no inbox, so guests see nothing. Authenticated reads come from the
 * live inbox (`GET /notifications`). Never seed fabricated notifications: a
 * signed-out user must not see invented activity.
 */

const INITIAL: AppNotification[] = [];

const STORAGE_KEY = 'digis.notifications.v2';

function load(): AppNotification[] {
  if (typeof window === 'undefined') return INITIAL;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw) as AppNotification[];
    if (!Array.isArray(parsed)) return INITIAL;
    return parsed;
  } catch {
    return INITIAL;
  }
}

let notifications: AppNotification[] = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    /* storage full / unavailable — keep in-memory only */
  }
}

function emit() {
  // New array identity so useSyncExternalStore detects the change.
  notifications = [...notifications];
  persist();
  listeners.forEach((l) => l());
}

const genId = () => `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export const notificationsStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return notifications;
  },
  /** Prepend a fresh notification; returns its id. */
  push(input: Omit<AppNotification, 'id' | 'time' | 'unread'> & { time?: string; unread?: boolean }) {
    const notif: AppNotification = {
      id: genId(),
      time: input.time ?? 'just now',
      unread: input.unread ?? true,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    };
    notifications = [notif, ...notifications];
    emit();
    return notif.id;
  },
  markRead(id: string) {
    notifications = notifications.map((n) => (n.id === id ? { ...n, unread: false } : n));
    emit();
  },
  markAllRead() {
    notifications = notifications.map((n) => ({ ...n, unread: false }));
    emit();
  },
  /** Replace the whole list (live inbox hydration). No-op when identical, so
   *  re-renders don't loop: React Query returns a fresh array identity per
   *  fetch, and an effect keyed on it would otherwise re-emit forever. */
  replace(next: AppNotification[]) {
    const same =
      notifications.length === next.length &&
      notifications.every((n, i) => {
        const m = next[i];
        return m && n.id === m.id && n.unread === m.unread && n.title === m.title && n.body === m.body;
      });
    if (same) return;
    notifications = next;
    emit();
  },
};

/** React hook for reading the live notification list. */
export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(notificationsStore.subscribe, notificationsStore.getSnapshot, notificationsStore.getSnapshot);
}

/* ─── Live inbox (GET /notifications) ─── */

/** Backend wire shape (Messaging::NotificationSerializer). */
export interface NotificationWire {
  id: string;
  notification_type: string;
  category: string;
  data: Record<string, unknown>;
  read_at: string | null;
  available_at: string;
  created_at: string;
  deliveries?: unknown[];
}

const TYPE_FROM_BACKEND: Record<string, NotificationType> = {
  ticket_issued: 'ticket',
  credential_replaced: 'ticket',
  payment_succeeded: 'ticket',
  payment_failed: 'ticket',
  refund_succeeded: 'ticket',
  refund_failed: 'ticket',
  transfer_received: 'transfer',
  waitlist_offer_created: 'event',
  waitlist_offer_expired: 'event',
  registration_rejected: 'event',
  schedule_changed: 'event',
  consent_reminder: 'event',
};

function titleFor(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'ticket_issued': return 'Ticket ready';
    case 'credential_replaced': return 'Ticket updated';
    case 'payment_succeeded': return 'Payment successful';
    case 'payment_failed': return 'Payment failed';
    case 'refund_succeeded': return 'Refund issued';
    case 'refund_failed': return 'Refund failed';
    case 'transfer_received': return 'Ticket received';
    case 'waitlist_offer_created': return 'A waitlist spot opened';
    case 'waitlist_offer_expired': return 'Waitlist offer expired';
    case 'registration_rejected': return 'Registration not approved';
    case 'schedule_changed': return 'Event schedule changed';
    case 'consent_reminder': return 'Action needed';
    default: return 'Update';
  }
}

function bodyFor(type: string, data: Record<string, unknown>): string {
  const event = typeof data.event_title === 'string' ? data.event_title : undefined;
  const label = typeof data.ticket_label === 'string' ? data.ticket_label : undefined;
  const amount = typeof data.amount_minor === 'number' ? data.amount_minor : undefined;
  if (type === 'ticket_issued' || type === 'credential_replaced') {
    return [event, label].filter(Boolean).join(' · ');
  }
  if (type === 'payment_succeeded' && amount != null) {
    return `${event ?? 'Payment'} · ${Money.fromMinor(amount, 'ETB').format()}`;
  }
  if (type === 'payment_failed') return event ?? 'Your payment could not be processed.';
  if (type === 'transfer_received') return event ?? 'A ticket was transferred to you.';
  if (type === 'schedule_changed') return event ?? 'The event time has changed.';
  if (type === 'consent_reminder') return 'Confirm your details before the event.';
  return event ?? '';
}

/** Map the backend wire onto the UI shape. Missing data renders as absent, never fabricated. */
export function mapNotification(w: NotificationWire): AppNotification {
  return {
    id: w.id,
    type: TYPE_FROM_BACKEND[w.notification_type] ?? 'event',
    title: titleFor(w.notification_type, w.data),
    body: bodyFor(w.notification_type, w.data),
    time: formatRelativeTime(w.created_at),
    unread: !w.read_at,
  };
}

/** Mirror GET /notifications (authenticated inbox). */
export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data } = await apiFetch<NotificationWire[]>('notifications');
  return (Array.isArray(data) ? data : []).map(mapNotification);
}

/**
 * Persist a notification's read state (POST /notifications/:id/read). Without
 * this the local mark reverts on the next inbox refetch (staleTime 0).
 */
export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`notifications/${id}/read`, { method: 'POST' });
}

/* ─── Notification preferences (GET/PATCH /notification_preferences) ─── */

/** Backend delivery channels (Messaging::NotificationDelivery::CHANNELS). */
export type NotificationChannel = 'in_app' | 'email' | 'sms';

/**
 * Backend notification categories (Messaging::Notification::CATEGORIES). The
 * preference API stores one row per category × channel, so a channel toggle
 * writes every category on that channel.
 */
export const PREFERENCE_CATEGORIES = ['transactional', 'security', 'credential', 'legal'] as const;

/**
 * Wire shape (Messaging::NotificationPreferenceSerializer). `id` is null for an
 * unsaved default: the backend returns the full category × channel matrix and
 * represents a missing row as `enabled: true`.
 */
export interface NotificationPreferenceWire {
  id: string | null;
  category: string;
  channel: string;
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** Per-channel on/off state derived from the preference matrix. */
export type ChannelPreferences = Record<NotificationChannel, boolean>;

/** GET /notification_preferences — the effective matrix (missing rows = enabled). */
export async function fetchNotificationPreferences(): Promise<NotificationPreferenceWire[]> {
  const { data } = await apiFetch<NotificationPreferenceWire[]>('notification_preferences');
  return Array.isArray(data) ? data : [];
}

/**
 * Collapse the category × channel matrix to one flag per channel. A channel is
 * "on" only when every category on it is enabled, so the toggle shows the
 * conservative state; flipping it writes every category on that channel.
 */
export function channelPreferences(matrix: NotificationPreferenceWire[]): ChannelPreferences {
  const enabled = (channel: NotificationChannel) =>
    PREFERENCE_CATEGORIES.every((category) => {
      const row = matrix.find((p) => p.category === category && p.channel === channel);
      return row ? row.enabled : true;
    });
  return { in_app: enabled('in_app'), email: enabled('email'), sms: enabled('sms') };
}

/**
 * PATCH /notification_preferences — set every category on one channel. The
 * required Idempotency-Key is injected by `apiFetch`.
 */
export async function updateChannelPreference(
  channel: NotificationChannel,
  enabled: boolean,
): Promise<NotificationPreferenceWire[]> {
  const { data } = await apiFetch<NotificationPreferenceWire[]>('notification_preferences', {
    method: 'PATCH',
    body: { preferences: PREFERENCE_CATEGORIES.map((category) => ({ category, channel, enabled })) },
  });
  return Array.isArray(data) ? data : [];
}
