import { apiFetch } from "@/lib/api";
import { isoToDisplayDate, isoToDisplayTime } from "@/lib/mappers";
import { resaleModule } from "@/lib/resale";
import type { CheckoutAnswers } from "@/types/checkout";
import type {
  ListForResaleResult,
  TicketActionResult,
  UserTicket,
} from "@/types/ticket";

/**
 * Backend wire shape — Ticketing::TicketWalletSerializer (GET /tickets).
 * `qr_token` is only present for the caller's own ACTIVE tickets.
 */
export interface TicketWalletWire {
  id: string;
  status: string;
  unit_number: number;
  admissions_per_unit_snapshot: number;
  credential_mode: string;
  /** Guest payment-refresh projection only (GuestPaymentTicketSerializer) —
   *  authenticated wallet responses omit these. */
  registration_id?: string;
  ticket_view_token?: string;
  ticket_view_url?: string;
  short_url?: string;
  event: { id: string; slug: string; title: string; timezone: string; currency: string };
  product: { id: string; name: string; type: string };
  ticket_type: {
    id: string;
    admissions_per_unit: number;
    entry_validation_mode: string;
    resale_enabled?: boolean;
    resale_price_cap_type?: string | null;
    resale_fixed_cap_minor?: number | null;
    resale_fixed_cap_currency?: string | null;
    resale_percentage_cap_bps?: number | null;
    /** Server-computed cap in minor units (#42 resolved upstream 2026-09-30). */
    resale_price_cap_minor?: number | null;
    resale_cutoff_seconds_before_start?: number;
    max_completed_resales?: number;
  } | null;
  event_dates: {
    id: string;
    name: string | null;
    starts_at: string;
    ends_at: string | null;
    status: string;
    venue: { id: string; name: string; city: string } | null;
  }[];
  admission_slots: { id: string; position: number; assignment_status: string }[];
  credentials: {
    id: string;
    admission_slot_id: string | null;
    entry_limit: number | null;
    status: string;
    issued_at: string;
    lookup_code: string | null;
    qr_token: string | null;
  }[];
  /** Purchased extras projected from the ticket's order (sibling order items
   *  whose type != ticket) — #29 resolved 2026-09-08. */
  add_ons?: {
    id: string;
    name: string;
    type: string;
    quantity: number;
    unit_amount_minor: number;
  }[];
}

/** Map the wallet wire projection onto the UI's UserTicket shape. */
export function mapWalletTicket(w: TicketWalletWire): UserTicket {
  const firstCredential = w.credentials[0];
  const firstDate = w.event_dates[0];
  const tt = w.ticket_type;
  return {
    id: w.id,
    // Guest payment-refresh projection (#14): registration reference + signed
    // public view link (GuestPaymentTicketSerializer, merged 2026-09-10).
    ...(w.registration_id ? { registrationId: w.registration_id } : {}),
    ...(w.ticket_view_token ? { ticketViewToken: w.ticket_view_token } : {}),
    ...(w.ticket_view_url ? { ticketViewUrl: w.ticket_view_url } : {}),
    ...(w.short_url ? { shortUrl: w.short_url } : {}),
    eventId: w.event.id,
    eventSlug: w.event.slug,
    eventName: w.event.title,
    eventDate: isoToDisplayDate(firstDate?.starts_at),
    eventTime: isoToDisplayTime(firstDate?.starts_at),
    eventStartsAt: firstDate?.starts_at,
    venue: firstDate?.venue?.name ?? "",
    ticketType: w.product.name,
    status: w.status,
    // QR secret is delivered only for active tickets — never render a fake code.
    qrCode: w.status === "active" ? (firstCredential?.qr_token ?? "") : "",
    purchased: isoToDisplayDate(firstCredential?.issued_at ?? firstDate?.starts_at),
    // Purchased extras projected onto the wallet ticket (#29 resolved).
    ...(w.add_ons?.length
      ? {
          addOns: w.add_ons.map((a) => ({
            productId: a.id,
            type: (a.type as import("@/types/event").SelectedEventProduct["type"]) ?? "other",
            name: a.name,
            unitPrice: a.unit_amount_minor,
            quantity: a.quantity,
          })),
        }
      : {}),
    // Resale policy arrives on the wallet ticket_type projection (#25 resolved);
    // absent policy renders as not-resaleable rather than assumed open.
    ...(tt && typeof tt.resale_enabled === "boolean"
      ? {
          resalePolicy: {
            enabled: tt.resale_enabled,
            capType: (tt.resale_price_cap_type as 'none' | 'percentage' | 'fixed' | null) ?? null,
            priceCapMinor: tt.resale_price_cap_minor ?? null,
            fixedCapMinor: tt.resale_fixed_cap_minor ?? null,
            fixedCapCurrency: tt.resale_fixed_cap_currency ?? null,
            percentageCapBps: tt.resale_percentage_cap_bps ?? null,
            cutoffSecondsBeforeStart: tt.resale_cutoff_seconds_before_start ?? 0,
            maxCompletedResales: tt.max_completed_resales ?? 0,
          },
        }
      : {}),
  };
}

