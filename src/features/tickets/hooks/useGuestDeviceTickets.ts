import { useCallback, useEffect, useState } from 'react';
import { mapWalletTicket } from '@/lib/tickets';
import { guestWallet } from '@/lib/guest-wallet';
import type { UserTicket } from '@/types';

export interface GuestDeviceTicket extends UserTicket {
  /** Original ticket id — used to remove from the device wallet. */
  ticketId: string;
}

/**
 * Loads the tickets stored on THIS device from a guest (unauthenticated)
 * purchase (BACKEND_GAPS #14). Records are encrypted at rest in IndexedDB,
 * dropped when past their event-end + 30-day retention, and mapped onto the
 * same `UserTicket` shape the wallet uses so the existing QR rendering works.
 */
export function useGuestDeviceTickets(): {
  tickets: GuestDeviceTicket[];
  loading: boolean;
  encrypted: boolean;
  reload: () => void;
  remove: (ticketId: string) => void;
  clearAll: () => void;
} {
  const [tickets, setTickets] = useState<GuestDeviceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [encrypted, setEncrypted] = useState(true);

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const records = await guestWallet.list();
        // Only event tickets render in the tickets list. Parking passes are
        // credentialable units minted for parking order items — they surface as
        // extras on the parent ticket (`add_ons`), never as a second card.
        const eventRecords = records.filter((r) => r.wire.product.type === "ticket");
        const mapped: GuestDeviceTicket[] = [];
        for (const r of eventRecords) {
          try {
            mapped.push({ ...mapWalletTicket(r.wire), ticketId: r.ticketId });
          } catch (mapError) {
            // One bad wire must not blank the whole device list.
            console.warn('[guest-wallet] skipping record that failed to map', r.ticketId, mapError);
          }
        }
        // Enrich covers like the authenticated wallet does: the wire carries no
        // artwork, so resolve each distinct event's cover from the public
        // detail; a miss renders absent, never a fabricated local image.
        const slugs = [...new Set(eventRecords.map((r) => r.wire.event.slug).filter(Boolean))];
        if (slugs.length > 0) {
          const { eventsModule } = await import('@/lib/events');
          const covers = await Promise.allSettled(
            slugs.map(async (slug) => ({ slug, event: await eventsModule.fetchById(slug) })),
          );
          const bySlug = new Map<string, string>();
          covers.forEach((res) => {
            if (res.status === 'fulfilled' && res.value.event?.image) bySlug.set(res.value.slug, res.value.event.image);
          });
          mapped.forEach((t) => {
            const cover = t.eventSlug ? bySlug.get(t.eventSlug) : undefined;
            if (cover) t.image = cover;
          });
        }
        if (!alive) return;
        setTickets(mapped);
        setEncrypted(await guestWallet.isEncrypted());
      } catch {
        if (!alive) return;
        setTickets([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const remove = useCallback((ticketId: string) => {
    setTickets((cur) => cur.filter((t) => t.ticketId !== ticketId));
    void guestWallet.remove(ticketId);
  }, []);

  const clearAll = useCallback(() => {
    setTickets([]);
    void guestWallet.clearAll();
  }, []);

  return { tickets, loading, encrypted, reload, remove, clearAll };
}