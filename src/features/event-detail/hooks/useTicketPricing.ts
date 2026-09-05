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
  // Sold out = the backend says so. `tickets_left` lives in the event-setting
  // config (BACKEND_GAPS #1: not serialized yet) and tier availability comes
  // from the products endpoint — never inferred from a missing value.
  const isSoldOut =
    event.soldOut === true ||
    (ticketTypes.length > 0 && ticketTypes.every((t) => t.available === 0));
  const selectedTicketAccent = selectedTicket ? resolveTierAccent(selectedTicket) : null;
  const selectedTicketAccentRgb = selectedTicketAccent?.rgb ?? '96, 165, 250';
  const selectedTicketAccentInk = selectedTicketAccent?.inkRgb ?? '29, 78, 216';
  const selectedTicketAccentReadable = isDark ? selectedTicketAccentRgb : selectedTicketAccentInk;
  return { selectedTicket, basePrice, totalPrice, minPrice, isSoldOut, selectedTicketAccentRgb, selectedTicketAccentInk, selectedTicketAccentReadable };
}