/**
 * Non-active ticket statuses (`suspended`/`refunded`/`void`) are not usable —
 * the QR is blank and transfer/resale are refused. Map them to a badge label so
 * the UI never presents an invalid ticket as valid. `active`/absent → not inactive.
 */
const TICKET_STATUS_LABEL: Record<string, string> = {
  suspended: 'Suspended',
  refunded: 'Refunded',
  void: 'Void',
};
export function ticketStatusMeta(status?: string): { inactive: boolean; label: string | null } {
  const key = status?.toLowerCase();
  const label = key ? TICKET_STATUS_LABEL[key] ?? null : null;
  return { inactive: !!label, label };
}

export const ticketsService = {
  /**
   * GET /tickets — the real owner wallet (Ticketing::TicketsController#index,
   * TicketWalletSerializer). The wallet renders exactly what the backend says
   * the user owns — an empty list until tickets are actually issued.
   * Unauthenticated callers surface as an empty wallet (401 → the router's
   * `= []` default).
   *
   * The wallet wire carries no artwork, so each distinct event's cover is
   * resolved via the public detail endpoint (one request per event). A missing
   * cover renders absent — never a fabricated local image (ADR-0002).
   */
  async fetchUserTickets(): Promise<UserTicket[]> {
    const { data } = await apiFetch<TicketWalletWire[]>("tickets");
    const wires = (data ?? []).filter((w) => w.product.type === "ticket");
    // Only event tickets belong in "My Tickets". Parking passes are separate
    // credentialable units the backend mints for parking order items — they are
    // already projected as extras on the parent ticket (`add_ons`), so a parking
    // wire must not render as a second event-ticket card.
    const tickets = wires.map(mapWalletTicket);
    const slugs = [...new Set(wires.map((w) => w.event.slug).filter(Boolean))];
    if (slugs.length > 0) {
      const { eventsModule } = await import("@/lib/events");
      const covers = await Promise.allSettled(
        slugs.map(async (slug) => ({ slug, event: await eventsModule.fetchById(slug) })),
      );
      const bySlug = new Map<string, string>();
      covers.forEach((r) => {
        if (r.status === "fulfilled" && r.value.event?.image) bySlug.set(r.value.slug, r.value.event.image);
      });
      tickets.forEach((t, i) => {
        const cover = wires[i]?.event.slug ? bySlug.get(wires[i].event.slug) : undefined;
        if (cover) t.image = cover;
      });
    }
    return tickets;
  },

  async listForResale(
    ticketId: UserTicket["id"],
    price: number,
  ): Promise<ListForResaleResult> {
    return resaleModule.createTicketListingReference(
      ticketId,
      price,
    );
  },
};

export const ticketKeys = {
  userTickets: ["tickets", "user"] as const,
};