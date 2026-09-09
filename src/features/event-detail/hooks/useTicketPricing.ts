import type { Event, TicketTier } from "@/types";
import { resolveTierAccent } from "@/lib/tierAccents";

export function useTicketPricing({
  ticketTypes,
  selectedTicketType,
  event,
  isDark,
}: {
  ticketTypes: TicketTier[];
  selectedTicketType: string | null;
  event: Event;
  isDark: boolean;
}) {
  const selectedTicket = selectedTicketType
    ? ticketTypes.find((t) => t.name === selectedTicketType) ?? null
    : null;
  const basePrice = selectedTicket?.priceMinor || 0;
  const totalPrice = basePrice;
  // Math.min() of an empty list is Infinity — guard so a tiers-still-loading
  // (or no-tiers) render never feeds Money.fromMinor a non-integer.
  const minPrice = ticketTypes.length > 0 ? Math.min(...ticketTypes.map((t) => t.priceMinor)) : 0;
  // Sold out is decided by the LIVE tier inventory, not the event-setting
  // config flag. The config `sold_out`/`tickets_left` is a coarse seed snapshot
  // that can lag reality (e.g. sold_out=true on an event whose Regular tier
  // still has stock) — trusting it would lock buyers out of buyable tiers. When
  // tier data is present, it is authoritative: sold out means EVERY tier is at
  // zero. `event.soldOut` only decides the all-sold-out label when no tier
  // projection exists at all.
  const isSoldOut =
    ticketTypes.length === 0
      ? event.soldOut === true
      : ticketTypes.every((t) => t.available === 0);
  const selectedTicketAccent = selectedTicket ? resolveTierAccent(selectedTicket) : null;
  const selectedTicketAccentRgb = selectedTicketAccent?.rgb ?? '96, 165, 250';
  const selectedTicketAccentInk = selectedTicketAccent?.inkRgb ?? '29, 78, 216';
  const selectedTicketAccentReadable = isDark ? selectedTicketAccentRgb : selectedTicketAccentInk;
  return { selectedTicket, basePrice, totalPrice, minPrice, isSoldOut, selectedTicketAccentRgb, selectedTicketAccentInk, selectedTicketAccentReadable };
}
