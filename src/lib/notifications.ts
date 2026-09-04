import { useSyncExternalStore } from 'react';
import type { AppNotification } from '@/types/notification';

/**
 * A tiny in-memory notification store with subscribe semantics so any component
 * (the top-bar bell, a badge, etc.) stays in sync without prop-drilling. In
 * production this would be backed by a realtime channel; the shape stays the same.
 */

/** Shared with transfer.service — a seeded, claimable demo transfer. */
export const DEMO_TRANSFER_TOKEN = 'demo-coffee-transfer';

const INITIAL: AppNotification[] = [
  { id: 'demo-transfer', type: 'transfer', title: 'You received a ticket', body: 'Selam sent you a ticket to Ethiopian Coffee Culture Night. Tap to view it and get your QR code.', time: 'just now', unread: true, link: `/claim/${DEMO_TRANSFER_TOKEN}` },
  { id: 'n1', type: 'ticket', title: 'Ticket confirmed', body: 'Your VIP ticket for Rophnan Live is ready.', time: '2m ago', unread: true },
  { id: 'n2', type: 'price', title: 'Price drop · -15%', body: 'A resale ticket for Ethio Jazz Night just dropped.', time: '4m ago', unread: true },
  { id: 'n3', type: 'event', title: 'Starts in 2 hours', body: 'Mereb Cultural Festival begins at 7:00 PM.', time: '1h ago', unread: false },
  { id: 'n4', type: 'promo', title: 'EARLYBIRD25 unlocked', body: 'Save 25% on your next 3 events.', time: 'Yesterday', unread: false },
];

const STORAGE_KEY = 'digis.notifications.v2';

function load(): AppNotification[] {
  if (typeof window === 'undefined') return INITIAL;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw) as AppNotification[];
    if (!Array.isArray(parsed)) return INITIAL;
    // Always keep the seeded demo transfer available for the walkthrough.
    if (!parsed.some((n) => n.id === 'demo-transfer')) {
      return [INITIAL[0], ...parsed];
    }
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
};

/** React hook for reading the live notification list. */
export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(notificationsStore.subscribe, notificationsStore.getSnapshot, notificationsStore.getSnapshot);
}
